import { useState, useCallback, useRef } from 'react';
import { estimateBodyHeight, type Keypoint } from '../utils/poseAnalysis';

// Compensation types for exercise movements
export type CompensationType = 
  | 'knee_valgus'
  | 'trunk_forward_lean'
  | 'hip_shift'
  | 'shoulder_elevation'
  | 'cervical_protraction'
  | 'lateral_trunk_lean';

export interface CompensationAlert {
  type: CompensationType;
  severity: 'mild' | 'moderate' | 'severe';
  side: 'left' | 'right' | 'bilateral';
  timestamp: number;
  value?: number;
  message: string;
}

export interface CompensationSettings {
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
}

// Thresholds for compensation detection.
// Pixel-based values are expressed as a ratio of estimated body height
// (shoulder→hip→knee→ankle segment sum). When body height cannot be estimated,
// BASE_BODY_HEIGHT_PX is used as the fallback so legacy behavior is preserved.
// Angular values (LATERAL_LEAN, TRUNK_TILT) are in degrees and never scaled.
const BASE_BODY_HEIGHT_PX = 400;

const BASE_THRESHOLDS = {
  // --- ratios of estimated body height ---
  KNEE_VALGUS_MILD:              0.05,
  KNEE_VALGUS_MODERATE:          0.09,
  KNEE_VALGUS_SEVERE:            0.12,
  TRUNK_LEAN_MILD:               0.10,
  TRUNK_LEAN_MODERATE:           0.17,
  TRUNK_LEAN_SEVERE:             0.25,
  HIP_SHIFT_MILD:                0.07,
  HIP_SHIFT_MODERATE:            0.12,
  HIP_SHIFT_SEVERE:              0.17,
  SHOULDER_ELEVATION_MILD:       0.05,
  SHOULDER_ELEVATION_MODERATE:   0.09,
  SHOULDER_ELEVATION_SEVERE:     0.14,
  CERVICAL_PROTRACTION_MILD:     0.09,
  CERVICAL_PROTRACTION_MODERATE: 0.14,
  CERVICAL_PROTRACTION_SEVERE:   0.21,
  // --- degrees (angular, no body-height scaling) ---
  LATERAL_LEAN_MILD:             8,
  LATERAL_LEAN_MODERATE:         15,
  LATERAL_LEAN_SEVERE:           22,
};

const SENSITIVITY_MULTIPLIERS = {
  low: 1.5,
  medium: 1.0,
  high: 0.7,
};

// Keypoint indices (MoveNet standard)
const KP = {
  NOSE: 0,
  LEFT_EAR: 3,
  RIGHT_EAR: 4,
  LEFT_SHOULDER: 5,
  RIGHT_SHOULDER: 6,
  LEFT_HIP: 11,
  RIGHT_HIP: 12,
  LEFT_KNEE: 13,
  RIGHT_KNEE: 14,
  LEFT_ANKLE: 15,
  RIGHT_ANKLE: 16,
};

const COMPENSATION_LABELS: Record<CompensationType, string> = {
  knee_valgus: 'Knee Valgus',
  trunk_forward_lean: 'Trunk Forward Lean',
  hip_shift: 'Hip Shift',
  shoulder_elevation: 'Shoulder Elevation',
  cervical_protraction: 'Forward Head',
  lateral_trunk_lean: 'Lateral Trunk Lean',
};

