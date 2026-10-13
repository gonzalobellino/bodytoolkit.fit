// Pose analysis utilities for calculating angles and detecting movement patterns

export interface Keypoint {
  x: number;
  y: number;
  score: number;
  name?: string;
}

export interface Keypoint3D extends Keypoint {
  z?: number;
}

export type CameraOrientation =
  | 'lateral-left'   // subject faces left, camera on subject's right
  | 'lateral-right'  // subject faces right, camera on subject's left
  | 'frontal'        // subject faces camera
  | 'overhead'       // camera from above
  | 'unknown';       // insufficient data or low confidence

export interface CameraOrientationResult {
  orientation: CameraOrientation;
  /** 0–1 confidence in the classification */
  confidence: number;
}

/**
 * Detect camera orientation from BlazePose 3D keypoints.
 *
 * BlazePose 3D uses a normalized body-space coordinate system where:
 *   X  — subject's right (positive) / left (negative)
 *   Y  — down (positive)
 *   Z  — forward from the camera (positive toward camera)
 *
 * The depth of left vs right shoulders in Z tells us the viewing angle:
 *   • Both shoulders at similar Z → frontal view
 *   • One shoulder significantly closer → lateral view
 *
 * Falls back to a 2D heuristic (shoulder span / torso height) when
 * 3D keypoints are unavailable (MoveNet) or low confidence.
 *
 * @param keypoints3D  BlazePose keypoints3D array (normalized body-space)
 * @param keypoints2D  Fallback 2D pixel keypoints (for MoveNet / low confidence)
 */
export function computeCameraOrientation(
  keypoints3D: Keypoint3D[],
  keypoints2D?: Keypoint[],
): CameraOrientationResult {
  // --- Try 3D path first ---
  if (keypoints3D.length > 0) {
    const get3D = (name: string): Keypoint3D | null =>
      keypoints3D.find(kp => kp.name?.toLowerCase().includes(name.toLowerCase())) ?? null;

    const lShoulder3D = get3D('left_shoulder');
    const rShoulder3D = get3D('right_shoulder');
    const lHip3D      = get3D('left_hip');
    const rHip3D      = get3D('right_hip');

    const MIN_SCORE = 0.3;
    const has3D = (kp: Keypoint3D | null): kp is Keypoint3D =>
      kp !== null && kp.score >= MIN_SCORE && kp.z !== undefined;

    if (has3D(lShoulder3D) && has3D(rShoulder3D)) {
      const lZ = lShoulder3D.z!;
      const rZ = rShoulder3D.z!;
      const deltaZ = lZ - rZ; // positive → left shoulder closer to camera

      // Overhead detection: both hips and shoulders at nearly the same Y-depth
      if (has3D(lHip3D) && has3D(rHip3D)) {
        const shoulderY = (lShoulder3D.y + rShoulder3D.y) / 2;
        const hipY      = (lHip3D.y      + rHip3D.y)      / 2;
        if (Math.abs(shoulderY - hipY) < 0.15) {
          return { orientation: 'overhead', confidence: 0.75 };
        }
      }

      const absDeltaZ = Math.abs(deltaZ);
      if (absDeltaZ < 0.15) {
        // Shoulders at similar depth → frontal
        const confidence = Math.min(1, (0.15 - absDeltaZ) / 0.15 * 0.85 + 0.15);
        return { orientation: 'frontal', confidence };
      }

      // One shoulder significantly closer → lateral
      const confidence = Math.min(1, absDeltaZ * 2.5);
      // deltaZ > 0 → left shoulder closer → camera is on the left side → lateral-left
      return {
        orientation: deltaZ > 0 ? 'lateral-left' : 'lateral-right',
        confidence,
      };
    }
  }

  // --- 2D fallback (MoveNet or low-confidence 3D) ---
  if (keypoints2D && keypoints2D.length > 0) {
    const get2D = (name: string): Keypoint | null =>
      findKeypoint(keypoints2D, name);

    const lShoulder = get2D('left_shoulder');
    const rShoulder = get2D('right_shoulder');
    const lHip      = get2D('left_hip');
    const rHip      = get2D('right_hip');

    const MIN_SCORE_2D = 0.3;
    const ok = (kp: Keypoint | null): kp is Keypoint => kp !== null && kp.score >= MIN_SCORE_2D;

    if (ok(lShoulder) && ok(rShoulder) && ok(lHip) && ok(rHip)) {
      const shoulderSpan = Math.abs(lShoulder.x - rShoulder.x);
      const torsoHeight  = Math.abs(
        ((lShoulder.y + rShoulder.y) / 2) - ((lHip.y + rHip.y) / 2)
      );
      if (torsoHeight < 5) return { orientation: 'unknown', confidence: 0 };

      // In a lateral view the shoulder span collapses; in frontal it's wide.
      // Empirically: span/torso < 0.35 → lateral, > 0.65 → frontal
      const ratio = shoulderSpan / torsoHeight;
      if (ratio < 0.35) {
        return { orientation: 'lateral-left', confidence: 0.5 }; // side unknown from 2D
      }
      if (ratio > 0.65) {
        return { orientation: 'frontal', confidence: 0.55 };
      }
    }
  }

  return { orientation: 'unknown', confidence: 0 };
}

