import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Users,
  TrendingUp,
  BarChart3,
  Info,
  Download,
  Sliders,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Progress } from './ui/progress';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { usePoseDetection } from '../hooks/usePoseDetection';
import { PoseOverlay } from './PoseOverlay';
import { AnalysisHeader } from './AnalysisHeader';
import { usePremium } from '../contexts/PremiumContext';
import { SubscriptionModal } from './ui/SubscriptionModal';
import {
  compareToNormative,
  NORMATIVE_ROM_DATA,
  MovementComparison as MovementComparisonResult,
} from '../utils/normativeData';
import { calculateAngle, findKeypoint, type Keypoint } from '../utils/poseAnalysis';
import { getContainLayout } from '../utils/videoLayout';
import { useVideoPlaybackNotice } from '../hooks/useVideoPlaybackNotice';
import { VideoPlaybackBanner } from './VideoPlaybackBanner';
import { usePosePresets, type PoseTuningParams } from '../hooks/usePosePresets';
import { usePoseMetrics } from '../hooks/usePoseMetrics';

interface MovementComparisonProps {
  onBack: () => void;
}

export function MovementComparison({ onBack }: MovementComparisonProps) {
  const { notice: videoPlaybackNotice, inspectFile: inspectVideoFile, inspectVideo: inspectVideoElement } = useVideoPlaybackNotice();
  const { hasFeature } = usePremium();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Settings
  const [showOverlay, setShowOverlay] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const [selectedMovement, setSelectedMovement] = useState('overhead_squat');
  const [clientAge, setClientAge] = useState(30);
  const [clientGender, setClientGender] = useState<'male' | 'female'>('male');
  const [modelType, setModelType] = useState<'movenet' | 'blazepose'>('movenet');
  const showTuningPanel = import.meta.env.VITE_AI_TUNING_PANEL === 'true';
  const { presets, defaultPresetId } = usePosePresets('movementComparison', selectedMovement);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [tuningParams, setTuningParams] = useState<PoseTuningParams | null>(null);
  
  // Results
  const [comparisons, setComparisons] = useState<MovementComparisonResult[]>([]);
  
  // Check premium access
  useEffect(() => {
    if (!hasFeature('movementComparison')) {
      setShowSubscriptionModal(true);
    }
  }, [hasFeature]);
  
  // Pose detection
  const {
    keypoints,
    isLoading: poseLoading,
  } = usePoseDetection({
    videoRef,
    enabled: videoUrl !== null && hasFeature('movementComparison'),
    modelType,
    tuning: tuningParams ?? undefined,
  });
  const {
    metrics: poseMetrics,
    markSwingStart,
    markImpact,
    clearSwingMarkers,
  } = usePoseMetrics({ keypoints, timeSec: currentTime });

  useEffect(() => {
    if (!presets.length) return;
    const fallbackId = presets.some((preset) => preset.id === defaultPresetId)
      ? defaultPresetId
      : presets[0].id;
    setSelectedPresetId((prev) => (prev && presets.some((preset) => preset.id === prev) ? prev : fallbackId));
  }, [defaultPresetId, presets]);

  useEffect(() => {
    if (!selectedPresetId) return;
    const preset = presets.find((item) => item.id === selectedPresetId);
    if (!preset) return;
    setTuningParams(preset.params);
    if (preset.modelType) {
      setModelType(preset.modelType);
    }
  }, [presets, selectedPresetId]);
  
  const movementJointMap: Record<string, Array<{ joint: string; movement: string }>> = {
    overhead_squat: [
      { joint: 'shoulder', movement: 'flexion' },
      { joint: 'hip', movement: 'flexion' },
      { joint: 'knee', movement: 'flexion' },
      { joint: 'ankle', movement: 'dorsiflexion' },
    ],
    single_leg_squat: [
      { joint: 'hip', movement: 'flexion' },
      { joint: 'knee', movement: 'flexion' },
      { joint: 'ankle', movement: 'dorsiflexion' },
    ],
    forward_bend: [
      { joint: 'hip', movement: 'flexion' },
      { joint: 'knee', movement: 'flexion' },
    ],
    shoulder_flexion: [
      { joint: 'shoulder', movement: 'flexion' },
    ],
    hip_hinge: [
      { joint: 'hip', movement: 'flexion' },
      { joint: 'knee', movement: 'flexion' },
    ],
  };
  const KEYPOINT_THRESHOLD = tuningParams?.scoreThreshold ?? 0.3;

  const getKeypoint = (keypoints: Keypoint[], names: string[]) => {
    const kp = names
      .map(name => findKeypoint(keypoints, name))
      .find(candidate => candidate && candidate.score >= KEYPOINT_THRESHOLD);
    return kp ?? null;
  };

  const averageAngles = (values: Array<number | null>) => {
    const filtered = values.filter((value): value is number => value !== null);
    if (filtered.length === 0) return null;
    return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
  };

  const getJointAngle = (keypoints: Keypoint[], joint: string, side: 'left' | 'right') => {
    const hip = getKeypoint(keypoints, [`${side}_hip`, `hip_${side}`]);
    const shoulder = getKeypoint(keypoints, [`${side}_shoulder`, `shoulder_${side}`]);
    const elbow = getKeypoint(keypoints, [`${side}_elbow`, `elbow_${side}`]);
    const knee = getKeypoint(keypoints, [`${side}_knee`, `knee_${side}`]);
    const ankle = getKeypoint(keypoints, [`${side}_ankle`, `ankle_${side}`]);
    const foot = getKeypoint(keypoints, [
      `${side}_foot_index`,
      `foot_index_${side}`,
      `${side}_heel`,
      `heel_${side}`,
    ]);

    if (joint === 'shoulder' && hip && shoulder && elbow) {
      return calculateAngle(hip, shoulder, elbow);
    }

    if (joint === 'hip' && shoulder && hip && knee) {
      return calculateAngle(shoulder, hip, knee);
    }

    if (joint === 'knee' && hip && knee && ankle) {
      return calculateAngle(hip, knee, ankle);
    }

    if (joint === 'ankle' && knee && ankle && foot) {
      return calculateAngle(knee, ankle, foot);
    }

    return null;
  };

  const getMeasuredValue = (keypoints: Keypoint[], joint: string, movement: string) => {
    if (movement !== 'flexion' && movement !== 'dorsiflexion') {
      return null;
    }

    const left = getJointAngle(keypoints, joint, 'left');
    const right = getJointAngle(keypoints, joint, 'right');
    return averageAngles([left, right]);
  };

  const calculateComparisons = (keypoints: Keypoint[]): MovementComparisonResult[] => {
    const results: MovementComparisonResult[] = [];

    const joints = movementJointMap[selectedMovement] ?? [
      { joint: 'shoulder', movement: 'flexion' },
      { joint: 'hip', movement: 'flexion' },
      { joint: 'knee', movement: 'flexion' },
      { joint: 'ankle', movement: 'dorsiflexion' },
    ];

    joints.forEach(({ joint, movement }) => {
      const normData = NORMATIVE_ROM_DATA.find(
        n => n.joint === joint && n.movement === movement
      );

      if (normData) {
        const measuredValue = getMeasuredValue(keypoints, joint, movement);
        if (measuredValue === null) {
          return;
        }
        const comparison = compareToNormative(joint, movement, measuredValue, clientAge, clientGender);
        if (comparison) {
          results.push(comparison);
        }
      }
    });

    return results;
  };

  // Calculate comparisons when keypoints change
  useEffect(() => {
    if (keypoints.length > 0) {
      // Calculate angles from keypoints and compare to normative data
      const results = calculateComparisons(keypoints);
      setComparisons(results);
    }
  }, [keypoints, clientAge, clientGender, selectedMovement]);

  useEffect(() => {
    return () => {
      if (videoUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      inspectVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
    }
  };
  
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };
  
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      inspectVideoElement(videoRef.current);
    }
  };
  
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'within_normal': return 'text-emerald-600';
      case 'above_normal': return 'text-blue-600';
      case 'below_normal': return 'text-orange-600';
      default: return 'text-slate-600';
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'within_normal': return 'Normal';
      case 'above_normal': return 'Above Average';
      case 'below_normal': return 'Below Average';
      default: return status;
    }
  };
  
  const getPercentileColor = (percentile: number) => {
    if (percentile >= 75) return '[&>div]:bg-emerald-500';
    if (percentile >= 50) return '[&>div]:bg-blue-500';
    if (percentile >= 25) return '[&>div]:bg-yellow-500';
    return '[&>div]:bg-red-500';
  };

  const movementTypes = [
    { id: 'overhead_squat', name: 'Overhead Squat' },
    { id: 'single_leg_squat', name: 'Single Leg Squat' },
    { id: 'forward_bend', name: 'Forward Bend' },
    { id: 'shoulder_flexion', name: 'Shoulder Flexion' },
    { id: 'hip_hinge', name: 'Hip Hinge' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <AnalysisHeader
        title="Movement Comparison"
        subtitle="Compare to Normative Data"
        badgeText="Premium Feature"
        badgeIcon={<BarChart3 className="w-3 h-3" />}
        onBack={onBack}
      />

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Section */}
          <div className="lg:col-span-2 space-y-4">
            {!videoUrl ? (
              <Card className="border-2 border-dashed border-slate-300">
                <CardContent className="py-12 text-center">
                  <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-slate-900 font-medium mb-2">Upload Movement Video</h3>
                  <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
                    Upload a video of your client performing a movement pattern.
                    The AI will compare their ROM to normative population data.
                  </p>
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    title="Files stay on your device - nothing is uploaded to any server"
                  >
                    Select Video
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Video Container */}
                <div ref={containerRef} className="bg-slate-900 rounded-xl overflow-hidden relative aspect-video">
                  <VideoPlaybackBanner notice={videoPlaybackNotice} />
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onLoadedData={() => inspectVideoElement(videoRef.current, true)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    className="w-full h-full object-contain"
                    playsInline
                  />
                  
                  {/* Pose Overlay */}
                  {showOverlay && keypoints.length > 0 && videoRef.current && (
                    <div style={{ opacity: overlayOpacity / 100 }}>
                      <PoseOverlay
                        keypoints={keypoints}
                        videoWidth={videoRef.current?.videoWidth ?? 640}
                        videoHeight={videoRef.current?.videoHeight ?? 480}
                        canvasWidth={containerRef.current?.clientWidth ?? videoRef.current?.videoWidth ?? 640}
                        canvasHeight={containerRef.current?.clientHeight ?? videoRef.current?.videoHeight ?? 480}
                      {...getContainLayout(
                        containerRef.current?.clientWidth ?? videoRef.current?.videoWidth ?? 640,
                        containerRef.current?.clientHeight ?? videoRef.current?.videoHeight ?? 480,
                        videoRef.current?.videoWidth ?? 640,
                        videoRef.current?.videoHeight ?? 480
                      )}
                      modelType={modelType}
                      threshold={tuningParams?.scoreThreshold ?? 0.3}
                      keypointColor="#00ff00"
                      skeletonColor="#ff00ff"
                    />
                    </div>
                  )}
                  
                  {/* Normative Reference Overlay (placeholder) */}
                  {showOverlay && (
                    <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{ opacity: overlayOpacity / 100 * 0.5 }}
                    >
                      {/* In production, this would show a reference pose/animation */}
                      <div className="absolute bottom-4 right-4 bg-blue-500/80 text-white text-xs px-2 py-1 rounded">
                        Reference: {movementTypes.find(m => m.id === selectedMovement)?.name}
                      </div>
                    </div>
                  )}
                  
                  {/* Loading Overlay */}
                  {poseLoading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-white text-center">
                        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
                        <p className="text-sm">Loading AI Model...</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Controls */}
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={togglePlayPause}
                          className="h-10 w-10"
                        >
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </Button>
                        <span className="text-sm text-slate-600 tabular-nums">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            id="show-overlay"
                            checked={showOverlay}
                            onCheckedChange={setShowOverlay}
                          />
                          <Label htmlFor="show-overlay" className="text-sm">
                            Show Overlay
                          </Label>
                        </div>
                        
                        <div className="flex items-center gap-2 w-32">
                          <Sliders className="w-4 h-4 text-slate-400" />
                          <Slider
                            value={[overlayOpacity]}
                            onValueChange={([value]) => setOverlayOpacity(value)}
                            min={10}
                            max={100}
                            step={10}
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <Label className="text-xs text-slate-500">Model</Label>
                        <Select value={modelType} onValueChange={(value) => setModelType(value as 'movenet' | 'blazepose')}>
                          <SelectTrigger size="sm" className="mt-1 max-w-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="movenet">MoveNet (fast)</SelectItem>
                            <SelectItem value="blazepose">BlazePose (more points)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {showTuningPanel && (
                  <Card>
                    <CardContent className="py-4 space-y-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">AI Tuning</p>
                        <p className="text-xs text-slate-500">Adjust thresholds and stability for this session.</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs text-slate-500">Preset</Label>
                          <Select
                            value={selectedPresetId ?? ''}
                            onValueChange={(value) => setSelectedPresetId(value)}
                          >
                            <SelectTrigger size="sm" className="mt-1">
                              <SelectValue placeholder="Select preset" />
                            </SelectTrigger>
                            <SelectContent>
                              {presets.map((preset) => (
                                <SelectItem key={preset.id} value={preset.id}>
                                  {preset.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Model</Label>
                          <Select value={modelType} onValueChange={(value) => setModelType(value as 'movenet' | 'blazepose')}>
                            <SelectTrigger size="sm" className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="movenet">MoveNet</SelectItem>
                              <SelectItem value="blazepose">BlazePose</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {modelType === 'blazepose' && (
                          <div>
                            <Label className="text-xs text-slate-500">BlazePose size</Label>
                            <Select
                              value={tuningParams?.blazeposeModelType ?? 'full'}
                              onValueChange={(value) =>
                                setTuningParams((prev) => ({
                                  ...(prev ?? {
                                    scoreThreshold: 0.3,
                                    minPoseScore: 0.1,
                                    enableSmoothing: true,
                                    blazeposeModelType: 'full',
                                    smoothingAlpha: 0.6,
                                    maxJumpRatio: 0.15,
                                    maxOutOfBoundsRatio: 0.2,
                                  }),
                                  blazeposeModelType: value as 'lite' | 'full' | 'heavy',
                                }))
                              }
                            >
                              <SelectTrigger size="sm" className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="lite">Lite</SelectItem>
                                <SelectItem value="full">Full</SelectItem>
                                <SelectItem value="heavy">Heavy</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div>
                          <Label className="text-xs text-slate-500">Min pose score</Label>
                          <div className="mt-2">
                            <Slider
                              value={[tuningParams?.minPoseScore ?? 0.1]}
                              min={0}
                              max={1}
                              step={0.01}
                              onValueChange={([value]) =>
                                setTuningParams((prev) => ({
                                  ...(prev ?? {
                                    scoreThreshold: 0.3,
                                    minPoseScore: 0.1,
                                    enableSmoothing: true,
                                    blazeposeModelType: 'full',
                                    smoothingAlpha: 0.6,
                                    maxJumpRatio: 0.15,
                                    maxOutOfBoundsRatio: 0.2,
                                  }),
                                  minPoseScore: value,
                                }))
                              }
                            />
                            <p className="text-[11px] text-slate-500 mt-1">
                              {tuningParams?.minPoseScore?.toFixed(2) ?? '0.10'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 mt-4 sm:mt-0">
                          <div>
                            <Label className="text-xs text-slate-500">Enable smoothing</Label>
                            <p className="text-[11px] text-slate-400">Model + post filter</p>
                          </div>
                          <Switch
                            checked={tuningParams?.enableSmoothing ?? true}
                            onCheckedChange={(checked) =>
                              setTuningParams((prev) => ({
                                ...(prev ?? {
                                  scoreThreshold: 0.3,
                                  minPoseScore: 0.1,
                                  enableSmoothing: true,
                                    blazeposeModelType: 'full',
                                  smoothingAlpha: 0.6,
                                  maxJumpRatio: 0.15,
                                  maxOutOfBoundsRatio: 0.2,
                                }),
                                enableSmoothing: checked,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Score threshold</Label>
                          <div className="mt-2">
                            <Slider
                              value={[tuningParams?.scoreThreshold ?? 0.3]}
                              min={0}
                              max={1}
                              step={0.01}
                              onValueChange={([value]) =>
                              setTuningParams((prev) => ({
                                ...(prev ?? {
                                  scoreThreshold: 0.3,
                                  minPoseScore: 0.1,
                                  enableSmoothing: true,
                                    blazeposeModelType: 'full',
                                  smoothingAlpha: 0.6,
                                  maxJumpRatio: 0.15,
                                  maxOutOfBoundsRatio: 0.2,
                                  }),
                                  scoreThreshold: value,
                                }))
                              }
                            />
                            <p className="text-[11px] text-slate-500 mt-1">
                              {tuningParams?.scoreThreshold?.toFixed(2) ?? '0.30'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Smoothing alpha</Label>
                          <div className="mt-2">
                            <Slider
                              value={[tuningParams?.smoothingAlpha ?? 0.6]}
                              min={0}
                              max={1}
                              step={0.01}
                              onValueChange={([value]) =>
                              setTuningParams((prev) => ({
                                ...(prev ?? {
                                  scoreThreshold: 0.3,
                                  minPoseScore: 0.1,
                                  enableSmoothing: true,
                                    blazeposeModelType: 'full',
                                  smoothingAlpha: 0.6,
                                  maxJumpRatio: 0.15,
                                  maxOutOfBoundsRatio: 0.2,
                                  }),
                                  smoothingAlpha: value,
                                }))
                              }
                            />
                            <p className="text-[11px] text-slate-500 mt-1">
                              {tuningParams?.smoothingAlpha?.toFixed(2) ?? '0.60'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Max jump ratio</Label>
                          <div className="mt-2">
                            <Slider
                              value={[tuningParams?.maxJumpRatio ?? 0.15]}
                              min={0}
                              max={0.5}
                              step={0.01}
                              onValueChange={([value]) =>
                              setTuningParams((prev) => ({
                                ...(prev ?? {
                                  scoreThreshold: 0.3,
                                  minPoseScore: 0.1,
                                  enableSmoothing: true,
                                    blazeposeModelType: 'full',
                                  smoothingAlpha: 0.6,
                                  maxJumpRatio: 0.15,
                                  maxOutOfBoundsRatio: 0.2,
                                  }),
                                  maxJumpRatio: value,
                                }))
                              }
                            />
                            <p className="text-[11px] text-slate-500 mt-1">
                              {tuningParams?.maxJumpRatio?.toFixed(2) ?? '0.15'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Max out-of-bounds ratio</Label>
                          <div className="mt-2">
                            <Slider
                              value={[tuningParams?.maxOutOfBoundsRatio ?? 0.2]}
                              min={0}
                              max={0.5}
                              step={0.01}
                              onValueChange={([value]) =>
                              setTuningParams((prev) => ({
                                ...(prev ?? {
                                  scoreThreshold: 0.3,
                                  minPoseScore: 0.1,
                                  enableSmoothing: true,
                                    blazeposeModelType: 'full',
                                  smoothingAlpha: 0.6,
                                  maxJumpRatio: 0.15,
                                  maxOutOfBoundsRatio: 0.2,
                                  }),
                                  maxOutOfBoundsRatio: value,
                                }))
                              }
                            />
                            <p className="text-[11px] text-slate-500 mt-1">
                              {tuningParams?.maxOutOfBoundsRatio?.toFixed(2) ?? '0.20'}
                            </p>
                          </div>
                        </div>
                      </div>
                      {keypoints.length > 0 && (
                        <div className="border-t border-slate-200 pt-3">
                          <p className="text-xs text-slate-500 mb-2">Live metrics</p>
                          <div className="grid gap-2 sm:grid-cols-2 text-xs text-slate-600">
                            <div>Hip speed: {poseMetrics.hipSpeed ? poseMetrics.hipSpeed.toFixed(1) : '--'} px/s</div>
                            <div>Hip speed (norm): {poseMetrics.hipSpeedNormalized ? poseMetrics.hipSpeedNormalized.toFixed(3) : '--'}</div>
                            <div>Trunk rotation: {poseMetrics.trunkRotation ? poseMetrics.trunkRotation.toFixed(1) : '--'}°</div>
                            <div>Pelvis rotation: {poseMetrics.pelvisRotation ? poseMetrics.pelvisRotation.toFixed(1) : '--'}°</div>
                            <div>X-factor: {poseMetrics.xFactor ? poseMetrics.xFactor.toFixed(1) : '--'}°</div>
                            <div>Pelvis stability: {poseMetrics.pelvisStability ? poseMetrics.pelvisStability.toFixed(1) : '--'}</div>
                            <div>Depth (knee): {poseMetrics.depthAngle ? poseMetrics.depthAngle.toFixed(1) : '--'}°</div>
                            <div>Body height: {poseMetrics.bodyHeight ? poseMetrics.bodyHeight.toFixed(0) : '--'} px</div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <Button size="sm" variant="outline" onClick={markSwingStart}>
                              Mark swing start
                            </Button>
                            <Button size="sm" variant="outline" onClick={markImpact}>
                              Mark impact
                            </Button>
                            <Button size="sm" variant="ghost" onClick={clearSwingMarkers}>
                              Clear
                            </Button>
                            <span className="text-[11px] text-slate-500">
                              Start: {poseMetrics.swingStartTime !== undefined ? formatTime(poseMetrics.swingStartTime) : '--'}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Impact: {poseMetrics.impactTime !== undefined ? formatTime(poseMetrics.impactTime) : '--'}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            
            {/* Movement Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Movement Pattern</CardTitle>
                <CardDescription>Select the movement being performed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {movementTypes.map(movement => (
                    <Button
                      key={movement.id}
                      variant={selectedMovement === movement.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedMovement(movement.id)}
                    >
                      {movement.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="space-y-4">
            {/* Client Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="w-4 h-4 text-blue-500" />
                  Client Demographics
                </CardTitle>
                <CardDescription>
                  Used for normative comparison
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm">Age: {clientAge} years</Label>
                  <Slider
                    value={[clientAge]}
                    onValueChange={([value]) => setClientAge(value)}
                    min={18}
                    max={80}
                    step={1}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label className="text-sm">Gender</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={clientGender === 'male' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setClientGender('male')}
                    >
                      Male
                    </Button>
                    <Button
                      variant={clientGender === 'female' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setClientGender('female')}
                    >
                      Female
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comparison Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  ROM Comparison
                </CardTitle>
                <CardDescription>
                  Percentile ranking vs population
                </CardDescription>
              </CardHeader>
              <CardContent>
                {comparisons.length > 0 ? (
                  <div className="space-y-4">
                    {comparisons.map((comparison, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-medium text-slate-900 capitalize">
                              {comparison.joint} {comparison.movement}
                            </p>
                            <p className="text-xs text-slate-500">
                              Measured: {comparison.measuredValue.toFixed(0)}° 
                              (Norm: {comparison.normativeValue.toFixed(0)}°)
                            </p>
                          </div>
                          <Badge 
                            variant="outline"
                            className={`text-xs ${getStatusColor(comparison.status)}`}
                          >
                            {getStatusLabel(comparison.status)}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Percentile</span>
                            <span className={`font-medium ${getStatusColor(comparison.status)}`}>
                              {comparison.percentile}th
                            </span>
                          </div>
                          <Progress 
                            value={comparison.percentile} 
                            className={`h-2 ${getPercentileColor(comparison.percentile)}`}
                          />
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>10th</span>
                            <span>50th</span>
                            <span>90th</span>
                          </div>
                        </div>
                        
                        {comparison.deviation !== 0 && (
                          <p className="text-xs text-slate-500 mt-2">
                            {comparison.deviation > 0 ? '+' : ''}{comparison.deviation.toFixed(0)}° 
                            {comparison.deviation > 0 ? ' above' : ' below'} median
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {!videoUrl
                        ? 'Upload video to see comparison'
                        : poseLoading
                          ? 'Loading pose model...'
                          : keypoints.length === 0
                            ? 'Analyzing video...'
                            : 'Insufficient pose data for this movement'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Export */}
            {comparisons.length > 0 && (
              <Button variant="outline" className="w-full gap-2">
                <Download className="w-4 h-4" />
                Export Report
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Modal */}
      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
        featureName="Movement Comparison"
      />
    </div>
  );
}
