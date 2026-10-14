import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CheckCircle, AlertCircle, RefreshCw, Video, VideoOff } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useArucoCalibration } from '../hooks/useArucoCalibration';

interface CalibrationDetectStepProps {
  onCalibrated?: (factor: number) => void;
  onBack?: () => void;
}

export function CalibrationDetectStep({ onCalibrated, onBack }: CalibrationDetectStepProps): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const {
    calibration,
    isDetecting,
    error,
    detectMarkers,
    resetCalibration,
  } = useArucoCalibration({ marker1Id: 0, marker2Id: 1 });

  // Start camera
  const startCamera = useCallback(async () => {
    if (!window.isSecureContext) {
      setCameraError('Camera requires HTTPS or localhost.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera not supported in this browser.');
      return;
    }

    try {
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
        },
      });

      const video = videoRef.current;
      if (!video) {
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }

      // Set stream
      video.srcObject = mediaStream;
      setStream(mediaStream);
      
      // Play video
      try {
        await video.play();
        setIsCameraActive(true);
        setCameraError(null);
      } catch (playError) {
        console.error('Video play error:', playError);
        mediaStream.getTracks().forEach(track => track.stop());
        setCameraError('Failed to start video playback.');
        setIsCameraActive(false);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Camera permission denied or unavailable.');
      setIsCameraActive(false);
    }
  }, [stream]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }

    setIsCameraActive(false);
    resetCalibration();
  }, [stream, resetCalibration]);

  // Real-time detection (throttled to ~5fps for performance)
  useEffect(() => {
    if (!isCameraActive || !videoRef.current) {
      return;
    }

    const video = videoRef.current;

    // Start detection interval (~5fps = 200ms)
    detectionIntervalRef.current = window.setInterval(async () => {
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0 && !isDetecting) {
        await detectMarkers(video);
      }
    }, 200);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [isCameraActive, isDetecting, detectMarkers]);

  // Handle successful calibration
  useEffect(() => {
    if (calibration.isCalibrated && onCalibrated) {
      onCalibrated(calibration.factor);
    }
  }, [calibration.isCalibrated, calibration.factor, onCalibrated]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Draw marker overlays on overlay canvas
  useEffect(() => {
    if (!overlayCanvasRef.current || !isCameraActive || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    let animationFrameId: number | null = null;
    let isRunning = true;

    const drawOverlay = (): void => {
      if (!isRunning || !video || !canvas) {
        return;
      }

      // Wait for video to be ready
      if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) {
        animationFrameId = requestAnimationFrame(drawOverlay);
        return;
      }

      // Get container dimensions
      const container = canvas.parentElement;
      if (!container) {
        animationFrameId = requestAnimationFrame(drawOverlay);
        return;
      }

      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        animationFrameId = requestAnimationFrame(drawOverlay);
        return;
      }

      // Update canvas size
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Only draw if we have markers
      if (!calibration.marker1 && !calibration.marker2) {
        animationFrameId = requestAnimationFrame(drawOverlay);
        return;
      }

      // Calculate aspect ratios and scaling
      const videoAspect = video.videoWidth / video.videoHeight;
      const containerAspect = rect.width / rect.height;

      let scale: number;
      let offsetX = 0;
      let offsetY = 0;

      if (videoAspect > containerAspect) {
        scale = canvas.width / video.videoWidth;
        offsetY = (canvas.height - video.videoHeight * scale) / 2;
      } else {
        scale = canvas.height / video.videoHeight;
        offsetX = (canvas.width - video.videoWidth * scale) / 2;
      }

      // Draw marker 1
      if (calibration.marker1) {
        const x = calibration.marker1.x * scale + offsetX;
        const y = calibration.marker1.y * scale + offsetY;
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw marker 2
      if (calibration.marker2) {
        const x = calibration.marker2.x * scale + offsetX;
        const y = calibration.marker2.y * scale + offsetY;
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw line between markers
      if (calibration.marker1 && calibration.marker2) {
        const x1 = calibration.marker1.x * scale + offsetX;
        const y1 = calibration.marker1.y * scale + offsetY;
        const x2 = calibration.marker2.x * scale + offsetX;
        const y2 = calibration.marker2.y * scale + offsetY;
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      animationFrameId = requestAnimationFrame(drawOverlay);
    };

    // Start drawing
    drawOverlay();

    return () => {
      isRunning = false;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      // Clear canvas
      if (ctx && canvas.width > 0 && canvas.height > 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [calibration.marker1, calibration.marker2, isCameraActive]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
            calibration.isCalibrated ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
          }`}>
            {calibration.isCalibrated ? <CheckCircle className="w-4 h-4" /> : '3'}
          </div>
          Detect & Calibrate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Explanation */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-800">
              Open the camera and point it at the markers. The system will automatically detect
              them and calculate the calibration factor. Make sure both markers (ID 0 and ID 1)
              are clearly visible in the frame.
            </p>
          </div>

          {/* Camera View: cap height to avoid viewport overflow */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video max-h-[60vh] min-h-0 w-full">
            <video
              ref={videoRef}
              className="w-full h-full object-contain max-w-full max-h-full"
              playsInline
              muted
              autoPlay
            />
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 pointer-events-none z-10"
            />
            
            {/* Overlay info */}
            {isCameraActive && (
              <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-20">
                {calibration.marker1 && calibration.marker2 ? (
                  <span className="text-green-400">Both markers detected</span>
                ) : calibration.marker1 || calibration.marker2 ? (
                  <span className="text-yellow-400">1 marker detected</span>
                ) : (
                  <span className="text-red-400">No markers detected</span>
                )}
              </div>
            )}

            {/* Additional info overlay */}
            {isCameraActive && calibration.isCalibrated && (
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-20">
                <div className="font-medium">Factor: {calibration.factor.toFixed(4)} cm/px</div>
              </div>
            )}
          </div>

          {/* Camera Controls */}
          <div className="flex gap-2">
            {!isCameraActive ? (
              <Button onClick={startCamera} className="gap-2">
                <Video className="w-4 h-4" />
                Start Camera
              </Button>
            ) : (
              <Button onClick={stopCamera} variant="outline" className="gap-2">
                <VideoOff className="w-4 h-4" />
                Stop Camera
              </Button>
            )}
          </div>

          {/* Status Messages */}
          {cameraError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">Camera Error</AlertTitle>
              <AlertDescription className="text-red-700">
                {cameraError}
              </AlertDescription>
            </Alert>
          )}

          {isDetecting && (
            <Alert>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <AlertTitle>Detecting markers...</AlertTitle>
            </Alert>
          )}

          {calibration.isCalibrated && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Calibration Successful!</AlertTitle>
              <AlertDescription className="text-green-700">
                <div className="mt-2 space-y-1 text-sm">
                  <div>Pixel distance: {calibration.pixelDistance.toFixed(1)} px</div>
                  <div>Real distance: {calibration.realDistance} cm</div>
                  <div className="font-medium">
                    Calibration factor: {calibration.factor.toFixed(4)} cm/px
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {error && !calibration.isCalibrated && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">Detection Failed</AlertTitle>
              <AlertDescription className="text-red-700">
                {error}. Make sure both markers (ID 0 and 1) are clearly visible.
              </AlertDescription>
            </Alert>
          )}

          {!calibration.isCalibrated && !error && !isDetecting && isCameraActive && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Markers Not Found</AlertTitle>
              <AlertDescription className="text-amber-700">
                {calibration.marker1 && !calibration.marker2 && 'Marker #1 not detected.'}
                {!calibration.marker1 && calibration.marker2 && 'Marker #0 not detected.'}
                {!calibration.marker1 && !calibration.marker2 && 'Neither marker detected.'}
                {' '}Adjust camera position and lighting.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          {calibration.isCalibrated && onBack && (
            <div className="flex justify-end">
              <Button onClick={onBack} className="gap-2">
                <CheckCircle className="w-4 h-4" />
                Done - Return to Analysis
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
