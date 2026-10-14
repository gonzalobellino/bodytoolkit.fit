import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Keypoint, CameraOrientationResult } from '../utils/poseAnalysis';
import { findKeypoint, computeCameraOrientation } from '../utils/poseAnalysis';
import { remapKeypoints } from '../utils/poseKeypoints';

interface DetectedKeypoint {
  x: number;
  y: number;
  z?: number;
  score?: number;
  name?: string;
  visibility?: number;
}

interface PoseDetector {
  estimatePoses: (
    video: HTMLVideoElement,
    options: { flipHorizontal: boolean; staticImageMode: boolean }
  ) => Promise<Pose[]>;
  dispose: () => void;
}

interface Pose {
  keypoints?: DetectedKeypoint[];
  keypoints3D?: DetectedKeypoint[];
}

interface UsePoseDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  enabled?: boolean;
  modelType?: 'movenet' | 'blazepose';
  threshold?: number; // Minimum confidence score for keypoints
  tuning?: {
    scoreThreshold?: number;
    minPoseScore?: number;
    enableSmoothing?: boolean;
    blazeposeModelType?: 'lite' | 'full' | 'heavy';
    smoothingAlpha?: number;
    maxJumpRatio?: number;
    maxOutOfBoundsRatio?: number;
  };
}

