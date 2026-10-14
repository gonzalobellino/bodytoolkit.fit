import type { Keypoint } from './poseAnalysis';

const MOVENET_ORDER = [
  'nose',
  'left_eye',
  'right_eye',
  'left_ear',
  'right_ear',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
] as const;

const BLAZEPOSE_TO_MOVENET: Record<(typeof MOVENET_ORDER)[number], string[]> = {
  nose: ['nose'],
  left_eye: ['left_eye'],
  right_eye: ['right_eye'],
  left_ear: ['left_ear'],
  right_ear: ['right_ear'],
  left_shoulder: ['left_shoulder'],
  right_shoulder: ['right_shoulder'],
  left_elbow: ['left_elbow'],
  right_elbow: ['right_elbow'],
  left_wrist: ['left_wrist'],
  right_wrist: ['right_wrist'],
  left_hip: ['left_hip'],
  right_hip: ['right_hip'],
  left_knee: ['left_knee'],
  right_knee: ['right_knee'],
  // Only map to the anatomical ankle; heel/foot-index are distinct landmarks (BUG-11).
  left_ankle: ['left_ankle'],
  right_ankle: ['right_ankle'],
};

const normalizeName = (name?: string): string => (name ? name.toLowerCase() : '');

const BLAZEPOSE_INDEX_MAP: Record<(typeof MOVENET_ORDER)[number], number[]> = {
  nose: [0],
  left_eye: [2],
  right_eye: [5],
  left_ear: [7],
  right_ear: [8],
  left_shoulder: [11],
  right_shoulder: [12],
  left_elbow: [13],
  right_elbow: [14],
  left_wrist: [15],
  right_wrist: [16],
  left_hip: [23],
  right_hip: [24],
  left_knee: [25],
  right_knee: [26],
  // Indices 27/28 are left/right ankle; 29/31 are heel/foot-index — do not mix (BUG-11).
  left_ankle: [27],
  right_ankle: [28],
};

const findKeypointByNames = (keypoints: Keypoint[], names: string[]): Keypoint | undefined => {
  const nameSet = new Set(names.map((name) => name.toLowerCase()));
  return keypoints.find((kp) => nameSet.has(normalizeName(kp.name)));
};

const findKeypointByIndex = (keypoints: Keypoint[], indices: number[]): Keypoint | undefined => {
  for (const index of indices) {
    const kp = keypoints[index];
    if (kp) {
      return kp;
    }
  }
  return undefined;
};

export function remapKeypoints(
  modelType: 'movenet' | 'blazepose',
  keypoints: Keypoint[],
  videoSize?: { width: number; height: number }
): Keypoint[] {
  // TODO: Extend mapping to leverage BlazePose extra keypoints (hands/feet/face) for sport-specific analysis.
  if (modelType === 'movenet') {
    return keypoints;
  }

  const maxX = Math.max(...keypoints.map((kp) => kp.x || 0), 0);
  const maxY = Math.max(...keypoints.map((kp) => kp.y || 0), 0);
  const useNormalized =
    !!videoSize?.width &&
    !!videoSize?.height &&
    maxX <= 2 &&
    maxY <= 2;

  const normalizePoint = (point: Keypoint): Keypoint => {
    if (!useNormalized || !videoSize) {
      return point;
    }
    return {
      ...point,
      x: point.x * videoSize.width,
      y: point.y * videoSize.height,
    };
  };

  const mapped = MOVENET_ORDER.map((movenetName) => {
    const match =
      findKeypointByNames(keypoints, BLAZEPOSE_TO_MOVENET[movenetName]) ??
      findKeypointByIndex(keypoints, BLAZEPOSE_INDEX_MAP[movenetName]);
    if (!match) {
      return { x: 0, y: 0, score: 0, name: movenetName };
    }
    const point = normalizePoint(match);
    const score =
      (typeof (match as { score?: number }).score === 'number' ? (match as { score?: number }).score : undefined) ??
      (typeof (match as { visibility?: number }).visibility === 'number' ? (match as { visibility?: number }).visibility : undefined) ??
      1;
    return {
      x: point.x,
      y: point.y,
      score,
      name: movenetName,
    };
  });

  const hasVisible = mapped.some((kp) => kp.score > 0.001);
  const fallbackScores = !hasVisible
    ? mapped.map((kp) => ({
        ...kp,
        score: kp.x !== 0 || kp.y !== 0 ? 1 : 0,
      }))
    : mapped;

  if (videoSize) {
    const visible = fallbackScores.filter((kp) => kp.score > 0.001);
    const minX = Math.min(...visible.map((kp) => kp.x), 0);
    const maxX = Math.max(...visible.map((kp) => kp.x), 0);
    const minY = Math.min(...visible.map((kp) => kp.y), 0);
    const maxY = Math.max(...visible.map((kp) => kp.y), 0);
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;

    const looksLikeWorldCoords =
      (minX < 0 || minY < 0) && maxX <= 2 && maxY <= 2 && rangeX > 0 && rangeY > 0;

    if (looksLikeWorldCoords) {
      return fallbackScores.map((kp) => ({
        ...kp,
        x: ((kp.x - minX) / rangeX) * videoSize.width,
        y: ((kp.y - minY) / rangeY) * videoSize.height,
      }));
    }
  }

  return fallbackScores;
}
