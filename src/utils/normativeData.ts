// Normative movement data and comparison utilities

export interface NormativeROM {
  joint: string;
  movement: string;
  ageRange: { min: number; max: number };
  gender?: 'male' | 'female' | 'both';
  percentile: {
    p10: number; // 10th percentile
    p25: number; // 25th percentile
    p50: number; // 50th percentile (median)
    p75: number; // 75th percentile
    p90: number; // 90th percentile
  };
  units: 'degrees' | 'cm' | 'ratio';
  source?: string;
}

export interface MovementComparison {
  joint: string;
  movement: string;
  measuredValue: number;
  normativeValue: number;
  percentile: number; // Where the measured value falls (0-100)
  deviation: number; // Difference from median
  status: 'within_normal' | 'below_normal' | 'above_normal';
}

// Comprehensive normative ROM data
export const NORMATIVE_ROM_DATA: NormativeROM[] = [
  // Shoulder
  {
    joint: 'shoulder',
    movement: 'flexion',
    ageRange: { min: 18, max: 65 },
    gender: 'both',
    percentile: { p10: 160, p25: 165, p50: 170, p75: 175, p90: 180 },
    units: 'degrees',
    source: 'AAOS Guidelines',
  },
  {
    joint: 'shoulder',
    movement: 'extension',
    ageRange: { min: 18, max: 65 },
    gender: 'both',
    percentile: { p10: 45, p25: 50, p50: 60, p75: 65, p90: 70 },
    units: 'degrees',
  },
  {
    joint: 'shoulder',
    movement: 'abduction',
    ageRange: { min: 18, max: 65 },
    gender: 'both',
    percentile: { p10: 160, p25: 165, p50: 170, p75: 175, p90: 180 },
    units: 'degrees',
  },
  {
    joint: 'shoulder',
    movement: 'internal_rotation',
    ageRange: { min: 18, max: 65 },
    gender: 'both',
    percentile: { p10: 60, p25: 65, p50: 70, p75: 75, p90: 80 },
    units: 'degrees',
  },
  {
    joint: 'shoulder',
    movement: 'external_rotation',
    ageRange: { min: 18, max: 65 },
    gender: 'both',
    percentile: { p10: 80, p25: 85, p50: 90, p75: 95, p90: 100 },
    units: 'degrees',
  },
  
  // Hip
  {
    joint: 'hip',
    movement: 'flexion',
    ageRange: { min: 18, max: 65 },
    gender: 'both',
    percentile: { p10: 110, p25: 115, p50: 120, p75: 125, p90: 130 },
    units: 'degrees',
  },
  {
    joint: 'hip',
    movement: 'extension',
    ageRange: { min: 18, max: 65 },
    gender: 'both',
    percentile: { p10: 15, p25: 20, p50: 30, p75: 35, p90: 40 },
    units: 'degrees',
  },
  {
    joint: 'hip',
    movement: 'abduction',
    ageRange: { min: 18, max: 65 },
    gender: 'both',
    percentile: { p10: 35, p25: 40, p50: 45, p75: 50, p90: 55 },
    units: 'degrees',
  },
  {
    joint: 'hip',
    movement: 'internal_rotation',
    ageRange: { min: 18, max: 65 },
    gender: 'both',
    percentile: { p10: 30, p25: 35, p50: 45, p75: 50, p90: 55 },
    units: 'degrees',
  },
  {
    joint: 'hip',
    movement: 'external_rotation',
    ageRange: { min: 18, max: 65 },
    gender: 'both',
    percentile: { p10: 35, p25: 40, p50: 45, p75: 50, p90: 55 },
    units: 'degrees',
  },
  
  // Knee
  {
    joint: 'knee',
    movement: 'flexion',
    ageRange: { min: 18, max: 65 },
    gender: 'both',
    percentile: { p10: 130, p25: 135, p50: 140, p75: 145, p90: 150 },
    units: 'degrees',
  },
  {
    joint: 'knee',
    movement: 'extension',
    ageRange: { min: 18, max: 65 },
    gender: 'both',
    percentile: { p10: -5, p25: 0, p50: 0, p75: 5, p90: 10 },
    units: 'degrees',
  },
  
  // Ankle
  {
    joint: 'ankle',
    movement: 'dorsiflexion',
    ageRange: { min: 18, max: 65 },
    gender: 'both',
    percentile: { p10: 10, p25: 15, p50: 20, p75: 25, p90: 30 },
    units: 'degrees',
  },
  {
    joint: 'ankle',
    movement: 'plantarflexion',
    ageRange: { min: 18, max: 65 },
    gender: 'both',
    percentile: { p10: 40, p25: 45, p50: 50, p75: 55, p90: 60 },
    units: 'degrees',
  },
  
  // Cervical Spine
  {
    joint: 'cervical',
    movement: 'flexion',
    ageRange: { min: 18, max: 65 },
    gender: 'both',
    percentile: { p10: 40, p25: 45, p50: 50, p75: 55, p90: 60 },
    units: 'degrees',
  },
  {
    joint: 'cervical',
    movement: 'extension',
    ageRange: { min: 18, max: 65 },
    gender: 'both',
    percentile: { p10: 55, p25: 60, p50: 70, p75: 75, p90: 80 },
    units: 'degrees',
  },
  {
    joint: 'cervical',
    movement: 'rotation',
    ageRange: { min: 18, max: 65 },
    gender: 'both',
    percentile: { p10: 65, p25: 70, p50: 80, p75: 85, p90: 90 },
    units: 'degrees',
  },
  
  // Lumbar Spine
  {
    joint: 'lumbar',
    movement: 'flexion',
    ageRange: { min: 18, max: 65 },
    gender: 'both',
    percentile: { p10: 50, p25: 55, p50: 60, p75: 65, p90: 70 },
    units: 'degrees',
  },
  {
    joint: 'lumbar',
    movement: 'extension',
    ageRange: { min: 18, max: 65 },
    gender: 'both',
    percentile: { p10: 20, p25: 25, p50: 30, p75: 35, p90: 40 },
    units: 'degrees',
  },
  
  // Elbow
  {
    joint: 'elbow',
    movement: 'flexion',
    ageRange: { min: 18, max: 65 },
    gender: 'both',
    percentile: { p10: 140, p25: 145, p50: 150, p75: 155, p90: 160 },
    units: 'degrees',
  },
  
  // Wrist
  {
    joint: 'wrist',
    movement: 'flexion',
    ageRange: { min: 18, max: 65 },
    gender: 'both',
    percentile: { p10: 70, p25: 75, p50: 80, p75: 85, p90: 90 },
    units: 'degrees',
  },
  {
    joint: 'wrist',
    movement: 'extension',
    ageRange: { min: 18, max: 65 },
    gender: 'both',
    percentile: { p10: 65, p25: 70, p50: 75, p75: 80, p90: 85 },
    units: 'degrees',
  },
];