export function useCompensationDetection(settings?: CompensationSettings): {
  alerts: CompensationAlert[];
  currentCompensations: CompensationAlert[];
  processKeypoints: (keypoints: Keypoint[], timestamp: number) => void;
  resetBaseline: () => void;
  clearAlerts: () => void;
  getCompensationLabel: (type: CompensationType) => string;
} {
  const [alerts, setAlerts] = useState<CompensationAlert[]>([]);
  const [currentCompensations, setCurrentCompensations] = useState<CompensationAlert[]>([]);
  
  // Baseline tracking for shoulder elevation
  const baselineShoulderYRef = useRef<{ left: number; right: number } | null>(null);
  const lastAlertTimeRef = useRef<Record<CompensationType, number>>({} as Record<CompensationType, number>);

  const isEnabled = settings?.enabled ?? true;
  const sensitivity = settings?.sensitivity ?? 'medium';
  const multiplier = SENSITIVITY_MULTIPLIERS[sensitivity];

  const getThreshold = useCallback((base: number) => base * multiplier, [multiplier]);

  const detectCompensations = useCallback((
    keypoints: Keypoint[],
    timestamp: number
  ): CompensationAlert[] => {
    if (!isEnabled || !keypoints || keypoints.length < 17) return [];

    const getKp = (idx: number): Keypoint => keypoints[idx];
    const isValid = (kp: Keypoint | undefined): boolean | undefined => kp && kp.score >= 0.3;
    const detected: CompensationAlert[] = [];

    // Normalize pixel-based thresholds by estimated body height so detections
    // are independent of camera distance and subject size.
    const bodyHeight = estimateBodyHeight(keypoints) ?? BASE_BODY_HEIGHT_PX;
    const px = (ratio: number): number => ratio * bodyHeight;

    const leftShoulder = getKp(KP.LEFT_SHOULDER);
    const rightShoulder = getKp(KP.RIGHT_SHOULDER);
    const leftHip = getKp(KP.LEFT_HIP);
    const rightHip = getKp(KP.RIGHT_HIP);
    const leftKnee = getKp(KP.LEFT_KNEE);
    const rightKnee = getKp(KP.RIGHT_KNEE);
    const leftAnkle = getKp(KP.LEFT_ANKLE);
    const rightAnkle = getKp(KP.RIGHT_ANKLE);
    const nose = getKp(KP.NOSE);
    const leftEar = getKp(KP.LEFT_EAR);
    const rightEar = getKp(KP.RIGHT_EAR);

    // 1. Knee Valgus: Knee X inside the line from ankle to hip
    if (isValid(leftKnee) && isValid(leftHip) && isValid(leftAnkle)) {
      const expectedKneeX = (leftHip!.x + leftAnkle!.x) / 2;
      const valgusAmount = leftKnee!.x - expectedKneeX; // positive = medial (valgus)

      if (valgusAmount > getThreshold(px(BASE_THRESHOLDS.KNEE_VALGUS_MILD))) {
        const severity = valgusAmount >= getThreshold(px(BASE_THRESHOLDS.KNEE_VALGUS_SEVERE))   ? 'severe'   :
                         valgusAmount >= getThreshold(px(BASE_THRESHOLDS.KNEE_VALGUS_MODERATE)) ? 'moderate' : 'mild';
        detected.push({
          type: 'knee_valgus',
          severity,
          side: 'left',
          timestamp,
          value: valgusAmount,
          message: `Left knee tracking medially (${severity})`,
        });
      }
    }

    if (isValid(rightKnee) && isValid(rightHip) && isValid(rightAnkle)) {
      const expectedKneeX = (rightHip!.x + rightAnkle!.x) / 2;
      const valgusAmount = expectedKneeX - rightKnee!.x; // positive = medial (valgus) for right side

      if (valgusAmount > getThreshold(px(BASE_THRESHOLDS.KNEE_VALGUS_MILD))) {
        const severity = valgusAmount >= getThreshold(px(BASE_THRESHOLDS.KNEE_VALGUS_SEVERE))   ? 'severe'   :
                         valgusAmount >= getThreshold(px(BASE_THRESHOLDS.KNEE_VALGUS_MODERATE)) ? 'moderate' : 'mild';
        detected.push({
          type: 'knee_valgus',
          severity,
          side: 'right',
          timestamp,
          value: valgusAmount,
          message: `Right knee tracking medially (${severity})`,
        });
      }
    }

    // 2. Trunk Forward Lean: Shoulder midpoint X far ahead of hip midpoint X
    if (isValid(leftShoulder) && isValid(rightShoulder) && isValid(leftHip) && isValid(rightHip)) {
      const shoulderMidX = (leftShoulder!.x + rightShoulder!.x) / 2;
      const hipMidX = (leftHip!.x + rightHip!.x) / 2;
      const forwardLean = Math.abs(shoulderMidX - hipMidX);

      if (forwardLean > getThreshold(px(BASE_THRESHOLDS.TRUNK_LEAN_MILD))) {
        const severity = forwardLean >= getThreshold(px(BASE_THRESHOLDS.TRUNK_LEAN_SEVERE))   ? 'severe'   :
                         forwardLean >= getThreshold(px(BASE_THRESHOLDS.TRUNK_LEAN_MODERATE)) ? 'moderate' : 'mild';
        detected.push({
          type: 'trunk_forward_lean',
          severity,
          side: 'bilateral',
          timestamp,
          value: forwardLean,
          message: `Excessive trunk forward lean (${severity})`,
        });
      }
    }

    // 3. Hip Shift: Asymmetric hip X positions during bilateral movement
    if (isValid(leftHip) && isValid(rightHip) && isValid(leftShoulder) && isValid(rightShoulder)) {
      const hipMidX = (leftHip!.x + rightHip!.x) / 2;
      const shoulderMidX = (leftShoulder!.x + rightShoulder!.x) / 2;
      const hipShift = Math.abs(hipMidX - shoulderMidX);

      if (hipShift > getThreshold(px(BASE_THRESHOLDS.HIP_SHIFT_MILD))) {
        const severity = hipShift >= getThreshold(px(BASE_THRESHOLDS.HIP_SHIFT_SEVERE))   ? 'severe'   :
                         hipShift >= getThreshold(px(BASE_THRESHOLDS.HIP_SHIFT_MODERATE)) ? 'moderate' : 'mild';
        const side = hipMidX > shoulderMidX ? 'right' : 'left';
        detected.push({
          type: 'hip_shift',
          severity,
          side,
          timestamp,
          value: hipShift,
          message: `Hip shifting ${side} (${severity})`,
        });
      }
    }

    // 4. Shoulder Elevation: Shoulder Y higher than baseline
    if (isValid(leftShoulder) && isValid(rightShoulder)) {
      // Set baseline on first valid frame
      if (!baselineShoulderYRef.current) {
        baselineShoulderYRef.current = {
          left: leftShoulder!.y,
          right: rightShoulder!.y,
        };
      } else {
        const leftElevation  = baselineShoulderYRef.current.left  - leftShoulder!.y;
        const rightElevation = baselineShoulderYRef.current.right - rightShoulder!.y;

        const checkElevation = (elevation: number, side: 'left' | 'right'): void => {
          if (elevation > getThreshold(px(BASE_THRESHOLDS.SHOULDER_ELEVATION_MILD))) {
            const severity = elevation >= getThreshold(px(BASE_THRESHOLDS.SHOULDER_ELEVATION_SEVERE))   ? 'severe'   :
                             elevation >= getThreshold(px(BASE_THRESHOLDS.SHOULDER_ELEVATION_MODERATE)) ? 'moderate' : 'mild';
            detected.push({
              type: 'shoulder_elevation',
              severity,
              side,
              timestamp,
              value: elevation,
              message: `${side === 'left' ? 'Left' : 'Right'} shoulder elevated (${severity})`,
            });
          }
        };

        checkElevation(leftElevation,  'left');
        checkElevation(rightElevation, 'right');
      }
    }

    // 5. Cervical Protraction: Ear/nose X ahead of shoulder X
    if (isValid(leftShoulder) && isValid(rightShoulder)) {
      const shoulderMidX = (leftShoulder!.x + rightShoulder!.x) / 2;
      let headX: number | null = null;

      // Try ear position first, then nose
      if (isValid(leftEar) && isValid(rightEar)) {
        headX = (leftEar!.x + rightEar!.x) / 2;
      } else if (isValid(nose)) {
        headX = nose!.x;
      }

      if (headX !== null) {
        const protraction = Math.abs(headX - shoulderMidX);

        if (protraction > getThreshold(px(BASE_THRESHOLDS.CERVICAL_PROTRACTION_MILD))) {
          const severity = protraction >= getThreshold(px(BASE_THRESHOLDS.CERVICAL_PROTRACTION_SEVERE))   ? 'severe'   :
                           protraction >= getThreshold(px(BASE_THRESHOLDS.CERVICAL_PROTRACTION_MODERATE)) ? 'moderate' : 'mild';
          detected.push({
            type: 'cervical_protraction',
            severity,
            side: 'bilateral',
            timestamp,
            value: protraction,
            message: `Forward head posture (${severity})`,
          });
        }
      }
    }

    // 6. Lateral Trunk Lean: Angle of shoulder-hip line vs vertical (degrees — no body-height scaling)
    if (isValid(leftShoulder) && isValid(rightShoulder) && isValid(leftHip) && isValid(rightHip)) {
      const shoulderMidX = (leftShoulder!.x + rightShoulder!.x) / 2;
      const shoulderMidY = (leftShoulder!.y + rightShoulder!.y) / 2;
      const hipMidX = (leftHip!.x + rightHip!.x) / 2;
      const hipMidY = (leftHip!.y + rightHip!.y) / 2;

      const dx = shoulderMidX - hipMidX;
      const dy = shoulderMidY - hipMidY;
      const angleRad = Math.atan2(dx, -dy);
      const angleDeg = Math.abs(angleRad * (180 / Math.PI));

      if (angleDeg > getThreshold(BASE_THRESHOLDS.LATERAL_LEAN_MILD)) {
        const severity = angleDeg >= getThreshold(BASE_THRESHOLDS.LATERAL_LEAN_SEVERE)   ? 'severe'   :
                         angleDeg >= getThreshold(BASE_THRESHOLDS.LATERAL_LEAN_MODERATE) ? 'moderate' : 'mild';
        const side = dx > 0 ? 'right' : 'left';
        detected.push({
          type: 'lateral_trunk_lean',
          severity,
          side,
          timestamp,
          value: angleDeg,
          message: `Lateral trunk lean ${side} (${angleDeg.toFixed(1)}°)`,
        });
      }
    }

    return detected;
  }, [isEnabled, getThreshold]);

  const processKeypoints = useCallback((
    keypoints: Keypoint[],
    timestamp: number
  ) => {
    const detected = detectCompensations(keypoints, timestamp);
    setCurrentCompensations(detected);
    
    // Add to alerts with throttling (500ms per type)
    if (detected.length > 0) {
      setAlerts(prev => {
        const newAlerts = detected.filter(d => {
          const lastTime = lastAlertTimeRef.current[d.type] || 0;
          if (timestamp - lastTime > 500) {
            lastAlertTimeRef.current[d.type] = timestamp;
            return true;
          }
          return false;
        });
        return [...prev, ...newAlerts];
      });
    }
  }, [detectCompensations]);

  const resetBaseline = useCallback(() => {
    baselineShoulderYRef.current = null;
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setCurrentCompensations([]);
    lastAlertTimeRef.current = {} as Record<CompensationType, number>;
  }, []);

  const getCompensationLabel = useCallback((type: CompensationType) => {
    return COMPENSATION_LABELS[type] || type;
  }, []);

  return {
    alerts,
    currentCompensations,
    processKeypoints,
    resetBaseline,
    clearAlerts,
    getCompensationLabel,
  };
}
