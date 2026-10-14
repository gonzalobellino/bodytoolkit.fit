import { useCallback, useEffect, useRef, useState } from 'react';
import type { Keypoint } from '../utils/poseAnalysis';

export interface TrailPoint {
  x: number;
  y: number;
  time: number;
  score: number;
}

export interface TrailHistory {
  [keypointIndex: number]: TrailPoint[];
}

export interface TrailConfig {
  enabled: boolean;
  color: string;
}

export interface TrailConfigs {
  [keypointIndex: number]: TrailConfig;
}

interface UsePoseTrailsOptions {
  keypoints: Keypoint[];
  currentTime: number;
  enabled?: boolean;
  maxTrailLength?: number; // Maximum number of points to keep per keypoint
  minScoreThreshold?: number; // Minimum score for a keypoint to be included in trail
  trailConfigs?: TrailConfigs; // Per-keypoint trail configuration
}

export function usePoseTrails({
  keypoints,
  currentTime,
  enabled = true,
  maxTrailLength = 60, // Default: keep last 60 frames (~2 seconds at 30fps)
  minScoreThreshold = 0.3,
  trailConfigs = {},
}: UsePoseTrailsOptions): { trailHistory: TrailHistory; resetTrails: () => void; } {
  const [trailHistory, setTrailHistory] = useState<TrailHistory>({});
  const lastTimeRef = useRef<number | null>(null);
  const historyRef = useRef<TrailHistory>({});

  // Reset trails
  const resetTrails = useCallback(() => {
    historyRef.current = {};
    setTrailHistory({});
    lastTimeRef.current = null;
  }, []);

  // Note: Reset should be called explicitly when video changes, not automatically here

  // Update trail history when keypoints change
  useEffect(() => {
    if (!enabled || !keypoints || keypoints.length === 0) {
      // Don't clear history when disabled, just stop updating
      return;
    }

    // Get current history or initialize
    const currentHistory = historyRef.current;
    let newHistory: TrailHistory = { ...currentHistory };

    // If time went backwards (scrubbing backwards or video restarted), filter trails
    if (lastTimeRef.current !== null && currentTime < lastTimeRef.current) {
      // Time went backwards - remove all trail points with time > currentTime
      Object.keys(newHistory).forEach((keyStr) => {
        const keypointIndex = parseInt(keyStr, 10);
        if (isNaN(keypointIndex)) return;
        
        const trail = newHistory[keypointIndex];
        if (trail && Array.isArray(trail)) {
          // Filter out points that are in the future (time > currentTime)
          newHistory[keypointIndex] = trail.filter((point) => point.time <= currentTime);
          
          // If trail is now empty, remove it
          if (newHistory[keypointIndex].length === 0) {
            delete newHistory[keypointIndex];
          }
        }
      });
    } else {
      // Only update if time has advanced significantly (avoid duplicates during scrubbing)
      const timeDelta = lastTimeRef.current !== null ? currentTime - lastTimeRef.current : 1;
      if (timeDelta < 0.001 && lastTimeRef.current !== null) {
        // Time hasn't changed enough, skip update (but allow first update)
        return;
      }
    }

    lastTimeRef.current = currentTime;

    // Add new points for enabled keypoints
    keypoints.forEach((kp, index) => {
      // Skip if keypoint is invalid
      if (!kp || typeof kp.score !== 'number' || isNaN(kp.x) || isNaN(kp.y)) {
        return;
      }
      
      // Check if trail is enabled for this keypoint
      const config = trailConfigs[index];
      if (!config || !config.enabled) {
        // Trail not enabled for this keypoint, remove its trail if exists
        if (newHistory[index]) {
          delete newHistory[index];
        }
        return;
      }
      
      // Only add to trail if keypoint score is above threshold
      if (kp.score < minScoreThreshold) {
        // Don't add, but keep existing trail for this keypoint
        return;
      }

      if (!newHistory[index]) {
        newHistory[index] = [];
      }

      // Check if we should add this point (avoid duplicates at same time)
      const existingTrail = newHistory[index];
      const lastPoint = existingTrail[existingTrail.length - 1];
      
      // Only add if time has changed or position has changed significantly
      const shouldAdd = !lastPoint || 
        lastPoint.time !== currentTime ||
        Math.abs(lastPoint.x - kp.x) > 0.001 ||
        Math.abs(lastPoint.y - kp.y) > 0.001;

      if (shouldAdd) {
        // Add current position
        newHistory[index].push({
          x: kp.x,
          y: kp.y,
          time: currentTime,
          score: kp.score,
        });

        // Trim to max length (keep most recent points)
        if (newHistory[index].length > maxTrailLength) {
          newHistory[index] = newHistory[index].slice(-maxTrailLength);
        }
      }
    });

    historyRef.current = newHistory;
    setTrailHistory(newHistory);
  }, [keypoints, currentTime, enabled, maxTrailLength, minScoreThreshold, trailConfigs]);

  return {
    trailHistory: trailHistory || {},
    resetTrails,
  };
}

