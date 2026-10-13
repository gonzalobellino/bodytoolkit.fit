// Utilities for handling manual keypoint adjustments with rotation-aware offsets

import type { Keypoint } from './poseAnalysis';
import { findKeypoint } from './poseAnalysis';

export interface KeypointOffset {
  keypointIndex: number;
  // Offset in local coordinates relative to body segment orientation
  offsetLocal: {
    alongSegment: number; // Along the segment (e.g., along arm)
    perpendicular: number; // Perpendicular to the segment
  };
  // Reference keypoints for calculating orientation
  referenceKeypoints: {
    start: number; // Index of start keypoint of segment
    end: number;   // Index of end keypoint of segment
  } | null;
  // Frame time where adjustment was made (for reference)
  frameTime: number;
}

/**
 * Get reference keypoints for a given keypoint based on anatomical relationships
 */
export function getReferenceKeypoints(
  keypointIndex: number,
  keypoints: Keypoint[]
): { start: Keypoint | null; end: Keypoint | null } | null {
  const kp = keypoints[keypointIndex];
  if (!kp?.name) return null;

  const name = kp.name.toLowerCase();
  
  // Map each keypoint to its anatomical references
  const references: Record<string, { start: string; end: string }> = {
    'left_elbow': { start: 'left_shoulder', end: 'left_wrist' },
    'right_elbow': { start: 'right_shoulder', end: 'right_wrist' },
    'left_knee': { start: 'left_hip', end: 'left_ankle' },
    'right_knee': { start: 'right_hip', end: 'right_ankle' },
    'left_wrist': { start: 'left_elbow', end: 'left_shoulder' },
    'right_wrist': { start: 'right_elbow', end: 'right_shoulder' },
    'left_ankle': { start: 'left_knee', end: 'left_hip' },
    'right_ankle': { start: 'right_knee', end: 'right_hip' },
    'left_shoulder': { start: 'left_hip', end: 'left_elbow' },
    'right_shoulder': { start: 'right_hip', end: 'right_elbow' },
    'left_hip': { start: 'left_knee', end: 'left_shoulder' },
    'right_hip': { start: 'right_knee', end: 'right_shoulder' },
    // Add more as needed
  };

  const ref = references[name];
  if (!ref) return null;

  const startKp = findKeypoint(keypoints, ref.start);
  const endKp = findKeypoint(keypoints, ref.end);
  
  if (!startKp || !endKp) return null;
  
  return { start: startKp, end: endKp };
}

/**
 * Convert screen offset to local coordinates relative to body segment
 */
export function screenToLocalOffset(
  screenOffset: { x: number; y: number },
  referenceStart: Keypoint,
  referenceEnd: Keypoint
): { alongSegment: number; perpendicular: number } {
  // Vector of the segment
  const segmentVec = {
    x: referenceEnd.x - referenceStart.x,
    y: referenceEnd.y - referenceStart.y,
  };
  const segmentLength = Math.hypot(segmentVec.x, segmentVec.y);
  
  if (segmentLength < 0.001) {
    // Very short segment, use absolute offset
    return {
      alongSegment: screenOffset.x,
      perpendicular: screenOffset.y,
    };
  }

  // Normalize segment vector
  const segmentUnit = {
    x: segmentVec.x / segmentLength,
    y: segmentVec.y / segmentLength,
  };

  // Perpendicular vector (rotated 90°)
  const perpendicularUnit = {
    x: -segmentUnit.y,
    y: segmentUnit.x,
  };

  // Project offset onto segment and its perpendicular
  const alongSegment = screenOffset.x * segmentUnit.x + screenOffset.y * segmentUnit.y;
  const perpendicular = screenOffset.x * perpendicularUnit.x + screenOffset.y * perpendicularUnit.y;

  return { alongSegment, perpendicular };
}

/**
 * Convert local offset back to screen coordinates
 */
export function localToScreenOffset(
  localOffset: { alongSegment: number; perpendicular: number },
  referenceStart: Keypoint,
  referenceEnd: Keypoint
): { x: number; y: number } {
  const segmentVec = {
    x: referenceEnd.x - referenceStart.x,
    y: referenceEnd.y - referenceStart.y,
  };
  const segmentLength = Math.hypot(segmentVec.x, segmentVec.y);
  
  if (segmentLength < 0.001) {
    return { x: localOffset.alongSegment, y: localOffset.perpendicular };
  }

  const segmentUnit = {
    x: segmentVec.x / segmentLength,
    y: segmentVec.y / segmentLength,
  };

  const perpendicularUnit = {
    x: -segmentUnit.y,
    y: segmentUnit.x,
  };

  return {
    x: localOffset.alongSegment * segmentUnit.x + localOffset.perpendicular * perpendicularUnit.x,
    y: localOffset.alongSegment * segmentUnit.y + localOffset.perpendicular * perpendicularUnit.y,
  };
}

/**
 * Apply manual offsets to detected keypoints
 */
export function applyManualOffsets(
  detectedKeypoints: Keypoint[],
  offsets: Map<number, KeypointOffset>
): Keypoint[] {
  if (offsets.size === 0) return detectedKeypoints;

  return detectedKeypoints.map((kp, index) => {
    const offset = offsets.get(index);
    if (!offset) return kp;

    // If no references, skip (shouldn't happen, but safety check)
    if (!offset.referenceKeypoints) {
      return kp;
    }

    const startRef = detectedKeypoints[offset.referenceKeypoints.start];
    const endRef = detectedKeypoints[offset.referenceKeypoints.end];

    if (!startRef || !endRef) return kp;

    // Convert local offset to screen coordinates
    const screenOffset = localToScreenOffset(
      offset.offsetLocal,
      startRef,
      endRef
    );

    return {
      ...kp,
      x: kp.x + screenOffset.x,
      y: kp.y + screenOffset.y,
    };
  });
}
