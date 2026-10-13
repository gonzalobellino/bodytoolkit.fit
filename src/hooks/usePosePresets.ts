import { useEffect, useMemo, useState } from 'react';
import type { CameraOrientation } from '../utils/poseAnalysis';

export interface PoseTuningParams {
  scoreThreshold: number;
  minPoseScore: number;
  enableSmoothing: boolean;
  blazeposeModelType?: 'lite' | 'full' | 'heavy';
  smoothingAlpha: number;
  maxJumpRatio: number;
  maxOutOfBoundsRatio: number;
}

export interface PosePreset {
  id: string;
  label: string;
  modelType?: 'movenet' | 'blazepose';
  /**
   * The camera orientation(s) this preset expects.
   * When the detected orientation doesn't match, a warning is shown to the user.
   * undefined = any orientation is acceptable (e.g. grappling sports).
   */
  expectedView?: CameraOrientation[];
  params: PoseTuningParams;
}

interface PosePresetFile {
  defaults: Record<string, string | undefined>;
  movementDefaults?: Record<string, string>;
  presets: PosePreset[];
}

const FALLBACK_PRESETS: PosePresetFile = {
  defaults: {
    video: 'default',
    gait: 'default',
    symmetry: 'default',
    movementComparison: 'default',
  },
  movementDefaults: {},
  presets: [
    {
      id: 'default',
      label: 'Default',
      modelType: 'movenet',
      // Default preset accepts any camera angle
      params: {
        scoreThreshold: 0.3,
        minPoseScore: 0.1,
        enableSmoothing: true,
        blazeposeModelType: 'full',
        smoothingAlpha: 0.6,
        maxJumpRatio: 0.15,
        maxOutOfBoundsRatio: 0.2,
      },
    },
    {
      id: 'golf',
      label: 'Golf Swing',
      modelType: 'blazepose',
      // Golf requires a side-on view to measure X-factor and trunk rotation correctly
      expectedView: ['lateral-left', 'lateral-right'],
      params: {
        scoreThreshold: 0.4,
        minPoseScore: 0.1,
        enableSmoothing: true,
        blazeposeModelType: 'full',
        smoothingAlpha: 0.7,
        maxJumpRatio: 0.1,
        maxOutOfBoundsRatio: 0.15,
      },
    },
    {
      id: 'swim',
      label: 'Swimming',
      modelType: 'blazepose',
      // Swimming is best captured from the side or overhead
      expectedView: ['lateral-left', 'lateral-right', 'overhead'],
      params: {
        scoreThreshold: 0.15,
        minPoseScore: 0.1,
        enableSmoothing: true,
        blazeposeModelType: 'full',
        smoothingAlpha: 0.5,
        maxJumpRatio: 0.2,
        maxOutOfBoundsRatio: 0.3,
      },
    },
    {
      id: 'jiu-jitsu',
      label: 'Jiu-Jitsu',
      modelType: 'blazepose',
      // Grappling is dynamic; any angle is acceptable
      params: {
        scoreThreshold: 0.2,
        minPoseScore: 0.1,
        enableSmoothing: true,
        blazeposeModelType: 'full',
        smoothingAlpha: 0.4,
        maxJumpRatio: 0.25,
        maxOutOfBoundsRatio: 0.3,
      },
    },
  ],
};

export function usePosePresets(featureId?: string, movementId?: string) {
  const [presetFile, setPresetFile] = useState<PosePresetFile>(FALLBACK_PRESETS);

  useEffect(() => {
    let active = true;
    async function loadPresets() {
      try {
        const response = await fetch('/data/pose-presets.json');
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (active && data?.presets?.length) {
          setPresetFile(data);
        }
      } catch (error) {
        console.warn('Failed to load pose presets, using fallback:', error);
      }
    }
    loadPresets();
    return () => {
      active = false;
    };
  }, []);

  const defaultPresetId = useMemo(() => {
    const movementDefault = movementId && presetFile.movementDefaults?.[movementId];
    if (movementDefault) {
      return movementDefault;
    }
    const featureDefault = featureId ? presetFile.defaults?.[featureId] : undefined;
    return featureDefault ?? 'default';
  }, [featureId, movementId, presetFile.defaults, presetFile.movementDefaults]);

  return {
    presets: presetFile.presets,
    defaultPresetId,
  };
}