export interface AngleMeasurement {
  angle: number; // in degrees
  point1: Keypoint;
  point2: Keypoint; // vertex
  point3: Keypoint;
}

export interface PatternAlert {
  type: 'knee_valgus' | 'forward_head' | 'rounded_shoulders' | 'anterior_pelvic_tilt' | 'lateral_shift';
  severity: 'mild' | 'moderate' | 'severe';
  message: string;
  confidence: number; // 0-1
}

// Calculate angle between three points (p1-p2-p3)
export function calculateAngle(p1: Keypoint, p2: Keypoint, p3: Keypoint): number {
  const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
  const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
  let angle = Math.abs((angle2 - angle1) * (180 / Math.PI));
  if (angle > 180) angle = 360 - angle;
  return Math.round(angle);
}

// Get keypoint by name (common names for MoveNet and BlazePose)
export function findKeypoint(keypoints: Keypoint[], name: string): Keypoint | null {
  return keypoints.find(kp => 
    kp.name?.toLowerCase().includes(name.toLowerCase())
  ) ?? null;
}

// Calculate knee angle (used to detect knee valgus/varus)
export function calculateKneeAngle(
  hip: Keypoint | null,
  knee: Keypoint | null,
  ankle: Keypoint | null
): AngleMeasurement | null {
  if (!hip || !knee || !ankle) return null;

  const angle = calculateAngle(hip, knee, ankle);
  
  return {
    angle,
    point1: hip,
    point2: knee,
    point3: ankle,
  };
}

// Detect knee valgus (knees caving in)
export function detectKneeValgus(
  leftKneeAngle: AngleMeasurement | null,
  rightKneeAngle: AngleMeasurement | null,
  threshold: number = 10 // degrees deviation from normal (170-180°)
): PatternAlert | null {
  if (!leftKneeAngle && !rightKneeAngle) return null;

  const angles = [leftKneeAngle, rightKneeAngle].filter(Boolean) as AngleMeasurement[];
  const avgAngle = angles.reduce((sum, a) => sum + a.angle, 0) / angles.length;

  // Normal knee angle is typically 170-180° in a squat
  // Lower angles suggest valgus
  if (avgAngle < 170 - threshold) {
    const deviation = 170 - avgAngle;
    const severity = deviation > 20 ? 'severe' : deviation > 10 ? 'moderate' : 'mild';
    
    return {
      type: 'knee_valgus',
      severity,
      message: `Knee valgus detected: ${Math.round(avgAngle)}° (normal: ~175°)`,
      confidence: Math.min(1, deviation / 30),
    };
  }

  return null;
}

