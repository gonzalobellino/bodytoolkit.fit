import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { calculateAngle, findKeypoint, type Keypoint } from '../utils/poseAnalysis';

interface PoseMetrics {
  hipSpeed?: number;
  hipSpeedNormalized?: number;
  trunkRotation?: number;
  pelvisRotation?: number;
  xFactor?: number;
  pelvisStability?: number;
  depthAngle?: number;
  bodyHeight?: number;
  swingStartTime?: number;
  impactTime?: number;
}

interface PoseMetricsOptions {
  keypoints: Keypoint[];
  timeSec: number;
  windowSec?: number;
}

interface SamplePoint {
  time: number;
  pelvis?: { x: number; y: number };
}

const getMidpoint = (a?: Keypoint | null, b?: Keypoint | null): { x: number; y: number; } | null => {
  if (!a || !b) return null;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
};

const getRotationAngle = (left?: Keypoint | null, right?: Keypoint | null): number | null => {
  if (!left || !right) return null;
  const dx = right.x - left.x;
  const dy = right.y - left.y;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  // Normalize to keep rotations in a human-readable range around horizontal.
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  return angle;
};

const computeStdDev = (values: number[]): number => {
  if (!values.length) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
};

const estimateBodyHeight = (keypoints: {
  leftHip: Keypoint | null;
  rightHip: Keypoint | null;
  leftShoulder: Keypoint | null;
  rightShoulder: Keypoint | null;
  leftKnee: Keypoint | null;
  rightKnee: Keypoint | null;
  leftAnkle: Keypoint | null;
  rightAnkle: Keypoint | null;
}): number | null => {
  const segmentLength = (a?: Keypoint | null, b?: Keypoint | null): number | null => {
    if (!a || !b) return null;
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const leftLeg = segmentLength(keypoints.leftHip, keypoints.leftKnee);
  const leftShank = segmentLength(keypoints.leftKnee, keypoints.leftAnkle);
  const rightLeg = segmentLength(keypoints.rightHip, keypoints.rightKnee);
  const rightShank = segmentLength(keypoints.rightKnee, keypoints.rightAnkle);
  const leftTorso = segmentLength(keypoints.leftShoulder, keypoints.leftHip);
  const rightTorso = segmentLength(keypoints.rightShoulder, keypoints.rightHip);

  const leftTotal = leftLeg && leftShank && leftTorso ? leftLeg + leftShank + leftTorso : null;
  const rightTotal = rightLeg && rightShank && rightTorso ? rightLeg + rightShank + rightTorso : null;

  if (leftTotal && rightTotal) {
    return (leftTotal + rightTotal) / 2;
  }
  if (leftTotal) return leftTotal;
  if (rightTotal) return rightTotal;

  const shoulders = [keypoints.leftShoulder, keypoints.rightShoulder].filter(Boolean) as Keypoint[];
  const ankles = [keypoints.leftAnkle, keypoints.rightAnkle].filter(Boolean) as Keypoint[];
  if (!shoulders.length || !ankles.length) return null;
  const topY = Math.min(...shoulders.map((kp) => kp.y));
  const bottomY = Math.max(...ankles.map((kp) => kp.y));
  return Math.abs(bottomY - topY);
};

export function usePoseMetrics({ keypoints, timeSec, windowSec = 1.5 }: PoseMetricsOptions): { metrics: PoseMetrics; markSwingStart: () => void; markImpact: () => void; clearSwingMarkers: () => void; } {
  const historyRef = useRef<SamplePoint[]>([]);
  const lastTimeRef = useRef<number | null>(null);
  const [markers, setMarkers] = useState<{ swingStartTime?: number; impactTime?: number }>({});
  // Keep a ref to markers so the metrics effect can read them without listing them as
  // dependencies (which would cause an extra effect run every time a marker is set — BUG-07).
  const markersRef = useRef(markers);
  const [metrics, setMetrics] = useState<PoseMetrics>({});

  const resetHistory = useCallback(() => {
    historyRef.current = [];
    lastTimeRef.current = null;
  }, []);

  const markSwingStart = useCallback(() => {
    resetHistory();
    setMarkers({ swingStartTime: timeSec, impactTime: undefined });
  }, [resetHistory, timeSec]);

  const markImpact = useCallback(() => {
    setMarkers((prev) => ({ ...prev, impactTime: timeSec }));
  }, [timeSec]);

  const clearSwingMarkers = useCallback(() => {
    setMarkers({});
  }, []);

  // Sync markersRef on every render so the metrics effect always has the latest markers.
  useEffect(() => { markersRef.current = markers; }, [markers]);

  const keypointMap = useMemo(() => {
    const get = (names: string[]): Keypoint | null => {
      for (const name of names) {
        const kp = findKeypoint(keypoints, name);
        if (kp) return kp;
      }
      return null;
    };
    return {
      leftHip: get(['left_hip', 'hip_left']),
      rightHip: get(['right_hip', 'hip_right']),
      leftShoulder: get(['left_shoulder', 'shoulder_left']),
      rightShoulder: get(['right_shoulder', 'shoulder_right']),
      leftKnee: get(['left_knee', 'knee_left']),
      rightKnee: get(['right_knee', 'knee_right']),
      leftAnkle: get(['left_ankle', 'ankle_left']),
      rightAnkle: get(['right_ankle', 'ankle_right']),
    };
  }, [keypoints]);

  useEffect(() => {
    if (!keypoints.length) {
      setMetrics({});
      resetHistory();
      setMarkers({});
      return;
    }

    if (lastTimeRef.current !== null && timeSec < lastTimeRef.current) {
      historyRef.current = [];
      setMarkers({});
    }
    lastTimeRef.current = timeSec;

    const bodyHeight = estimateBodyHeight(keypointMap) ?? undefined;

    const pelvisCenter = getMidpoint(keypointMap.leftHip, keypointMap.rightHip);
    const sample: SamplePoint = { time: timeSec };
    if (pelvisCenter) {
      sample.pelvis = pelvisCenter;
    }
    historyRef.current.push(sample);

    const windowStart = timeSec - windowSec;
    historyRef.current = historyRef.current.filter((sample) => sample.time >= windowStart);

    const history = historyRef.current;
    const latest = history[history.length - 1];
    const prev = history.length > 1 ? history[history.length - 2] : null;

    let hipSpeed: number | undefined;
    if (latest?.pelvis && prev?.pelvis) {
      const dt = latest.time - prev.time;
      if (dt > 0) {
        const distance = Math.hypot(latest.pelvis.x - prev.pelvis.x, latest.pelvis.y - prev.pelvis.y);
        hipSpeed = distance / dt;
      }
    }

    const trunkRotation = getRotationAngle(keypointMap.leftShoulder, keypointMap.rightShoulder);
    const pelvisRotation = getRotationAngle(keypointMap.leftHip, keypointMap.rightHip);
    const xFactor = trunkRotation !== null && pelvisRotation !== null
      ? trunkRotation - pelvisRotation
      : undefined;

    const normalizedHipSpeed = hipSpeed && bodyHeight ? hipSpeed / bodyHeight : undefined;

    const pelvisXs = history.map((sample) => sample.pelvis?.x).filter((value): value is number => value !== undefined);
    const pelvisYs = history.map((sample) => sample.pelvis?.y).filter((value): value is number => value !== undefined);
    const pelvisStability = pelvisXs.length ? computeStdDev(pelvisXs) + computeStdDev(pelvisYs) : undefined;

    const leftDepth = keypointMap.leftHip && keypointMap.leftKnee && keypointMap.leftAnkle
      ? calculateAngle(keypointMap.leftHip, keypointMap.leftKnee, keypointMap.leftAnkle)
      : null;
    const rightDepth = keypointMap.rightHip && keypointMap.rightKnee && keypointMap.rightAnkle
      ? calculateAngle(keypointMap.rightHip, keypointMap.rightKnee, keypointMap.rightAnkle)
      : null;
    // Use !== null checks instead of truthiness so that a valid angle of 0° is not
    // discarded (BUG-13: `leftDepth && rightDepth` is falsy when either is exactly 0).
    const depthAngle = leftDepth !== null && rightDepth !== null
      ? (leftDepth + rightDepth) / 2
      : leftDepth ?? rightDepth ?? undefined;

    setMetrics({
      hipSpeed,
      hipSpeedNormalized: normalizedHipSpeed,
      trunkRotation: trunkRotation ?? undefined,
      pelvisRotation: pelvisRotation ?? undefined,
      xFactor,
      pelvisStability,
      depthAngle,
      bodyHeight,
      // Read from ref to avoid listing markers as a dependency (BUG-07).
      swingStartTime: markersRef.current.swingStartTime,
      impactTime: markersRef.current.impactTime,
    });
  // markers.* removed from deps: read via markersRef to avoid double-executing the
  // effect every time a swing marker is set (BUG-07).
  }, [keypoints, keypointMap, resetHistory, timeSec, windowSec]);

  return {
    metrics,
    markSwingStart,
    markImpact,
    clearSwingMarkers,
  };
}
