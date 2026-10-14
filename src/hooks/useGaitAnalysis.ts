import { useState, useCallback, useRef } from 'react';
import { estimateBodyHeight, type Keypoint } from '../utils/poseAnalysis';

export interface GaitPhase {
  type: 'stance' | 'swing';
  side: 'left' | 'right';
  startTime: number;
  endTime: number;
  duration: number;
}

export interface GaitMetrics {
  cadence: number; // steps per minute
  stepLength: number; // average step length in pixels (normalize to real units)
  stanceTime: number; // average stance phase duration (ms)
  swingTime: number; // average swing phase duration (ms)
  symmetry: number; // 0-100% symmetry score
  compensations: string[];
}

export interface GaitCompensation {
  type: 'hip_drop' | 'shoulder_drop' | 'trunk_tilt' | 'arm_swing_asymmetry' | 'forward_head' | 'heel_strike_asymmetry';
  severity: 'mild' | 'moderate' | 'severe';
  side: 'left' | 'right' | 'bilateral';
  timestamp: number;
  value?: number; // The measured value (degrees, pixels, etc.)
}

// Pattern detection thresholds.
// Pixel-based values are ratios of estimated body height so detections
// are independent of camera distance and subject size.
// Angular values (TRUNK_TILT) and ratio values (ARM_SWING, HEEL_STRIKE) are unchanged.
const BASE_BODY_HEIGHT_PX = 400;

const THRESHOLDS = {
  // --- ratios of estimated body height ---
  HIP_DROP_MILD:       0.05,
  HIP_DROP_MODERATE:   0.09,
  HIP_DROP_SEVERE:     0.12,
  SHOULDER_DROP_MILD:  0.04,
  SHOULDER_DROP_MODERATE: 0.07,
  SHOULDER_DROP_SEVERE:   0.10,
  FORWARD_HEAD_MILD:       0.07,
  FORWARD_HEAD_MODERATE:   0.12,
  FORWARD_HEAD_SEVERE:     0.17,
  // --- degrees (no body-height scaling) ---
  TRUNK_TILT_MILD:     5,
  TRUNK_TILT_MODERATE: 10,
  TRUNK_TILT_SEVERE:   15,
  // --- dimensionless ratios (no scaling) ---
  ARM_SWING_ASYMMETRY:   0.25,
  HEEL_STRIKE_ASYMMETRY: 0.15,
};

export interface GaitPatternStatus {
  hipLevelness: { status: 'normal' | 'mild' | 'moderate' | 'severe'; side: 'left' | 'right' | null; value: number };
  shoulderLevelness: { status: 'normal' | 'mild' | 'moderate' | 'severe'; side: 'left' | 'right' | null; value: number };
  trunkTilt: { status: 'normal' | 'mild' | 'moderate' | 'severe'; direction: 'left' | 'right' | null; degrees: number };
  armSwingSymmetry: { status: 'normal' | 'asymmetric'; ratio: number };
  headPosition: { status: 'normal' | 'mild' | 'moderate' | 'severe'; value: number };
  heelStrikeSymmetry: { status: 'normal' | 'asymmetric'; ratio: number };
  currentPhase: { left: 'stance' | 'swing' | null; right: 'stance' | 'swing' | null };
}

// Helper to get keypoint by index (MoveNet/BlazePose standard indices)
const getKeypointByIndex = (keypoints: Keypoint[], index: number): Keypoint | undefined => {
  return keypoints[index];
};

// Keypoint indices (MoveNet standard)
const KP = {
  NOSE: 0,
  LEFT_SHOULDER: 5,
  RIGHT_SHOULDER: 6,
  LEFT_HIP: 11,
  RIGHT_HIP: 12,
  LEFT_KNEE: 13,
  RIGHT_KNEE: 14,
  LEFT_ANKLE: 15,
  RIGHT_ANKLE: 16,
  LEFT_WRIST: 9,
  RIGHT_WRIST: 10,
};

