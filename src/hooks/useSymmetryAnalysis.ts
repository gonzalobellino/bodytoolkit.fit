import { useState, useCallback } from 'react';
import type { Keypoint } from '../utils/poseAnalysis';

export interface SymmetryScore {
  overall: number; // 0-100%
  angles: number; // Angular symmetry
  rom: number; // Range of motion symmetry
  timing: number; // Timing symmetry
}

export interface BilateralComparison {
  left: number;
  right: number;
  difference: number;
  percentage: number; // similarity percentage
}

export function useSymmetryAnalysis(): {
  symmetryScore: SymmetryScore | null;
  comparisons: Record<string, BilateralComparison>;
  analyzeSymmetry: (keypoints: Keypoint[]) => SymmetryScore | null;
  comparePoses: (pose1: Keypoint[], pose2: Keypoint[]) => BilateralComparison[];
  compareBilateral: (leftKeypoints: Keypoint[], rightKeypoints: Keypoint[]) => SymmetryScore | null;
} {
  const [symmetryScore, setSymmetryScore] = useState<SymmetryScore | null>(null);
  const [comparisons, setComparisons] = useState<Record<string, BilateralComparison>>({});

  // Compare bilateral keypoints
  const compareBilateral = useCallback((
    leftKeypoints: Keypoint[],
    rightKeypoints: Keypoint[]
  ): SymmetryScore | null => {
    if (!leftKeypoints.length || !rightKeypoints.length) return null;

    const comparisons: Record<string, BilateralComparison> = {};

    // Compare corresponding keypoints
    const jointNames = ['shoulder', 'elbow', 'hip', 'knee', 'ankle'];
    
    let totalSimilarity = 0;
    let count = 0;

    jointNames.forEach(jointName => {
      const leftJoint = leftKeypoints.find(kp => 
        kp.name?.toLowerCase().includes(jointName) && 
        kp.name?.toLowerCase().includes('left')
      );
      const rightJoint = rightKeypoints.find(kp => 
        kp.name?.toLowerCase().includes(jointName) && 
        kp.name?.toLowerCase().includes('right')
      );

      if (leftJoint && rightJoint) {
        // Calculate differences
        const xDiff = Math.abs(leftJoint.x - rightJoint.x);
        const yDiff = Math.abs(leftJoint.y - rightJoint.y);
        // Normalize differences (simplified - would need proper normalization)
        const similarity = Math.max(0, 100 - (xDiff + yDiff) * 0.1);
        
        comparisons[jointName] = {
          left: leftJoint.score,
          right: rightJoint.score,
          difference: Math.sqrt(xDiff * xDiff + yDiff * yDiff),
          percentage: similarity,
        };

        totalSimilarity += similarity;
        count++;
      }
    });

    setComparisons(comparisons);

    // Calculate overall symmetry score
    const overall = count > 0 ? totalSimilarity / count : 0;

    return {
      overall: Math.round(overall),
      angles: overall, // Simplified
      rom: overall, // Simplified
      timing: overall, // Simplified
    };
  }, []);

  // Analyze symmetry from single pose (requires splitting left/right)
  const analyzeSymmetry = useCallback((keypoints: Keypoint[]): SymmetryScore | null => {
    // Split keypoints into left and right
    const leftKeypoints = keypoints.filter(kp => 
      kp.name?.toLowerCase().includes('left')
    );
    const rightKeypoints = keypoints.filter(kp => 
      kp.name?.toLowerCase().includes('right')
    );

    // Mirror right side for comparison (simplified)
    // In production, would need proper mirroring logic
    const mirroredRight = rightKeypoints.map(kp => ({
      ...kp,
      x: 1 - kp.x, // Mirror horizontally (assuming normalized coordinates)
    }));

    const score = compareBilateral(leftKeypoints, mirroredRight);
    if (score) {
      setSymmetryScore(score);
    }
    return score;
  }, [compareBilateral]);

  // Compare two poses (before/after, left/right, etc.)
  const comparePoses = useCallback((
    pose1: Keypoint[],
    pose2: Keypoint[]
  ): BilateralComparison[] => {
    const results: BilateralComparison[] = [];

    // Match keypoints by name and compare
    pose1.forEach(kp1 => {
      const kp2 = pose2.find(kp => kp.name === kp1.name);
      if (kp2) {
        const xDiff = Math.abs(kp1.x - kp2.x);
        const yDiff = Math.abs(kp1.y - kp2.y);
        const similarity = Math.max(0, 100 - (xDiff + yDiff) * 0.1);

        results.push({
          left: kp1.score,
          right: kp2.score,
          difference: Math.sqrt(xDiff * xDiff + yDiff * yDiff),
          percentage: similarity,
        });
      }
    });

    return results;
  }, []);

  return {
    symmetryScore,
    comparisons,
    analyzeSymmetry,
    comparePoses,
    compareBilateral,
  };
}

