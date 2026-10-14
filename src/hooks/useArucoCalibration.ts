import { useState, useCallback, useRef } from 'react';

// ArUco marker detection using js-aruco2
// Markers #0 and #1 (ArUco 10x10) are used with a known 30cm distance for calibration

export interface CalibrationResult {
  isCalibrated: boolean;
  pixelDistance: number;  // Distance between markers in pixels
  realDistance: number;   // Known real-world distance (default 30cm)
  factor: number;         // cm per pixel
  marker1: { x: number; y: number } | null;
  marker2: { x: number; y: number } | null;
  timestamp: number;
  source: 'aruco' | 'manual' | null;  // How calibration was established
}

export interface CalibrationSettings {
  marker1Id: number;     // Default: 0
  marker2Id: number;     // Default: 1
  realDistanceCm: number; // Default: 30
}

const DEFAULT_SETTINGS: CalibrationSettings = {
  marker1Id: 0,
  marker2Id: 1,
  realDistanceCm: 30,
};

// Dynamic import for js-aruco2 (heavy library)
let AR: typeof import('js-aruco2').AR | null = null;

async function loadArucoLibrary(): Promise<typeof import('js-aruco2').AR> {
  if (!AR) {
    const aruco = await import('js-aruco2');
    AR = aruco.AR;
  }
  return AR;
}