// Detect forward head posture
export function detectForwardHead(
  nose: Keypoint | null,
  ear: Keypoint | null,
  shoulder: Keypoint | null,
  threshold: number = 0.05, // normalized distance threshold (fraction of frame width)
  frameWidth?: number // pixel width of the video frame — required to normalize pixel coords
): PatternAlert | null {
  if (!nose || !ear || !shoulder) return null;

  // Calculate horizontal offset of head relative to shoulder.
  const headX = (nose.x + ear.x) / 2;
  const rawOffset = headX - shoulder.x;

  // Keypoints from analyzePose are in pixels. Normalize by frame width so that the
  // threshold (0.05 = 5% of frame width) is in the same units (BUG-09).
  const offset = frameWidth ? rawOffset / frameWidth : rawOffset;

  if (offset > threshold) {
    const severity = offset > 0.15 ? 'severe' : offset > 0.1 ? 'moderate' : 'mild';

    return {
      type: 'forward_head',
      severity,
      message: `Forward head posture detected`,
      confidence: Math.min(1, offset / 0.2),
    };
  }

  return null;
}

// Detect rounded shoulders
export function detectRoundedShoulders(
  leftShoulder: Keypoint | null,
  rightShoulder: Keypoint | null,
  leftElbow: Keypoint | null,
  rightElbow: Keypoint | null
): PatternAlert | null {
  if (!leftShoulder || !rightShoulder) return null;

  // Calculate shoulder angle
  // Rounded shoulders show when shoulder-elbow line is rotated forward
  let hasRoundedShoulders = false;
  let confidence = 0;

  if (leftElbow && leftShoulder) {
    const shoulderAngle = Math.atan2(
      leftElbow.y - leftShoulder.y,
      leftElbow.x - leftShoulder.x
    ) * (180 / Math.PI);
    // Normal: ~0-30°, Rounded: >30°
    if (shoulderAngle > 30) {
      hasRoundedShoulders = true;
      confidence = Math.min(1, (shoulderAngle - 30) / 60);
    }
  }

  if (rightElbow && rightShoulder) {
    const shoulderAngle = Math.atan2(
      rightElbow.y - rightShoulder.y,
      rightElbow.x - rightShoulder.x
    ) * (180 / Math.PI);
    if (shoulderAngle > 30) {
      hasRoundedShoulders = true;
      confidence = Math.max(confidence, Math.min(1, (shoulderAngle - 30) / 60));
    }
  }

  if (hasRoundedShoulders) {
    const severity = confidence > 0.7 ? 'severe' : confidence > 0.4 ? 'moderate' : 'mild';
    
    return {
      type: 'rounded_shoulders',
      severity,
      message: `Rounded shoulders detected`,
      confidence,
    };
  }

  return null;
}

// Detect anterior pelvic tilt (pelvis tilted forward)
export function detectAnteriorPelvicTilt(
  leftHip: Keypoint | null,
  rightHip: Keypoint | null,
  leftShoulder: Keypoint | null,
  rightShoulder: Keypoint | null,
  leftKnee: Keypoint | null,
  threshold: number = 10 // degrees deviation from neutral
): PatternAlert | null {
  if (!leftHip && !rightHip) return null;
  if (!leftShoulder && !rightShoulder) return null;

  const hip = leftHip ?? rightHip;
  const shoulder = leftShoulder ?? rightShoulder;

  if (!hip || !shoulder) return null;

  // Calculate hip-to-shoulder angle in the sagittal plane.
  // Anterior tilt: hip is forward (positive X offset) relative to shoulder.
  const hipToShoulderAngle = Math.atan2(
    shoulder.y - hip.y,
    shoulder.x - hip.x
  ) * (180 / Math.PI);

  // Use the absolute angle so both anterior (positive) and posterior (negative)
  // tilts are detected. The unused `verticalAngle` variable was the intended check
  // but was never used in the condition — that was the bug (BUG-08).
  const verticalAngle = Math.abs(hipToShoulderAngle);

  // leftKnee is available for future refinement (e.g. hip-knee sagittal alignment)
  // but is not yet incorporated into the scalar angle above.
  void leftKnee;

  if (verticalAngle > threshold) {
    const deviation = verticalAngle - threshold;
    const severity = deviation > 20 ? 'severe' : deviation > 10 ? 'moderate' : 'mild';
    const direction = hipToShoulderAngle > 0 ? 'Anterior' : 'Posterior';

    return {
      type: 'anterior_pelvic_tilt',
      severity,
      message: `${direction} pelvic tilt detected: ${Math.round(verticalAngle)}° from vertical`,
      confidence: Math.min(1, deviation / 30),
    };
  }

  return null;
}