export function findNormativeROM(
  joint: string,
  movement: string,
  age: number,
  gender?: 'male' | 'female'
): NormativeROM | null {
  return NORMATIVE_ROM_DATA.find(norm => 
    norm.joint === joint &&
    norm.movement === movement &&
    age >= norm.ageRange.min &&
    age <= norm.ageRange.max &&
    (norm.gender === 'both' || norm.gender === gender || !norm.gender)
  ) ?? null;
}

export function calculatePercentile(
  value: number,
  normative: NormativeROM
): number {
  const { p10, p25, p50, p75, p90 } = normative.percentile;

  if (value <= p10) {
    // Linear interpolation below p10
    return (value / p10) * 10;
  } else if (value <= p25) {
    // Interpolate between p10 and p25
    return 10 + ((value - p10) / (p25 - p10)) * 15;
  } else if (value <= p50) {
    // Interpolate between p25 and p50
    return 25 + ((value - p25) / (p50 - p25)) * 25;
  } else if (value <= p75) {
    // Interpolate between p50 and p75
    return 50 + ((value - p50) / (p75 - p50)) * 25;
  } else if (value <= p90) {
    // Interpolate between p75 and p90
    return 75 + ((value - p75) / (p90 - p75)) * 15;
  } else {
    // Above p90
    return Math.min(100, 90 + ((value - p90) / (p90 - p75)) * 10);
  }
}

export function compareToNormative(
  joint: string,
  movement: string,
  measuredValue: number,
  age: number,
  gender?: 'male' | 'female'
): MovementComparison | null {
  const normative = findNormativeROM(joint, movement, age, gender);
  if (!normative) return null;

  const percentile = calculatePercentile(measuredValue, normative);
  const median = normative.percentile.p50;
  const deviation = measuredValue - median;

  let status: 'within_normal' | 'below_normal' | 'above_normal';
  if (percentile >= 10 && percentile <= 90) {
    status = 'within_normal';
  } else if (percentile < 10) {
    status = 'below_normal';
  } else {
    status = 'above_normal';
  }

  return {
    joint,
    movement,
    measuredValue,
    normativeValue: median,
    percentile: Math.round(percentile * 10) / 10,
    deviation: Math.round(deviation * 10) / 10,
    status,
  };
}