export function useArucoCalibration(settings: Partial<CalibrationSettings> = {}): {
  calibration: CalibrationResult;
  isDetecting: boolean;
  error: string | null;
  detectMarkers: (source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => Promise<CalibrationResult | null>;
  pixelsToCm: (pixels: number) => number | null;
  pixelsToVelocity: (pixelsPerFrame: number, fps?: number) => number | null;
  setManualCalibration: (patientHeightCm: number, bodyHeightPx: number) => void;
  resetCalibration: () => void;
  initDetector: () => Promise<boolean>;
} {
  const config = { ...DEFAULT_SETTINGS, ...settings };
  
  const [calibration, setCalibration] = useState<CalibrationResult>({
    isCalibrated: false,
    pixelDistance: 0,
    realDistance: config.realDistanceCm,
    factor: 0,
    marker1: null,
    marker2: null,
    timestamp: 0,
    source: null,
  });
  
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detectorRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize detector
  const initDetector = useCallback(async () => {
    try {
      const ArModule = await loadArucoLibrary();
      if (ArModule && ArModule.Detector && !detectorRef.current) {
        detectorRef.current = new ArModule.Detector();
      }
      return true;
    } catch (err) {
      setError('Failed to load ArUco detection library');
      console.error('ArUco init error:', err);
      return false;
    }
  }, []);

  // Detect markers in a video/image frame
  const detectMarkers = useCallback(async (
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<CalibrationResult | null> => {
    setIsDetecting(true);
    setError(null);

    try {
      // Ensure detector is initialized
      if (!detectorRef.current) {
        const success = await initDetector();
        if (!success || !detectorRef.current) {
          setIsDetecting(false);
          return null;
        }
      }

      // Create/reuse canvas for processing
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setError('Failed to get canvas context');
        setIsDetecting(false);
        return null;
      }

      // Get source dimensions
      let width: number, height: number;
      if (source instanceof HTMLVideoElement) {
        width = source.videoWidth;
        height = source.videoHeight;
      } else if (source instanceof HTMLImageElement) {
        width = source.naturalWidth;
        height = source.naturalHeight;
      } else {
        width = source.width;
        height = source.height;
      }

      if (width === 0 || height === 0) {
        setError('Invalid source dimensions');
        setIsDetecting(false);
        return null;
      }

      // Resize canvas and draw source
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(source, 0, 0);

      // Get image data for detection
      const imageData = ctx.getImageData(0, 0, width, height);
      
      // Detect markers
      const markers = detectorRef.current.detect(imageData);
      
      // Find our calibration markers
      const marker1 = markers.find((m: { id: number }) => m.id === config.marker1Id);
      const marker2 = markers.find((m: { id: number }) => m.id === config.marker2Id);

      if (marker1 && marker2) {
        // Calculate center of each marker
        const getCenter = (corners: { x: number; y: number }[]): { x: number; y: number; } => ({
          x: corners.reduce((sum, c) => sum + c.x, 0) / corners.length,
          y: corners.reduce((sum, c) => sum + c.y, 0) / corners.length,
        });

        const center1 = getCenter(marker1.corners);
        const center2 = getCenter(marker2.corners);

        // Calculate pixel distance
        const dx = center2.x - center1.x;
        const dy = center2.y - center1.y;
        const pixelDistance = Math.sqrt(dx * dx + dy * dy);

        // Calculate calibration factor (cm per pixel)
        const factor = config.realDistanceCm / pixelDistance;

        const result: CalibrationResult = {
          isCalibrated: true,
          pixelDistance,
          realDistance: config.realDistanceCm,
          factor,
          marker1: center1,
          marker2: center2,
          timestamp: Date.now(),
          source: 'aruco',
        };

        setCalibration(result);
        setIsDetecting(false);
        return result;
      } else {
        // Markers not found
        const result: CalibrationResult = {
          isCalibrated: false,
          pixelDistance: 0,
          realDistance: config.realDistanceCm,
          factor: 0,
          source: null,
          marker1: marker1 ? {
            x: marker1.corners.reduce((sum: number, c: { x: number }) => sum + c.x, 0) / marker1.corners.length,
            y: marker1.corners.reduce((sum: number, c: { y: number }) => sum + c.y, 0) / marker1.corners.length,
          } : null,
          marker2: marker2 ? {
            x: marker2.corners.reduce((sum: number, c: { x: number }) => sum + c.x, 0) / marker2.corners.length,
            y: marker2.corners.reduce((sum: number, c: { y: number }) => sum + c.y, 0) / marker2.corners.length,
          } : null,
          timestamp: Date.now(),
        };
        setCalibration(result);
        setIsDetecting(false);
        return result;
      }
    } catch (err) {
      setError('Detection failed');
      console.error('ArUco detection error:', err);
      setIsDetecting(false);
      return null;
    }
  }, [config.marker1Id, config.marker2Id, config.realDistanceCm, initDetector]);

  // Convert pixels to centimeters using calibration
  const pixelsToCm = useCallback((pixels: number): number | null => {
    if (!calibration.isCalibrated || calibration.factor === 0) {
      return null;
    }
    return pixels * calibration.factor;
  }, [calibration.isCalibrated, calibration.factor]);

  // Convert pixels/frame to cm/s (assuming 30fps)
  const pixelsToVelocity = useCallback((pixelsPerFrame: number, fps: number = 30): number | null => {
    if (!calibration.isCalibrated || calibration.factor === 0) {
      return null;
    }
    const cmPerFrame = pixelsPerFrame * calibration.factor;
    return cmPerFrame * fps; // cm/s
  }, [calibration.isCalibrated, calibration.factor]);

  // Set calibration from subject height (fallback when ArUco is unavailable)
  // patientHeightCm: real height in cm; bodyHeightPx: estimated height in pixels from pose
  const setManualCalibration = useCallback((patientHeightCm: number, bodyHeightPx: number) => {
    if (patientHeightCm <= 0 || bodyHeightPx <= 0) return;
    const factor = patientHeightCm / bodyHeightPx;
    setCalibration({
      isCalibrated: true,
      pixelDistance: bodyHeightPx,
      realDistance: patientHeightCm,
      factor,
      marker1: null,
      marker2: null,
      timestamp: Date.now(),
      source: 'manual',
    });
    setError(null);
  }, []);

  // Reset calibration
  const resetCalibration = useCallback(() => {
    setCalibration({
      isCalibrated: false,
      pixelDistance: 0,
      realDistance: config.realDistanceCm,
      factor: 0,
      marker1: null,
      marker2: null,
      timestamp: 0,
      source: null,
    });
    setError(null);
  }, [config.realDistanceCm]);

  return {
    calibration,
    isDetecting,
    error,
    detectMarkers,
    pixelsToCm,
    pixelsToVelocity,
    setManualCalibration,
    resetCalibration,
    initDetector,
  };
}
