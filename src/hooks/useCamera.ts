import { useState, useCallback } from 'react';

export type CameraFacing = 'environment' | 'user';

interface UseCameraOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  onCapture?: (image: HTMLImageElement) => void;
}

export function useCamera({ videoRef, onCapture }: UseCameraOptions): {
  stream: MediaStream | null;
  cameraFacing: CameraFacing;
  status: string;
  isReady: boolean;
  startPreview: () => Promise<void>;
  stopPreview: () => void;
  capturePhoto: () => void;
  switchCamera: (facing: CameraFacing) => void;
  setStatus: React.Dispatch<React.SetStateAction<string>>;
} {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>('environment');
  const [status, setStatus] = useState<string>('Camera idle.');
  const [isReady, setIsReady] = useState(false);

  const stopPreview = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
      if (video.classList) {
        video.classList.add('hidden');
      }
    }
    setIsReady(false);
  }, [stream, videoRef]);

  const startPreview = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    if (!window.isSecureContext) {
      setStatus(`Camera requires HTTPS or localhost. Current: ${location.protocol}//${location.host}`);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('Camera not supported in this browser.');
      return;
    }

    try {
      stopPreview();
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: cameraFacing },
          // Request high quality for better image quality
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        }
      });
      video.srcObject = mediaStream;
      setStream(mediaStream);
      setIsReady(true);
      setStatus('Camera ready. Tap Capture to freeze.');
      if (video.classList) {
        video.classList.remove('hidden');
      }
    } catch (error) {
      console.error('Camera error:', error);
      setStatus('Camera permission denied or unavailable.');
      setIsReady(false);
    }
  }, [cameraFacing, stopPreview, videoRef]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setStatus('Camera not ready yet.');
      return;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(video, 0, 0);

    const img = new Image();
    img.onload = () => {
      setStatus('Photo captured.');
      stopPreview();
      onCapture?.(img);
    };
    img.src = tempCanvas.toDataURL('image/png');
  }, [videoRef, stopPreview, onCapture]);

  const switchCamera = useCallback((facing: CameraFacing) => {
    setCameraFacing(facing);
    if (stream) {
      startPreview();
    }
  }, [stream, startPreview]);

  return {
    stream,
    cameraFacing,
    status,
    isReady,
    startPreview,
    stopPreview,
    capturePhoto,
    switchCamera,
    setStatus,
  };
}