// Detect lateral shift (body shifting to one side)
export function detectLateralShift(
  leftHip: Keypoint | null,
  rightHip: Keypoint | null,
  leftShoulder: Keypoint | null,
  rightShoulder: Keypoint | null,
  frameWidth?: number,
  threshold: number = 0.05 // 5% of frame width
): PatternAlert | null {
  if (!leftHip || !rightHip || !leftShoulder || !rightShoulder) return null;

  // Calculate center points
  const hipCenterX = (leftHip.x + rightHip.x) / 2;
  const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
  
  // Calculate lateral shift as offset between hip and shoulder centers
  const lateralShift = Math.abs(hipCenterX - shoulderCenterX);
  
  // Normalize by frame width if available, otherwise use absolute pixel difference
  const normalizedShift = frameWidth ? lateralShift / frameWidth : lateralShift / 1000; // fallback normalization
  
  if (normalizedShift > threshold) {
    const deviation = normalizedShift - threshold;
    const severity = deviation > 0.1 ? 'severe' : deviation > 0.05 ? 'moderate' : 'mild';
    const direction = hipCenterX > shoulderCenterX ? 'right' : 'left';
    
    return {
      type: 'lateral_shift',
      severity,
      message: `Lateral shift detected: ${direction} shift (${(normalizedShift * 100).toFixed(1)}% of frame width)`,
      confidence: Math.min(1, deviation / 0.15),
    };
  }

  return null;
}

// Default thresholds for pattern detection
export const DEFAULT_PATTERN_THRESHOLDS = {
  kneeValgus: 10, // degrees deviation from normal
  forwardHead: 0.05, // normalized distance threshold
  anteriorPelvicTilt: 10, // degrees deviation from neutral
  lateralShift: 0.05, // 5% of frame width
} as const;