export function usePoseDetection({
  videoRef,
  canvasRef,
  enabled = true,
  modelType = 'movenet',
  threshold = 0.25,
  tuning,
}: UsePoseDetectionOptions) {
  // TODO: Tune threshold, smoothing, and stability filters per sport/context.
  // TODO: Add sport presets (golf/swim/grappling) that adjust the parameters below.
  // TODO: Verify sport-specific analysis features default to BlazePose where extra keypoints help.
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPose, setCurrentPose] = useState<Pose | null>(null);
  const [keypoints, setKeypoints] = useState<Keypoint[]>([]);
  // Raw BlazePose 3D keypoints in normalized body-space coords (X/Y/Z in [-1,1]).
  // These are intentionally kept separate from the 2D pixel keypoints used by the
  // rest of the pipeline and are used for view-agnostic orientation detection.
  const [keypoints3D, setKeypoints3D] = useState<(Keypoint & { z?: number })[]>([]);
  const [cameraOrientation, setCameraOrientation] = useState<CameraOrientationResult>({
    orientation: 'unknown',
    confidence: 0,
  });
  const [debugInfo, setDebugInfo] = useState<{
    source: 'keypoints' | 'keypoints3D' | 'none';
    rawCount: number;
    rawMinX: number;
    rawMaxX: number;
    rawMinY: number;
    rawMaxY: number;
    qualityScore?: number;
    missingCriticalKeypoints?: string[];
  }>({
    source: 'none',
    rawCount: 0,
    rawMinX: 0,
    rawMaxX: 0,
    rawMinY: 0,
    rawMaxY: 0,
    qualityScore: 0,
    missingCriticalKeypoints: [],
  });

  const detectorRef = useRef<PoseDetector | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previousKeypointsRef = useRef<Keypoint[] | null>(null);
  // Video time (before the async estimatePoses call) when previousKeypointsRef was last set.
  // Used to detect large time jumps (seeks, new video) and invalidate stale smoothing data.
  const previousKeypointsTimeRef = useRef<number>(-1);
  // Shared flag to prevent concurrent detections across closure lifetimes (BUG-02).
  const isDetectingRef = useRef(false);

  // Calculate thresholds and parameters first (before callbacks that use them)
  const baseThreshold = tuning?.scoreThreshold ?? threshold;
  // For BlazePose, enforce a minimum floor of 0.05 (the model reports lower scores overall)
  // but respect the user's configured threshold — do not silently cap it.
  const effectiveThreshold = modelType === 'blazepose'
    ? Math.max(0.05, baseThreshold)
    : baseThreshold;
  const minPoseScore = tuning?.minPoseScore ?? 0.05;
  const smoothingEnabled = tuning?.enableSmoothing ?? true;
  const blazeposeModelType = tuning?.blazeposeModelType ?? 'full';
  const smoothingAlpha = tuning?.smoothingAlpha ?? 0.5;
  const maxJumpRatio = tuning?.maxJumpRatio ?? 0.25;
  const maxOutOfBoundsRatio = tuning?.maxOutOfBoundsRatio ?? 0.2;

  // Validate pose completeness (now effectiveThreshold is defined)
  const validatePoseCompleteness = useCallback((keypoints: Keypoint[]): {
    isValid: boolean;
    missingKeypoints: string[];
    confidence: number;
  } => {
    const requiredKeypoints = ['nose', 'left_hip', 'right_hip', 'left_ankle', 'right_ankle'];
    const missing: string[] = [];
    
    requiredKeypoints.forEach(name => {
      const kp = findKeypoint(keypoints, name);
      if (!kp || kp.score < effectiveThreshold) {
        missing.push(name);
      }
    });

    const isValid = missing.length === 0;
    const detectedCount = requiredKeypoints.length - missing.length;
    const confidence = detectedCount / requiredKeypoints.length;

    return {
      isValid,
      missingKeypoints: missing,
      confidence,
    };
  }, [effectiveThreshold]);

  // capturedTime: video.currentTime snapshotted BEFORE the async estimatePoses call.
  // Passing it here (instead of reading video.currentTime inside) ensures we compare
  // the time the frame was captured, not where the video is now after the await resolves.
  const smoothKeypoints = useCallback((rawKeypoints: Keypoint[], video: HTMLVideoElement | null, capturedTime?: number) => {
    if (!smoothingEnabled) {
      previousKeypointsRef.current = rawKeypoints;
      previousKeypointsTimeRef.current = capturedTime ?? video?.currentTime ?? -1;
      return rawKeypoints;
    }
    const maxDimension = video ? Math.max(video.videoWidth, video.videoHeight) : 0;
    const maxJump = maxDimension ? maxDimension * maxJumpRatio : 0;

    // If the video time jumped more than 0.1 s from when previous keypoints were captured
    // (seek, new video loaded, etc.), invalidate the smoothing prior even if an in-flight
    // detection already wrote stale data back after the seek reset.
    const videoTime = capturedTime ?? video?.currentTime ?? -1;
    if (previousKeypointsTimeRef.current >= 0 && Math.abs(videoTime - previousKeypointsTimeRef.current) > 0.1) {
      previousKeypointsRef.current = null;
      previousKeypointsTimeRef.current = -1;
    }

    const prev = previousKeypointsRef.current;

    const smoothed = rawKeypoints.map((kp, index) => {
      if (kp.score < effectiveThreshold) {
        return { ...kp, score: 0 };
      }

      const previous = prev?.[index];
      if (!previous || previous.score < effectiveThreshold) {
        return kp;
      }

      if (maxJump) {
        const distance = Math.hypot(kp.x - previous.x, kp.y - previous.y);
        if (distance > maxJump) {
          return { ...previous, score: previous.score };
        }
      }

      return {
        ...kp,
        x: previous.x + (kp.x - previous.x) * smoothingAlpha,
        y: previous.y + (kp.y - previous.y) * smoothingAlpha,
      };
    });

    previousKeypointsRef.current = smoothed;
    previousKeypointsTimeRef.current = videoTime;
    return smoothed;
  }, [effectiveThreshold, maxJumpRatio, smoothingAlpha, smoothingEnabled]);

  // Initialize detector
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function loadDetector() {
      setIsLoading(true);
      setError(null);

      try {
        // Dynamic import to avoid loading TensorFlow.js until needed
        const tf = await import('@tensorflow/tfjs');
        const poseDetection = await import('@tensorflow-models/pose-detection');

        // Wait for TensorFlow.js to be ready and set backend if needed
        await tf.ready();

        // Prefer WebGPU when available, fall back to WebGL for compatibility.
        // Use navigator.gpu to check browser support rather than tf.findBackend,
        // which only returns true after the backend has already been registered.
        const canUseWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
        const preferredBackend = canUseWebGpu ? 'webgpu' : 'webgl';
        try {
          await tf.setBackend(preferredBackend);
          await tf.ready();
        } catch (backendError) {
          try {
            await tf.setBackend('webgl');
            await tf.ready();
          } catch (fallbackError) {
            console.warn('Could not set WebGL backend, using default:', fallbackError);
          }
          console.warn(`Could not set ${preferredBackend} backend, falling back:`, backendError);
        }

        let detector: PoseDetector;

        if (modelType === 'movenet') {
          const detectorConfig = {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER, // or SINGLEPOSE_LIGHTNING for faster, less accurate
            enableSmoothing: smoothingEnabled,
            minPoseScore,
          };
          detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            detectorConfig
          );
        } else {
          // BlazePose
          const detectorConfig = {
            runtime: 'tfjs' as const,
            enableSmoothing: smoothingEnabled,
            modelType: blazeposeModelType,
            detectorModelUrl: undefined, // Use default
            landmarkModelUrl: undefined, // Use default
          };
          detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.BlazePose,
            detectorConfig
          );
        }

        if (cancelled) {
          detector.dispose();
          return;
        }

        detectorRef.current = detector;
        setIsReady(true);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load pose detector:', err);
        setError(err instanceof Error ? err.message : 'Failed to load pose detector');
        setIsLoading(false);
      }
    }

    loadDetector();

    return () => {
      cancelled = true;
      if (detectorRef.current) {
        detectorRef.current.dispose();
        detectorRef.current = null;
      }
      setIsReady(false);
    };
  }, [enabled, modelType, minPoseScore, smoothingEnabled, blazeposeModelType]);

  // Detect poses in video frames
  const detectPose = useCallback(async (options?: { force?: boolean }) => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    const force = options?.force ?? false;
    
    // Allow detection when paused if force is true (for scrubbing/navigation)
    if (!video || !detector || !isReady) {
      return null;
    }
    
    if (!force && (video.paused || video.ended)) {
      return null;
    }

    try {
      // Capture current time BEFORE the async estimatePoses call so smoothKeypoints
      // can detect if the video position changed during the await (race condition on seek).
      const capturedTime = video.currentTime;

      if (modelType === 'blazepose') {
        if (!video.width || !video.height) {
          video.width = video.videoWidth;
          video.height = video.videoHeight;
        }
      }

      const poses = await detector.estimatePoses(video, {
        flipHorizontal: false,
        staticImageMode: false,
      });

      if (poses && poses.length > 0) {
        const pose = poses[0]; // Get the first (most confident) pose

        // Always use 2D pixel keypoints for the rendering/analysis pipeline.
        // keypoints3D from BlazePose use normalized body-space coords ([-1,1]),
        // NOT pixels — they must never be mixed into the 2D pixel pipeline.
        const rawKeypointsSource = pose.keypoints && pose.keypoints.length > 0
          ? pose.keypoints
          : [];
        const source: 'keypoints' | 'keypoints3D' | 'none' =
          rawKeypointsSource.length > 0 ? 'keypoints' : 'none';

        // Store 3D keypoints separately — used for camera orientation detection.
        // They use normalized body-space coords ([-1,1]), not pixels.
        const mapped3D = pose.keypoints3D && pose.keypoints3D.length > 0
          ? pose.keypoints3D.map(kp => ({
              x: kp.x,
              y: kp.y,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              z: (kp as any).z ?? undefined,
              score: kp.score ?? kp.visibility ?? 1,
              name: kp.name,
            }))
          : [];
        setKeypoints3D(mapped3D);

        // Compute camera orientation from 3D keypoints (BlazePose) or 2D fallback (MoveNet).
        // The result is used to warn users when the camera angle doesn't match the expected
        // view for the selected exercise preset.
        setCameraOrientation(
          computeCameraOrientation(mapped3D, rawKeypointsSource as Keypoint[])
        );

        // If no 2D keypoints were returned, clear state and bail out.
        if (rawKeypointsSource.length === 0) {
          setCurrentPose(null);
          setKeypoints([]);
          setDebugInfo({ source: 'none', rawCount: 0, rawMinX: 0, rawMaxX: 0, rawMinY: 0, rawMaxY: 0, qualityScore: 0, missingCriticalKeypoints: [] });
          return null;
        }
        const rawXs = rawKeypointsSource.map((kp) => kp.x ?? 0);
        const rawYs = rawKeypointsSource.map((kp) => kp.y ?? 0);
        const rawMinX = rawXs.length ? Math.min(...rawXs) : 0;
        const rawMaxX = rawXs.length ? Math.max(...rawXs) : 0;
        const rawMinY = rawYs.length ? Math.min(...rawYs) : 0;
        const rawMaxY = rawYs.length ? Math.max(...rawYs) : 0;
        // NOTE: setDebugInfo is called once at the end (after qualityScore is computed)
        // to avoid leaving stale partial state if an exception occurs mid-pipeline.
        const normalizedKeypoints: Keypoint[] = rawKeypointsSource.map((kp) => ({
          x: kp.x,
          y: kp.y,
          score: kp.score ?? kp.visibility ?? 1,
          name: kp.name,
        }));
        const mappedKeypoints = remapKeypoints(
          modelType,
          normalizedKeypoints,
          video?.videoWidth && video?.videoHeight
            ? { width: video.videoWidth, height: video.videoHeight }
            : undefined
        );
        const boundedKeypoints = video?.videoWidth && video?.videoHeight
          ? mappedKeypoints.map((kp) => {
              const marginX = video.videoWidth * maxOutOfBoundsRatio;
              const marginY = video.videoHeight * maxOutOfBoundsRatio;
              const outOfBounds = kp.x < -marginX ||
                kp.x > video.videoWidth + marginX ||
                kp.y < -marginY ||
                kp.y > video.videoHeight + marginY;
              return outOfBounds ? { ...kp, score: 0 } : kp;
            })
          : mappedKeypoints;
        const smoothedKeypoints = smoothKeypoints(boundedKeypoints, video, capturedTime);
        
        // Validate pose completeness
        const validation = validatePoseCompleteness(smoothedKeypoints);
        
        // Calculate quality score based on validation and average keypoint scores
        const avgScore = smoothedKeypoints.length > 0
          ? smoothedKeypoints.reduce((sum, kp) => sum + (kp.score || 0), 0) / smoothedKeypoints.length
          : 0;
        const qualityScore = (validation.confidence * 0.6) + (avgScore * 0.4);
        
        setDebugInfo({
          source,
          rawCount: rawKeypointsSource.length,
          rawMinX,
          rawMaxX,
          rawMinY,
          rawMaxY,
          qualityScore,
          missingCriticalKeypoints: validation.missingKeypoints,
        });
        
        setCurrentPose(pose);
        setKeypoints(smoothedKeypoints);
        return pose;
      } else {
        setCurrentPose(null);
        setKeypoints([]);
        setDebugInfo({
          source: 'none',
          rawCount: 0,
          rawMinX: 0,
          rawMaxX: 0,
          rawMinY: 0,
          rawMaxY: 0,
          qualityScore: 0,
          missingCriticalKeypoints: [],
        });
        return null;
      }
    } catch (err) {
      console.error('Pose detection error:', err);
      return null;
    }
  }, [videoRef, isReady, maxOutOfBoundsRatio, modelType, smoothKeypoints, validatePoseCompleteness]);

  // Keep a stable ref to detectPose so the loop effect doesn't need it as a dependency.
  // This prevents the loop from restarting whenever detectPose recreates due to parent re-renders.
  const detectPoseRef = useRef(detectPose);
  useEffect(() => { detectPoseRef.current = detectPose; });

  // Clear stale keypoints immediately when detection is disabled (e.g. video reset, new video loading).
  // Without this, keypoints from the previous video persist visually until the first new detection run.
  useEffect(() => {
    if (!enabled) {
      setKeypoints([]);
      setKeypoints3D([]);
      setCurrentPose(null);
      previousKeypointsRef.current = null;
      previousKeypointsTimeRef.current = -1;
    }
  }, [enabled]);

  // Continuous detection loop
  useEffect(() => {
    if (!enabled || !isReady) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    let lastProcessedTime = -1;
    // Use a ref (not a closure variable) so concurrent detections across effect re-runs
    // share the same flag and the throttle remains effective (BUG-02).
    isDetectingRef.current = false;
    let timeUpdateThrottleTimer: number | null = null;

    // Detection function with throttling (for playback)
    const detect = async () => {
      if (!video || isDetectingRef.current) {
        // Continue loop if playing, even if detection is in progress
        if (video && !video.paused && !video.ended) {
          animationFrameRef.current = requestAnimationFrame(detect);
        }
        return;
      }

      const currentTime = video.currentTime;

      // During playback: throttle by video time (process every ~33ms, ~30fps)
      const timeDelta = Math.abs(currentTime - lastProcessedTime);
      const shouldProcess = timeDelta > 0.033; // ~30fps throttle

      if (shouldProcess) {
        isDetectingRef.current = true;
        lastProcessedTime = currentTime;

        // Don't block the loop - fire and continue
        detectPoseRef.current({ force: true }).catch(err => {
          console.error('Detection error in loop:', err);
        }).finally(() => {
          isDetectingRef.current = false;
        });
      }

      // Continue loop if playing
      if (video && !video.paused && !video.ended) {
        animationFrameRef.current = requestAnimationFrame(detect);
      }
    };

    // Handle time updates during scrubbing (when paused)
    const handleTimeUpdate = () => {
      if (!video || isDetectingRef.current) return;

      // Only handle timeupdate when paused (scrubbing)
      // During playback, the detect loop handles it
      if (!video.paused) return;

      // Throttle timeupdate events (debounce) to avoid too many detections
      if (timeUpdateThrottleTimer) {
        clearTimeout(timeUpdateThrottleTimer);
      }

      timeUpdateThrottleTimer = window.setTimeout(() => {
        if (!video || isDetectingRef.current) return;

        const delta = Math.abs(video.currentTime - lastProcessedTime);
        // Detect if time changed by more than 0.03 seconds (roughly one frame at 30fps)
        if (delta > 0.03) {
          isDetectingRef.current = true;
          lastProcessedTime = video.currentTime;

          detectPoseRef.current({ force: true }).catch(err => {
            console.error('Detection error on timeupdate:', err);
          }).finally(() => {
            isDetectingRef.current = false;
          });
        }
      }, 50); // Debounce timeupdate by 50ms
    };

    const handlePlay = () => {
      lastProcessedTime = -1; // Reset to force detection on play
      if (timeUpdateThrottleTimer) {
        clearTimeout(timeUpdateThrottleTimer);
        timeUpdateThrottleTimer = null;
      }
      if (animationFrameRef.current === null) {
        animationFrameRef.current = requestAnimationFrame(detect);
      }
    };

    const handlePause = () => {
      // Don't stop detection - we want to detect during scrubbing when paused
      // Just stop the animation frame loop
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    const handleEmptied = () => {
      // Fires when src is cleared (video deleted). Reset smoothing so stale keypoints
      // from the old video never bleed into the next loaded video.
      previousKeypointsRef.current = null;
      previousKeypointsTimeRef.current = -1;
      lastProcessedTime = -1;
    };

    const handleSeeked = () => {
      // Force detection immediately on seek.
      // Reset both smoothing refs so the time-jump guard in smoothKeypoints
      // can correctly detect that the next detection is for a new position.
      lastProcessedTime = -1;
      previousKeypointsRef.current = null;
      previousKeypointsTimeRef.current = -1;
      if (timeUpdateThrottleTimer) {
        clearTimeout(timeUpdateThrottleTimer);
        timeUpdateThrottleTimer = null;
      }
      if (!isDetectingRef.current) {
        isDetectingRef.current = true;
        detectPoseRef.current({ force: true }).catch(err => {
          console.error('Detection error on seek:', err);
        }).finally(() => {
          isDetectingRef.current = false;
        });
      }
    };

    video.addEventListener('emptied', handleEmptied);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handlePause);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('timeupdate', handleTimeUpdate);

    // Initialize
    lastProcessedTime = video.currentTime;

    // Start detection if video is already playing
    if (!video.paused) {
      animationFrameRef.current = requestAnimationFrame(detect);
    } else {
      // Even if paused, detect initial frame
      detectPoseRef.current({ force: true }).catch(err => {
        console.error('Detection error on init:', err);
      });
    }

    return () => {
      // Reset the shared detection flag so the next effect invocation starts cleanly.
      isDetectingRef.current = false;
      video.removeEventListener('emptied', handleEmptied);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handlePause);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (timeUpdateThrottleTimer) {
        clearTimeout(timeUpdateThrottleTimer);
        timeUpdateThrottleTimer = null;
      }
    };
  // detectPose removed from deps: accessed via detectPoseRef to avoid restarting
  // the loop on every render that recreates detectPose (BUG-06).
  }, [enabled, isReady, videoRef]);

  // Render pose on canvas if provided
  useEffect(() => {
    if (!canvasRef?.current || !currentPose || !keypoints.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get video dimensions for scaling
    const video = videoRef.current;
    if (!video) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw keypoints and skeleton
    // This is a simplified version - a full implementation would draw the skeleton
    keypoints.forEach((kp) => {
      // Use effectiveThreshold (same as the detection pipeline) so canvas rendering
      // matches exactly which keypoints are used for analysis (BUG-16).
      if (kp.score < effectiveThreshold) return;

      // Scale keypoint coordinates to canvas size
      const x = (kp.x / video.videoWidth) * canvas.width;
      const y = (kp.y / video.videoHeight) * canvas.height;

      // Draw keypoint
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#00ff00';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [canvasRef, currentPose, keypoints, effectiveThreshold, videoRef]);

  return {
    isLoading,
    isReady,
    error,
    currentPose,
    keypoints,
    keypoints3D,
    cameraOrientation,
    debugInfo,
    detectPose, // Manual trigger
  };
}