export function useGaitAnalysis(): {
  phases: GaitPhase[];
  metrics: GaitMetrics | null;
  compensations: GaitCompensation[];
  isAnalyzing: boolean;
  patternStatus: GaitPatternStatus | null;
  processKeypoints: (keypoints: Keypoint[], timestamp: number) => void;
  startAnalysis: () => void;
  stopAnalysis: () => void;
  resetAnalysis: () => void;
} {
  const [phases, setPhases] = useState<GaitPhase[]>([]);
  const [metrics, setMetrics] = useState<GaitMetrics | null>(null);
  const [compensations, setCompensations] = useState<GaitCompensation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [patternStatus, setPatternStatus] = useState<GaitPatternStatus | null>(null);

  const previousKeypointsRef = useRef<Keypoint[] | null>(null);
  const leftPhaseRef = useRef<'stance' | 'swing' | null>(null);
  const rightPhaseRef = useRef<'stance' | 'swing' | null>(null);
  const leftPhaseStartRef = useRef<number>(0);
  const rightPhaseStartRef = useRef<number>(0);
  
  // Arm swing tracking
  const leftWristHistoryRef = useRef<{ x: number; time: number }[]>([]);
  const rightWristHistoryRef = useRef<{ x: number; time: number }[]>([]);
  const leftHeelStrikesRef = useRef<number[]>([]);
  const rightHeelStrikesRef = useRef<number[]>([]);

  // Detect phase for each leg independently
  const detectLegPhase = useCallback((
    ankle: Keypoint | undefined,
    hip: Keypoint | undefined,
    otherAnkle: Keypoint | undefined
  ): 'stance' | 'swing' | null => {
    if (!ankle || !hip || ankle.score < 0.3 || hip.score < 0.3) return null;
    
    // In stance: ankle Y is higher (closer to ground in screen coords)
    // In swing: ankle Y is lower (lifted)
    // Also compare with other ankle - the lower ankle (higher Y) is in stance
    if (otherAnkle && otherAnkle.score >= 0.3) {
      return ankle.y > otherAnkle.y ? 'stance' : 'swing';
    }
    
    // Fallback: compare ankle to hip vertical position
    const legLength = ankle.y - hip.y;
    // This is simplified - would need baseline calibration
    return legLength > 0 ? 'stance' : 'swing';
  }, []);

  // Analyze all gait patterns from current keypoints
  const analyzePatterns = useCallback((keypoints: Keypoint[], timestamp: number): GaitPatternStatus => {
    // Scale pixel-based thresholds by estimated body height.
    const bodyHeight = estimateBodyHeight(keypoints) ?? BASE_BODY_HEIGHT_PX;
    const px = (ratio: number): number => ratio * bodyHeight;

    const leftHip = getKeypointByIndex(keypoints, KP.LEFT_HIP);
    const rightHip = getKeypointByIndex(keypoints, KP.RIGHT_HIP);
    const leftShoulder = getKeypointByIndex(keypoints, KP.LEFT_SHOULDER);
    const rightShoulder = getKeypointByIndex(keypoints, KP.RIGHT_SHOULDER);
    const nose = getKeypointByIndex(keypoints, KP.NOSE);
    const leftWrist = getKeypointByIndex(keypoints, KP.LEFT_WRIST);
    const rightWrist = getKeypointByIndex(keypoints, KP.RIGHT_WRIST);
    const leftAnkle = getKeypointByIndex(keypoints, KP.LEFT_ANKLE);
    const rightAnkle = getKeypointByIndex(keypoints, KP.RIGHT_ANKLE);

    // 1. Hip Levelness
    let hipLevelness: GaitPatternStatus['hipLevelness'] = { status: 'normal', side: null, value: 0 };
    if (leftHip && rightHip && leftHip.score >= 0.3 && rightHip.score >= 0.3) {
      const hipDiff = Math.abs(leftHip.y - rightHip.y);
      hipLevelness.value = hipDiff;
      hipLevelness.side = leftHip.y > rightHip.y ? 'left' : 'right';
      if (hipDiff >= px(THRESHOLDS.HIP_DROP_SEVERE))   hipLevelness.status = 'severe';
      else if (hipDiff >= px(THRESHOLDS.HIP_DROP_MODERATE)) hipLevelness.status = 'moderate';
      else if (hipDiff >= px(THRESHOLDS.HIP_DROP_MILD))     hipLevelness.status = 'mild';
      else hipLevelness.side = null;
    }

    // 2. Shoulder Levelness
    let shoulderLevelness: GaitPatternStatus['shoulderLevelness'] = { status: 'normal', side: null, value: 0 };
    if (leftShoulder && rightShoulder && leftShoulder.score >= 0.3 && rightShoulder.score >= 0.3) {
      const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
      shoulderLevelness.value = shoulderDiff;
      shoulderLevelness.side = leftShoulder.y > rightShoulder.y ? 'left' : 'right';
      if (shoulderDiff >= px(THRESHOLDS.SHOULDER_DROP_SEVERE))   shoulderLevelness.status = 'severe';
      else if (shoulderDiff >= px(THRESHOLDS.SHOULDER_DROP_MODERATE)) shoulderLevelness.status = 'moderate';
      else if (shoulderDiff >= px(THRESHOLDS.SHOULDER_DROP_MILD))     shoulderLevelness.status = 'mild';
      else shoulderLevelness.side = null;
    }

    // 3. Trunk Side Tilt — angular, no body-height scaling
    let trunkTilt: GaitPatternStatus['trunkTilt'] = { status: 'normal', direction: null, degrees: 0 };
    if (leftShoulder && rightShoulder && leftHip && rightHip &&
        leftShoulder.score >= 0.3 && rightShoulder.score >= 0.3 &&
        leftHip.score >= 0.3 && rightHip.score >= 0.3) {
      const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
      const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
      const hipMidX = (leftHip.x + rightHip.x) / 2;
      const hipMidY = (leftHip.y + rightHip.y) / 2;

      const dx = shoulderMidX - hipMidX;
      const dy = shoulderMidY - hipMidY;
      const angleRad = Math.atan2(dx, -dy); // negative dy because Y increases downward
      const angleDeg = Math.abs(angleRad * (180 / Math.PI));

      trunkTilt.degrees = angleDeg;
      trunkTilt.direction = dx > 0 ? 'right' : 'left';
      if (angleDeg >= THRESHOLDS.TRUNK_TILT_SEVERE)        trunkTilt.status = 'severe';
      else if (angleDeg >= THRESHOLDS.TRUNK_TILT_MODERATE) trunkTilt.status = 'moderate';
      else if (angleDeg >= THRESHOLDS.TRUNK_TILT_MILD)     trunkTilt.status = 'mild';
      else trunkTilt.direction = null;
    }

    // 4. Arm Swing Symmetry — ratio-based, no body-height scaling
    let armSwingSymmetry: GaitPatternStatus['armSwingSymmetry'] = { status: 'normal', ratio: 1.0 };
    if (leftWrist && rightWrist && leftWrist.score >= 0.3 && rightWrist.score >= 0.3) {
      leftWristHistoryRef.current.push({ x: leftWrist.x, time: timestamp });
      rightWristHistoryRef.current.push({ x: rightWrist.x, time: timestamp });

      const cutoffTime = timestamp - 2000;
      leftWristHistoryRef.current  = leftWristHistoryRef.current.filter(p => p.time >= cutoffTime);
      rightWristHistoryRef.current = rightWristHistoryRef.current.filter(p => p.time >= cutoffTime);

      if (leftWristHistoryRef.current.length > 10 && rightWristHistoryRef.current.length > 10) {
        const leftXs  = leftWristHistoryRef.current.map(p => p.x);
        const rightXs = rightWristHistoryRef.current.map(p => p.x);
        const leftAmplitude  = Math.max(...leftXs)  - Math.min(...leftXs);
        const rightAmplitude = Math.max(...rightXs) - Math.min(...rightXs);

        const maxAmp = Math.max(leftAmplitude, rightAmplitude, 1);
        const minAmp = Math.min(leftAmplitude, rightAmplitude);
        armSwingSymmetry.ratio = minAmp / maxAmp;

        if (Math.abs(1 - armSwingSymmetry.ratio) > THRESHOLDS.ARM_SWING_ASYMMETRY) {
          armSwingSymmetry.status = 'asymmetric';
        }
      }
    }

    // 5. Head/Neck Position (forward head)
    let headPosition: GaitPatternStatus['headPosition'] = { status: 'normal', value: 0 };
    if (nose && leftShoulder && rightShoulder &&
        nose.score >= 0.3 && leftShoulder.score >= 0.3 && rightShoulder.score >= 0.3) {
      const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
      const forwardDistance = nose.x - shoulderMidX; // positive = forward (assuming facing right)
      headPosition.value = Math.abs(forwardDistance);

      if (headPosition.value >= px(THRESHOLDS.FORWARD_HEAD_SEVERE))        headPosition.status = 'severe';
      else if (headPosition.value >= px(THRESHOLDS.FORWARD_HEAD_MODERATE)) headPosition.status = 'moderate';
      else if (headPosition.value >= px(THRESHOLDS.FORWARD_HEAD_MILD))     headPosition.status = 'mild';
    }

    // 6. Heel Strike Symmetry (timing between left and right heel strikes)
    let heelStrikeSymmetry: GaitPatternStatus['heelStrikeSymmetry'] = { status: 'normal', ratio: 1.0 };
    // Detect heel strikes (ankle Y suddenly increases = foot hits ground)
    const prevKeypoints = previousKeypointsRef.current;
    if (prevKeypoints && leftAnkle && rightAnkle) {
      const prevLeftAnkle = getKeypointByIndex(prevKeypoints, KP.LEFT_ANKLE);
      const prevRightAnkle = getKeypointByIndex(prevKeypoints, KP.RIGHT_ANKLE);
      
      // Detect heel strike: ankle was moving down (Y increasing) and velocity is high
      if (prevLeftAnkle && prevLeftAnkle.score >= 0.3 && leftAnkle.score >= 0.3) {
        const leftVelocity = leftAnkle.y - prevLeftAnkle.y;
        if (leftVelocity > 5) { // threshold for downward movement
          leftHeelStrikesRef.current.push(timestamp);
        }
      }
      if (prevRightAnkle && prevRightAnkle.score >= 0.3 && rightAnkle.score >= 0.3) {
        const rightVelocity = rightAnkle.y - prevRightAnkle.y;
        if (rightVelocity > 5) {
          rightHeelStrikesRef.current.push(timestamp);
        }
      }
      
      // Keep last 5 seconds
      const strikeCutoff = timestamp - 5000;
      leftHeelStrikesRef.current = leftHeelStrikesRef.current.filter(t => t >= strikeCutoff);
      rightHeelStrikesRef.current = rightHeelStrikesRef.current.filter(t => t >= strikeCutoff);
      
      // Calculate average interval for each side
      if (leftHeelStrikesRef.current.length >= 2 && rightHeelStrikesRef.current.length >= 2) {
        const leftIntervals: number[] = [];
        const rightIntervals: number[] = [];
        
        for (let i = 1; i < leftHeelStrikesRef.current.length; i++) {
          leftIntervals.push(leftHeelStrikesRef.current[i] - leftHeelStrikesRef.current[i - 1]);
        }
        for (let i = 1; i < rightHeelStrikesRef.current.length; i++) {
          rightIntervals.push(rightHeelStrikesRef.current[i] - rightHeelStrikesRef.current[i - 1]);
        }
        
        const leftAvg = leftIntervals.reduce((a, b) => a + b, 0) / leftIntervals.length;
        const rightAvg = rightIntervals.reduce((a, b) => a + b, 0) / rightIntervals.length;
        const maxAvg = Math.max(leftAvg, rightAvg, 1);
        const minAvg = Math.min(leftAvg, rightAvg);
        
        heelStrikeSymmetry.ratio = minAvg / maxAvg;
        if (Math.abs(1 - heelStrikeSymmetry.ratio) > THRESHOLDS.HEEL_STRIKE_ASYMMETRY) {
          heelStrikeSymmetry.status = 'asymmetric';
        }
      }
    }

    // 7. Current Gait Phase
    const leftPhase = detectLegPhase(leftAnkle, leftHip, rightAnkle);
    const rightPhase = detectLegPhase(rightAnkle, rightHip, leftAnkle);

    return {
      hipLevelness,
      shoulderLevelness,
      trunkTilt,
      armSwingSymmetry,
      headPosition,
      heelStrikeSymmetry,
      currentPhase: { left: leftPhase, right: rightPhase },
    };
  }, [detectLegPhase]);

  // Convert pattern status to compensations for legacy API
  const patternStatusToCompensations = useCallback((
    status: GaitPatternStatus,
    timestamp: number
  ): GaitCompensation[] => {
    const detected: GaitCompensation[] = [];

    if (status.hipLevelness.status !== 'normal') {
      detected.push({
        type: 'hip_drop',
        severity: status.hipLevelness.status,
        side: status.hipLevelness.side || 'bilateral',
        timestamp,
        value: status.hipLevelness.value,
      });
    }

    if (status.shoulderLevelness.status !== 'normal') {
      detected.push({
        type: 'shoulder_drop',
        severity: status.shoulderLevelness.status,
        side: status.shoulderLevelness.side || 'bilateral',
        timestamp,
        value: status.shoulderLevelness.value,
      });
    }

    if (status.trunkTilt.status !== 'normal') {
      detected.push({
        type: 'trunk_tilt',
        severity: status.trunkTilt.status,
        side: status.trunkTilt.direction || 'bilateral',
        timestamp,
        value: status.trunkTilt.degrees,
      });
    }

    if (status.armSwingSymmetry.status === 'asymmetric') {
      detected.push({
        type: 'arm_swing_asymmetry',
        severity: 'mild',
        side: 'bilateral',
        timestamp,
        value: status.armSwingSymmetry.ratio,
      });
    }

    if (status.headPosition.status !== 'normal') {
      detected.push({
        type: 'forward_head',
        severity: status.headPosition.status,
        side: 'bilateral',
        timestamp,
        value: status.headPosition.value,
      });
    }

    if (status.heelStrikeSymmetry.status === 'asymmetric') {
      detected.push({
        type: 'heel_strike_asymmetry',
        severity: 'mild',
        side: 'bilateral',
        timestamp,
        value: status.heelStrikeSymmetry.ratio,
      });
    }

    return detected;
  }, []);

  // Process keypoints from pose detection
  const processKeypoints = useCallback((
    keypoints: Keypoint[],
    timestamp: number
  ) => {
    if (!keypoints || keypoints.length === 0) return;

    // Analyze all patterns
    const status = analyzePatterns(keypoints, timestamp);
    setPatternStatus(status);

    // Track phase changes for left leg
    // Cap to avoid unbounded memory growth on long recordings
    const MAX_PHASES       = 200;
    const MAX_COMPENSATIONS = 200;

    if (status.currentPhase.left && status.currentPhase.left !== leftPhaseRef.current) {
      if (leftPhaseRef.current && leftPhaseStartRef.current > 0) {
        const phaseDuration = timestamp - leftPhaseStartRef.current;
        setPhases(prev => {
          const next = [...prev, {
            type: leftPhaseRef.current!,
            side: 'left' as const,
            startTime: leftPhaseStartRef.current,
            endTime: timestamp,
            duration: phaseDuration,
          }];
          return next.length > MAX_PHASES ? next.slice(-MAX_PHASES) : next;
        });
      }
      leftPhaseRef.current = status.currentPhase.left;
      leftPhaseStartRef.current = timestamp;
    }

    // Track phase changes for right leg
    if (status.currentPhase.right && status.currentPhase.right !== rightPhaseRef.current) {
      if (rightPhaseRef.current && rightPhaseStartRef.current > 0) {
        const phaseDuration = timestamp - rightPhaseStartRef.current;
        setPhases(prev => {
          const next = [...prev, {
            type: rightPhaseRef.current!,
            side: 'right' as const,
            startTime: rightPhaseStartRef.current,
            endTime: timestamp,
            duration: phaseDuration,
          }];
          return next.length > MAX_PHASES ? next.slice(-MAX_PHASES) : next;
        });
      }
      rightPhaseRef.current = status.currentPhase.right;
      rightPhaseStartRef.current = timestamp;
    }

    // Detect and record compensations (only significant changes)
    const newCompensations = patternStatusToCompensations(status, timestamp);
    if (newCompensations.length > 0) {
      // Throttle: only add if last compensation of same type was > 500ms ago
      setCompensations(prev => {
        const filtered = newCompensations.filter(nc => {
          const lastOfType = prev.filter(p => p.type === nc.type).pop();
          return !lastOfType || (timestamp - lastOfType.timestamp) > 500;
        });
        const next = [...prev, ...filtered];
        return next.length > MAX_COMPENSATIONS ? next.slice(-MAX_COMPENSATIONS) : next;
      });
    }

    previousKeypointsRef.current = keypoints;
  }, [analyzePatterns, patternStatusToCompensations]);

  // Calculate gait metrics from phases
  const calculateMetrics = useCallback((): GaitMetrics | null => {
    if (phases.length < 4) return null;

    const leftStancePhases = phases.filter(p => p.type === 'stance' && p.side === 'left');
    const rightStancePhases = phases.filter(p => p.type === 'stance' && p.side === 'right');
    const leftSwingPhases = phases.filter(p => p.type === 'swing' && p.side === 'left');
    const rightSwingPhases = phases.filter(p => p.type === 'swing' && p.side === 'right');

    const allStance = [...leftStancePhases, ...rightStancePhases];
    const allSwing = [...leftSwingPhases, ...rightSwingPhases];

    if (allStance.length === 0 || allSwing.length === 0) return null;

    const avgStanceTime = allStance.reduce((sum, p) => sum + p.duration, 0) / allStance.length;
    const avgSwingTime = allSwing.reduce((sum, p) => sum + p.duration, 0) / allSwing.length;

    // Calculate cadence
    const totalTime = phases.reduce((sum, p) => sum + p.duration, 0);
    const cycles = phases.length / 4; // 4 phases per full gait cycle (2 legs x 2 phases)
    const cadence = cycles > 0 ? (cycles / (totalTime / 1000)) * 60 * 2 : 0; // *2 for steps per minute

    // Step length placeholder (needs spatial calibration)
    const stepLength = 0;

    // Calculate symmetry between left and right stance times
    let symmetry = 100;
    if (leftStancePhases.length > 0 && rightStancePhases.length > 0) {
      const leftAvg = leftStancePhases.reduce((sum, p) => sum + p.duration, 0) / leftStancePhases.length;
      const rightAvg = rightStancePhases.reduce((sum, p) => sum + p.duration, 0) / rightStancePhases.length;
      const difference = Math.abs(leftAvg - rightAvg);
      const avg = (leftAvg + rightAvg) / 2;
      symmetry = avg > 0 ? Math.max(0, 100 - (difference / avg) * 100) : 100;
    }

    // Get unique compensation types
    const compensationTypes = Array.from(new Set(compensations.map(c => c.type)));

    return {
      cadence: Math.round(cadence),
      stepLength,
      stanceTime: Math.round(avgStanceTime),
      swingTime: Math.round(avgSwingTime),
      symmetry: Math.round(symmetry),
      compensations: compensationTypes,
    };
  }, [phases, compensations]);

  // Start analysis
  const startAnalysis = useCallback(() => {
    setIsAnalyzing(true);
    setPhases([]);
    setCompensations([]);
    setMetrics(null);
    setPatternStatus(null);
    leftPhaseRef.current = null;
    rightPhaseRef.current = null;
    leftPhaseStartRef.current = 0;
    rightPhaseStartRef.current = 0;
    leftWristHistoryRef.current = [];
    rightWristHistoryRef.current = [];
    leftHeelStrikesRef.current = [];
    rightHeelStrikesRef.current = [];
    previousKeypointsRef.current = null;
  }, []);

  // Stop analysis and calculate final metrics
  const stopAnalysis = useCallback(() => {
    setIsAnalyzing(false);
    const finalMetrics = calculateMetrics();
    setMetrics(finalMetrics);
  }, [calculateMetrics]);

  // Reset analysis
  const resetAnalysis = useCallback(() => {
    setIsAnalyzing(false);
    setPhases([]);
    setCompensations([]);
    setMetrics(null);
    setPatternStatus(null);
    leftPhaseRef.current = null;
    rightPhaseRef.current = null;
    leftPhaseStartRef.current = 0;
    rightPhaseStartRef.current = 0;
    leftWristHistoryRef.current = [];
    rightWristHistoryRef.current = [];
    leftHeelStrikesRef.current = [];
    rightHeelStrikesRef.current = [];
    previousKeypointsRef.current = null;
  }, []);

  return {
    phases,
    metrics,
    compensations,
    isAnalyzing,
    patternStatus,
    processKeypoints,
    startAnalysis,
    stopAnalysis,
    resetAnalysis,
  };
}