// Analyze pose and detect all patterns
export function analyzePose(
  keypoints: Keypoint[],
  thresholds?: Partial<typeof DEFAULT_PATTERN_THRESHOLDS>,
  frameWidth?: number // pixel width of the video frame — used to normalize forward-head offset
): PatternAlert[] {
  const alerts: PatternAlert[] = [];

  // Keypoint mappings (adjust based on your model)
  const leftHip = findKeypoint(keypoints, 'left_hip') ?? findKeypoint(keypoints, 'hip_left');
  const rightHip = findKeypoint(keypoints, 'right_hip') ?? findKeypoint(keypoints, 'hip_right');
  const leftKnee = findKeypoint(keypoints, 'left_knee') ?? findKeypoint(keypoints, 'knee_left');
  const rightKnee = findKeypoint(keypoints, 'right_knee') ?? findKeypoint(keypoints, 'knee_right');
  const leftAnkle = findKeypoint(keypoints, 'left_ankle') ?? findKeypoint(keypoints, 'ankle_left');
  const rightAnkle = findKeypoint(keypoints, 'right_ankle') ?? findKeypoint(keypoints, 'ankle_right');
  const leftShoulder = findKeypoint(keypoints, 'left_shoulder') ?? findKeypoint(keypoints, 'shoulder_left');
  const rightShoulder = findKeypoint(keypoints, 'right_shoulder') ?? findKeypoint(keypoints, 'shoulder_right');
  const leftElbow = findKeypoint(keypoints, 'left_elbow') ?? findKeypoint(keypoints, 'elbow_left');
  const rightElbow = findKeypoint(keypoints, 'right_elbow') ?? findKeypoint(keypoints, 'elbow_right');
  const nose = findKeypoint(keypoints, 'nose');
  const leftEar = findKeypoint(keypoints, 'left_ear') ?? findKeypoint(keypoints, 'ear_left');
  const rightEar = findKeypoint(keypoints, 'right_ear') ?? findKeypoint(keypoints, 'ear_right');

  // Use provided thresholds or defaults
  const config = { ...DEFAULT_PATTERN_THRESHOLDS, ...thresholds };

  // Detect knee valgus
  const leftKneeAngle = calculateKneeAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = calculateKneeAngle(rightHip, rightKnee, rightAnkle);
  const kneeValgusAlert = detectKneeValgus(leftKneeAngle, rightKneeAngle, config.kneeValgus);
  if (kneeValgusAlert) alerts.push(kneeValgusAlert);

  // Detect forward head
  const forwardHeadAlert = detectForwardHead(
    nose,
    leftEar ?? rightEar,
    leftShoulder ?? rightShoulder,
    config.forwardHead,
    frameWidth
  );
  if (forwardHeadAlert) alerts.push(forwardHeadAlert);

  // Detect rounded shoulders
  const roundedShouldersAlert = detectRoundedShoulders(
    leftShoulder,
    rightShoulder,
    leftElbow,
    rightElbow
  );
  if (roundedShouldersAlert) alerts.push(roundedShouldersAlert);

  // Detect anterior pelvic tilt
  const anteriorPelvicTiltAlert = detectAnteriorPelvicTilt(
    leftHip,
    rightHip,
    leftShoulder,
    rightShoulder,
    leftKnee,
    config.anteriorPelvicTilt
  );
  if (anteriorPelvicTiltAlert) alerts.push(anteriorPelvicTiltAlert);

  // Detect lateral shift
  // Note: frameWidth would need to be passed as parameter if available
  const lateralShiftAlert = detectLateralShift(
    leftHip,
    rightHip,
    leftShoulder,
    rightShoulder,
    undefined, // frameWidth not available here
    config.lateralShift
  );
  if (lateralShiftAlert) alerts.push(lateralShiftAlert);

  return alerts;
}

/**
 * Estimate body height in pixels from keypoints.
 * Uses torso + femur + tibia segment lengths when available,
 * falls back to shoulder-to-ankle Y span.
 * Returns null if insufficient keypoints are visible.
 */
export function estimateBodyHeight(keypoints: Keypoint[]): number | null {
  const get = (name: string) => findKeypoint(keypoints, name);

  const leftShoulder  = get('left_shoulder');
  const rightShoulder = get('right_shoulder');
  const leftHip       = get('left_hip');
  const rightHip      = get('right_hip');
  const leftKnee      = get('left_knee');
  const rightKnee     = get('right_knee');
  const leftAnkle     = get('left_ankle');
  const rightAnkle    = get('right_ankle');

  const segLen = (a: Keypoint | null, b: Keypoint | null) =>
    a && b && a.score > 0.3 && b.score > 0.3
      ? Math.hypot(a.x - b.x, a.y - b.y)
      : null;

  // Require ALL three segments to be visible before summing, so a single visible
  // segment doesn't produce a misleadingly small body-height estimate (BUG-04).
  const leftTorsoSeg = segLen(leftShoulder, leftHip);
  const leftFemurSeg = segLen(leftHip, leftKnee);
  const leftTibiaSeg = segLen(leftKnee, leftAnkle);
  const leftTotal = leftTorsoSeg !== null && leftFemurSeg !== null && leftTibiaSeg !== null
    ? leftTorsoSeg + leftFemurSeg + leftTibiaSeg
    : null;

  const rightTorsoSeg = segLen(rightShoulder, rightHip);
  const rightFemurSeg = segLen(rightHip, rightKnee);
  const rightTibiaSeg = segLen(rightKnee, rightAnkle);
  const rightTotal = rightTorsoSeg !== null && rightFemurSeg !== null && rightTibiaSeg !== null
    ? rightTorsoSeg + rightFemurSeg + rightTibiaSeg
    : null;

  if (leftTotal !== null && rightTotal !== null) return (leftTotal + rightTotal) / 2;
  if (leftTotal !== null) return leftTotal;
  if (rightTotal !== null) return rightTotal;

  // Fallback: shoulder-to-ankle Y span
  const shoulders = [leftShoulder, rightShoulder].filter((kp): kp is Keypoint => !!kp && kp.score > 0.3);
  const ankles    = [leftAnkle,    rightAnkle   ].filter((kp): kp is Keypoint => !!kp && kp.score > 0.3);
  if (!shoulders.length || !ankles.length) return null;

  const topY    = Math.min(...shoulders.map(kp => kp.y));
  const bottomY = Math.max(...ankles.map(kp => kp.y));
  const span    = Math.abs(bottomY - topY);
  return span > 0 ? span : null;
}

// Export pose data as JSON
export function exportPoseData(keypoints: Keypoint[], timestamp: number): string {
  return JSON.stringify({
    timestamp,
    keypoints: keypoints.map(kp => ({
      x: kp.x,
      y: kp.y,
      score: kp.score,
      name: kp.name,
    })),
  }, null, 2);
}

// Center of Mass and Balance Point Calculations

export interface CenterOfMass {
  x: number;
  y: number;
  confidence: number; // 0-1 based on available keypoints
}

/**
 * Detected body posture used to choose the correct BOS contact points.
 *   standing   – bilateral stance (both feet on the ground)
 *   single_leg – one foot elevated (arabesque, skater spiral, single-leg RDL)
 *   quadruped  – hands + knees on the ground
 *   plank      – hands + feet on the ground, knees elevated
 *   unknown    – insufficient keypoints to classify
 */
export type PostureType = 'standing' | 'single_leg' | 'quadruped' | 'plank' | 'unknown';

export interface BalancePoint {
  x: number;
  y: number;
  posture: PostureType;
  /** All detected ground-contact keypoints used to compute the BOS. */
  contactPoints: Array<{ x: number; y: number }>;
  /** Kept for backward compat — ankle positions when posture is standing/single_leg. */
  supportBase: {
    left: { x: number; y: number } | null;
    right: { x: number; y: number } | null;
  };
  stability: number; // Horizontal distance from CoM to BOS centroid (lower = more stable)
}

// Segment mass ratios (approximate percentages of total body mass)
const SEGMENT_MASSES: Array<{
  name: string;
  massRatio: number;
  keypoints: string[];
}> = [
  { name: 'head', massRatio: 0.08, keypoints: ['nose'] },
  { name: 'torso', massRatio: 0.50, keypoints: ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip'] },
  { name: 'left_arm', massRatio: 0.05, keypoints: ['left_shoulder', 'left_elbow', 'left_wrist'] },
  { name: 'right_arm', massRatio: 0.05, keypoints: ['right_shoulder', 'right_elbow', 'right_wrist'] },
  { name: 'left_leg', massRatio: 0.16, keypoints: ['left_hip', 'left_knee', 'left_ankle'] },
  { name: 'right_leg', massRatio: 0.16, keypoints: ['right_hip', 'right_knee', 'right_ankle'] },
];

/**
 * Calculate center of mass based on keypoint positions
 */
export function calculateCenterOfMass(keypoints: Keypoint[]): CenterOfMass | null {
  if (!keypoints || keypoints.length === 0) return null;

  let totalMass = 0;
  let weightedX = 0;
  let weightedY = 0;
  let segmentsFound = 0;

  SEGMENT_MASSES.forEach(segment => {
    const segmentKeypoints = segment.keypoints
      .map(name => findKeypoint(keypoints, name))
      .filter(kp => kp !== null && kp.score > 0.3) as Keypoint[];
    
    if (segmentKeypoints.length > 0) {
      // Calculate center of segment
      const segmentCenterX = segmentKeypoints.reduce((sum, kp) => sum + kp.x, 0) / segmentKeypoints.length;
      const segmentCenterY = segmentKeypoints.reduce((sum, kp) => sum + kp.y, 0) / segmentKeypoints.length;
      
      weightedX += segmentCenterX * segment.massRatio;
      weightedY += segmentCenterY * segment.massRatio;
      totalMass += segment.massRatio;
      segmentsFound++;
    }
  });

  if (totalMass === 0 || segmentsFound === 0) return null;

  // Confidence based on how many segments were found
  const confidence = segmentsFound / SEGMENT_MASSES.length;

  // Return the real confidence without an artificial floor so that the strict > 0.3
  // threshold in calculateBalancePoint correctly rejects under-observed poses (BUG-15).
  return {
    x: weightedX / totalMass,
    y: weightedY / totalMass,
    confidence,
  };
}

/**
 * Classify body posture from 2D keypoints (image-space, Y increases downward).
 *
 * Detection order (first match wins):
 *  1. single_leg  – large ankle height difference (one foot elevated > 18 % body extent)
 *  2. quadruped   – horizontal torso + wrists near floor + knees near floor
 *  3. plank       – horizontal torso + wrists near floor + ankles near floor (knees elevated)
 *  4. standing    – upright torso, or fallback
 */
export function detectPosture(keypoints: Keypoint[]): PostureType {
  const SCORE_THRESHOLD = 0.3;
  const ok = (kp: Keypoint | null): kp is Keypoint => !!kp && (kp.score ?? 0) >= SCORE_THRESHOLD;

  const lShoulder = findKeypoint(keypoints, 'left_shoulder');
  const rShoulder = findKeypoint(keypoints, 'right_shoulder');
  const lHip      = findKeypoint(keypoints, 'left_hip');
  const rHip      = findKeypoint(keypoints, 'right_hip');
  const lAnkle    = findKeypoint(keypoints, 'left_ankle');
  const rAnkle    = findKeypoint(keypoints, 'right_ankle');
  const lWrist    = findKeypoint(keypoints, 'left_wrist');
  const rWrist    = findKeypoint(keypoints, 'right_wrist');
  const lKnee     = findKeypoint(keypoints, 'left_knee');
  const rKnee     = findKeypoint(keypoints, 'right_knee');

  const shoulder = ok(lShoulder) ? lShoulder : ok(rShoulder) ? rShoulder : null;
  const hip      = ok(lHip)      ? lHip      : ok(rHip)      ? rHip      : null;
  if (!shoulder || !hip) return 'unknown';

  // Body extent: vertical span of all reliable keypoints
  const goodKps = keypoints.filter(kp => (kp.score ?? 0) >= SCORE_THRESHOLD);
  if (goodKps.length < 3) return 'unknown';
  const minY = Math.min(...goodKps.map(kp => kp.y));
  const maxY = Math.max(...goodKps.map(kp => kp.y));
  const bodyExtent = maxY - minY;
  if (bodyExtent < 20) return 'unknown';

  // 1. Single-leg: one ankle is significantly higher than the other
  if (ok(lAnkle) && ok(rAnkle)) {
    const ankleDiff = Math.abs(lAnkle.y - rAnkle.y) / bodyExtent;
    if (ankleDiff > 0.18) return 'single_leg';
  }

  // 2–3. Horizontal torso cases (quadruped / plank)
  const torsoVertical = Math.abs(hip.y - shoulder.y);
  const torsoRatio    = torsoVertical / bodyExtent; // ~0 horizontal, ~1 vertical
  const torsoUpright  = torsoRatio > 0.25;

  if (!torsoUpright) {
    const wrist = ok(lWrist) ? lWrist : ok(rWrist) ? rWrist : null;
    if (wrist) {
      const wristFromFloor = (maxY - wrist.y) / bodyExtent;
      if (wristFromFloor < 0.25) {
        // Wrists are near the floor → weight-bearing on hands
        const knee  = ok(lKnee)  ? lKnee  : ok(rKnee)  ? rKnee  : null;
        const ankle = ok(lAnkle) ? lAnkle : ok(rAnkle) ? rAnkle : null;
        if (knee && (maxY - knee.y) / bodyExtent < 0.25) return 'quadruped';
        if (ankle && (maxY - ankle.y) / bodyExtent < 0.15) return 'plank';
        return 'quadruped'; // default for hands-near-floor + horizontal torso
      }
    }
  }

  return 'standing';
}

/**
 * Calculate balance point (base of support) from ankle positions
 * Projects the center of mass vertically down to the support base line
 */
export function calculateBalancePoint(keypoints: Keypoint[]): BalancePoint | null {
  const SCORE_THRESHOLD = 0.3;
  const ok = (kp: Keypoint | null): kp is Keypoint => !!kp && (kp.score ?? 0) >= SCORE_THRESHOLD;

  const posture = detectPosture(keypoints);
  const com     = calculateCenterOfMass(keypoints);
  const comOk   = com && com.confidence > 0.3;

  const lAnkle = findKeypoint(keypoints, 'left_ankle');
  const rAnkle = findKeypoint(keypoints, 'right_ankle');
  const lWrist = findKeypoint(keypoints, 'left_wrist');
  const rWrist = findKeypoint(keypoints, 'right_wrist');
  const lKnee  = findKeypoint(keypoints, 'left_knee');
  const rKnee  = findKeypoint(keypoints, 'right_knee');

  // ── Helper: project COM onto a 1-D support segment and compute stability ──
  const projectOntoSupport = (contactPts: Array<{ x: number; y: number }>) => {
    const xs = contactPts.map(p => p.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const centroidX = xs.reduce((s, x) => s + x, 0) / xs.length;
    const floorY    = Math.max(...contactPts.map(p => p.y));
    const balanceX  = comOk ? Math.max(minX, Math.min(maxX, com!.x)) : centroidX;
    const stability = com ? Math.abs(com.x - centroidX) : 0;
    return { balanceX, balanceY: floorY, centroidX, stability };
  };

  // ── Single-leg: use only the ankle closer to the ground ──────────────────
  if (posture === 'single_leg') {
    const la = ok(lAnkle) ? lAnkle : null;
    const ra = ok(rAnkle) ? rAnkle : null;
    // Higher Y value = lower in image = on the floor
    const ground = la && ra ? (la.y >= ra.y ? la : ra) : (la ?? ra);
    if (!ground) return null;
    const stability = com ? Math.abs(com.x - ground.x) : 0;
    return {
      x: ground.x, y: ground.y, posture,
      contactPoints: [{ x: ground.x, y: ground.y }],
      supportBase: { left: { x: ground.x, y: ground.y }, right: null },
      stability,
    };
  }

  // ── Quadruped / Plank: polygon of wrists + knees (or ankles) ─────────────
  if (posture === 'quadruped' || posture === 'plank') {
    const frontPts: Array<{ x: number; y: number }> = [];
    if (ok(lWrist)) frontPts.push({ x: lWrist.x, y: lWrist.y });
    if (ok(rWrist)) frontPts.push({ x: rWrist.x, y: rWrist.y });

    const backKps = posture === 'quadruped' ? [lKnee, rKnee] : [lAnkle, rAnkle];
    const backPts: Array<{ x: number; y: number }> = [];
    for (const kp of backKps) { if (ok(kp)) backPts.push({ x: kp!.x, y: kp!.y }); }

    const contactPoints = [...frontPts, ...backPts];
    if (contactPoints.length === 0) return null;

    const { balanceX, balanceY, stability } = projectOntoSupport(contactPoints);
    return {
      x: balanceX, y: balanceY, posture,
      contactPoints,
      supportBase: { left: null, right: null },
      stability,
    };
  }

  // ── Standing (default): bilateral or single-ankle ─────────────────────────
  const la = ok(lAnkle) ? lAnkle : null;
  const ra = ok(rAnkle) ? rAnkle : null;
  if (!la && !ra) return null;

  const contactPoints = [la, ra].filter(Boolean).map(kp => ({ x: kp!.x, y: kp!.y }));
  const { balanceX, balanceY, stability } = projectOntoSupport(contactPoints);

  return {
    x: balanceX, y: balanceY, posture,
    contactPoints,
    supportBase: {
      left:  la ? { x: la.x, y: la.y } : null,
      right: ra ? { x: ra.x, y: ra.y } : null,
    },
    stability,
  };
}
