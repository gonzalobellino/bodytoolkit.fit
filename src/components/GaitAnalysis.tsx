import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Activity,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Download,
  Info,
  Eye,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Progress } from './ui/progress';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { useGaitAnalysis } from '../hooks/useGaitAnalysis';
import { usePoseDetection } from '../hooks/usePoseDetection';
import { PoseOverlay } from './PoseOverlay';
import { AnalysisHeader } from './AnalysisHeader';
import { usePremium } from '../contexts/PremiumContext';
import { SubscriptionModal } from './ui/SubscriptionModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { getContainLayout } from '../utils/videoLayout';
import { useVideoPlaybackNotice } from '../hooks/useVideoPlaybackNotice';
import { VideoPlaybackBanner } from './VideoPlaybackBanner';
import { usePosePresets, type PoseTuningParams } from '../hooks/usePosePresets';
import { useArucoCalibration } from '../hooks/useArucoCalibration';
import { usePoseMetrics } from '../hooks/usePoseMetrics';

const ArucoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 12 12" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="12" height="12" fill="black" />
    <rect x="4" y="2" width="2" height="2" fill="white" />
    <rect x="4" y="4" width="6" height="2" fill="white" />
    <rect x="2" y="6" width="6" height="2" fill="white" />
    <rect x="4" y="8" width="2" height="2" fill="white" />
    <rect x="8" y="8" width="2" height="2" fill="white" />
  </svg>
);

interface GaitAnalysisProps {
  onBack: () => void;
}

export function GaitAnalysis({ onBack }: GaitAnalysisProps) {
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
  const [modelType, setModelType] = useState<'movenet' | 'blazepose'>('movenet');
  const showTuningPanel = import.meta.env.VITE_AI_TUNING_PANEL === 'true';
  const { presets, defaultPresetId } = usePosePresets('gait');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [tuningParams, setTuningParams] = useState<PoseTuningParams | null>(null);
  
  // Check premium access
  useEffect(() => {
    if (!hasFeature('gaitAnalysis')) {
      setShowSubscriptionModal(true);
    }
  }, [hasFeature]);
  
  // Pose detection
  const {
    keypoints,
    isLoading: poseLoading,
    debugInfo,
  } = usePoseDetection({
    videoRef,
    enabled: videoUrl !== null && hasFeature('gaitAnalysis'),
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
  
  // Gait analysis
  const {
    phases,
    metrics,
    compensations,
    isAnalyzing,
    patternStatus,
    processKeypoints,
    startAnalysis,
    stopAnalysis,
    resetAnalysis,
  } = useGaitAnalysis();
  
  // ArUco calibration for real-world measurements
  const {
    calibration,
    isDetecting: arucoDetecting,
    detectMarkers,
    pixelsToCm,
    setManualCalibration,
  } = useArucoCalibration();

  const [patientHeight, setPatientHeight] = useState<number | ''>('');
  const handleApplyPatientHeight = () => {
    if (patientHeight && poseMetrics.bodyHeight) {
      setManualCalibration(patientHeight, poseMetrics.bodyHeight);
    }
  };

  const formatMetric = (value: number | undefined, decimals: number, suffix = '') => {
    return value !== undefined ? `${value.toFixed(decimals)}${suffix}` : '--';
  };

  const formatScaledMetric = (
    value: number | undefined,
    decimals: number,
    pixelUnit: string,
    centimeterUnit: string
  ) => {
    if (value === undefined) return '--';
    if (calibration.isCalibrated && pixelsToCm) {
      const centimeters = pixelsToCm(value);
      if (centimeters !== null) {
        return `${centimeters.toFixed(decimals)} ${centimeterUnit}`;
      }
    }
    return `${value.toFixed(decimals)} ${pixelUnit}`;
  };

  // Auto-detect ArUco markers when video loads
  useEffect(() => {
    if (videoUrl && videoRef.current && videoRef.current.readyState >= 2 && !calibration.isCalibrated) {
      detectMarkers(videoRef.current).catch(() => {
        // Silently fail - calibration is optional
      });
    }
  }, [videoUrl, detectMarkers, calibration.isCalibrated]);

  // Process keypoints for gait analysis
  useEffect(() => {
    if (isAnalyzing && keypoints.length > 0) {
      processKeypoints(keypoints, currentTime * 1000);
    }
  }, [keypoints, currentTime, isAnalyzing, processKeypoints]);

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
      resetAnalysis();
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
  
  const handleStartAnalysis = () => {
    if (!hasFeature('gaitAnalysis')) {
      setShowSubscriptionModal(true);
      return;
    }
    startAnalysis();
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };
  
  const handleStopAnalysis = () => {
    stopAnalysis();
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };
  
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getCompensationColor = (severity: string) => {
    switch (severity) {
      case 'severe': return 'bg-red-500';
      case 'moderate': return 'bg-orange-500';
      case 'mild': return 'bg-yellow-500';
      default: return 'bg-slate-500';
    }
  };
  
  const getCompensationLabel = (type: string) => {
    switch (type) {
      case 'trendelenburg': return 'Trendelenburg Sign';
      case 'hip_drop': return 'Hip Drop';
      case 'knee_valgus': return 'Knee Valgus';
      case 'foot_progression': return 'Foot Progression';
      case 'shoulder_drop': return 'Shoulder Drop';
      case 'trunk_tilt': return 'Trunk Side Tilt';
      case 'arm_swing_asymmetry': return 'Arm Swing Asymmetry';
      case 'forward_head': return 'Forward Head Posture';
      case 'heel_strike_asymmetry': return 'Heel Strike Asymmetry';
      default: return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AnalysisHeader
        title="Gait Analysis"
        subtitle="AI-Powered Movement Assessment"
        badgeText="Premium Feature"
        badgeIcon={<Activity className="w-3 h-3" />}
        onBack={onBack}
      />

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Section */}
          <div className="lg:col-span-2 space-y-4">
            {!videoUrl ? (
              <Card className="border-2 border-dashed border-slate-300">
                <CardContent className="py-12 text-center">
                  <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-slate-900 font-medium mb-2">Upload Gait Video</h3>
                  <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
                    Record or upload a video of walking (sagittal or frontal view). 
                    The AI will analyze gait phases and detect compensations.
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
                  {keypoints.length > 0 && videoRef.current && (
                    <PoseOverlay
                      keypoints={keypoints}
                      videoWidth={videoRef.current.videoWidth ?? 640}
                      videoHeight={videoRef.current.videoHeight ?? 480}
                      canvasWidth={containerRef.current?.clientWidth ?? videoRef.current.videoWidth ?? 640}
                      canvasHeight={containerRef.current?.clientHeight ?? videoRef.current.videoHeight ?? 480}
                      {...getContainLayout(
                        containerRef.current?.clientWidth ?? videoRef.current.videoWidth ?? 640,
                        containerRef.current?.clientHeight ?? videoRef.current.videoHeight ?? 480,
                        videoRef.current.videoWidth ?? 640,
                        videoRef.current.videoHeight ?? 480
                      )}
                      modelType={modelType}
                      threshold={tuningParams?.scoreThreshold ?? 0.3}
                      keypointColor="#00ff00"
                      skeletonColor="#ff00ff"
                    />
                  )}
                  
                  {/* Analysis Status Overlay */}
                  {isAnalyzing && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-emerald-500 text-white px-3 py-1.5 rounded-full text-sm">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      Analyzing...
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
                  
                  {/* Quality indicator badge - visible when video is loaded and AI is enabled */}
                  {videoUrl && debugInfo?.qualityScore !== undefined && (
                    <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-medium z-20 shadow-lg ${
                      debugInfo.qualityScore >= 0.8 ? 'bg-green-500/90 text-white' :
                      debugInfo.qualityScore >= 0.6 ? 'bg-amber-500/90 text-white' :
                      'bg-red-500/90 text-white'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${
                          debugInfo.qualityScore >= 0.8 ? 'bg-green-200' :
                          debugInfo.qualityScore >= 0.6 ? 'bg-amber-200' :
                          'bg-red-200'
                        }`}></div>
                        <span>Quality: {(debugInfo.qualityScore * 100).toFixed(0)}%</span>
                      </div>
                      {debugInfo.qualityScore < 0.7 && debugInfo.missingCriticalKeypoints && debugInfo.missingCriticalKeypoints.length > 0 && (
                        <div className="mt-1 text-[10px] opacity-90">Missing keypoints detected</div>
                      )}
                    </div>
                  )}

                  {/* Calibration badge — 3 states: scanning / calibrated / not found */}
                  {videoUrl && (arucoDetecting || calibration.isCalibrated || calibration.source === null) && (
                    <div className={`absolute top-4 ${debugInfo?.qualityScore !== undefined ? 'right-36' : 'right-4'} px-2.5 py-1 rounded-full text-xs font-medium z-20 shadow-lg flex items-center gap-1.5 ${
                      calibration.isCalibrated
                        ? 'bg-blue-500/90 text-white'
                        : arucoDetecting
                        ? 'bg-zinc-700/90 text-zinc-200'
                        : 'bg-amber-500/90 text-white'
                    }`}>
                      {calibration.isCalibrated ? (
                        <>
                          <ArucoIcon className="h-3 w-3 rounded-[2px]" />
                          <span>{calibration.source === 'manual' ? 'Height calibrated' : 'ArUco calibrated'}</span>
                        </>
                      ) : arucoDetecting ? (
                        <>
                          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          <span>Scanning ArUco…</span>
                        </>
                      ) : (
                        <>
                          <ArucoIcon className="h-3 w-3 rounded-[2px] opacity-70" />
                          <span>ArUco not found</span>
                        </>
                      )}
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
                      
                      <div className="flex items-center gap-2">
                        {!isAnalyzing ? (
                          <Button onClick={handleStartAnalysis} className="gap-2">
                            <Activity className="w-4 h-4" />
                            Start Analysis
                          </Button>
                        ) : (
                          <Button onClick={handleStopAnalysis} variant="destructive" className="gap-2">
                            <Square className="w-4 h-4" />
                            Stop Analysis
                          </Button>
                        )}
                        <Button variant="outline" onClick={resetAnalysis} className="gap-2">
                          <RotateCcw className="w-4 h-4" />
                          Reset
                        </Button>
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

                    {/* Scale reference — ArUco or subject height fallback */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <p className="text-xs text-slate-500 mb-1.5">Scale reference</p>
                      {calibration.source === 'aruco' ? (
                        <div className="flex items-center gap-1.5 text-xs text-blue-600">
                          <ArucoIcon className="h-3 w-3 rounded-[2px]" />
                          <span>ArUco calibrated</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-slate-400">
                            {calibration.source === 'manual'
                              ? `Applied: ${calibration.realDistance} cm`
                              : 'No ArUco detected — enter subject height:'}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              min={100}
                              max={220}
                              value={patientHeight}
                              onChange={(e) => setPatientHeight(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="cm"
                              className="h-7 text-xs w-20 px-2"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleApplyPatientHeight}
                              disabled={!patientHeight || !poseMetrics.bodyHeight}
                              className="h-7 text-xs px-2"
                            >
                              Apply
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Phase Timeline */}
                    {phases.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-slate-500 mb-2">Gait Phases</p>
                        <div className="h-8 bg-slate-100 rounded-lg overflow-hidden flex">
                          {phases.map((phase, idx) => (
                            <div
                              key={idx}
                              className={`h-full ${
                                phase.type === 'stance' 
                                  ? 'bg-blue-500' 
                                  : 'bg-emerald-500'
                              }`}
                              style={{
                                width: `${(phase.duration / (duration * 1000)) * 100}%`,
                              }}
                              title={`${phase.type}: ${phase.duration}ms`}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between mt-1">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <div className="w-3 h-3 bg-blue-500 rounded" />
                            Stance
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <div className="w-3 h-3 bg-emerald-500 rounded" />
                            Swing
                          </div>
                        </div>
                      </div>
                    )}
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
                            <div>
                              Hip speed:{' '}
                              {formatScaledMetric(poseMetrics.hipSpeed, 1, 'px/s', 'cm/s')}
                            </div>
                            <div>Hip speed (norm): {formatMetric(poseMetrics.hipSpeedNormalized, 3)}</div>
                            <div>Trunk rotation: {formatMetric(poseMetrics.trunkRotation, 1, '°')}</div>
                            <div>Pelvis rotation: {formatMetric(poseMetrics.pelvisRotation, 1, '°')}</div>
                            <div>X-factor: {formatMetric(poseMetrics.xFactor, 1, '°')}</div>
                            <div>
                              Pelvis stability:{' '}
                              {formatScaledMetric(poseMetrics.pelvisStability, 1, 'px', 'cm')}
                            </div>
                            <div>Depth (knee): {formatMetric(poseMetrics.depthAngle, 1, '°')}</div>
                            <div>
                              Body height:{' '}
                              {formatScaledMetric(poseMetrics.bodyHeight, 0, 'px', 'cm')}
                            </div>
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
          </div>

          {/* Results Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Info className="w-4 h-4 text-blue-500" />
                  Capture Setup
                </CardTitle>
                <CardDescription>
                  Use these tips to improve gait analysis accuracy.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>Tripod at hip height, 3-5 m from the walkway.</li>
                  <li>Full body in frame head-to-toe with a small margin.</li>
                  <li>Record 6-10 steps at a steady pace in sagittal and frontal views.</li>
                  <li>Good lighting and a high-contrast background; avoid shadows.</li>
                  <li>Use 1080p+ and 60 fps when possible; avoid wide-angle distortion.</li>
                </ul>
              </CardContent>
            </Card>
            {/* Metrics Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Gait Metrics
                </CardTitle>
                <CardDescription>
                  Real-time gait parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics ? (
                  <>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Cadence</span>
                        <span className="font-medium">{metrics.cadence} steps/min</span>
                      </div>
                      <Progress value={Math.min(metrics.cadence / 1.5, 100)} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Stance Time</span>
                        <span className="font-medium">{metrics.stanceTime}ms</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Swing Time</span>
                        <span className="font-medium">{metrics.swingTime}ms</span>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Symmetry Score</span>
                        <span className={`font-medium ${
                          metrics.symmetry >= 90 ? 'text-emerald-600' :
                          metrics.symmetry >= 75 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {metrics.symmetry}%
                        </span>
                      </div>
                      <Progress 
                        value={metrics.symmetry} 
                        className={`h-2 ${
                          metrics.symmetry >= 90 ? '[&>div]:bg-emerald-500' :
                          metrics.symmetry >= 75 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'
                        }`}
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Start analysis to see metrics</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Real-time Pattern Status */}
            {isAnalyzing && patternStatus && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Eye className="w-4 h-4 text-blue-500" />
                    Real-time Pattern Status
                  </CardTitle>
                  <CardDescription>
                    Live detection of gait patterns
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Hip Levelness */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Hip Levelness</span>
                    <Badge variant={patternStatus.hipLevelness.status === 'normal' ? 'secondary' : 'destructive'}>
                      {patternStatus.hipLevelness.status === 'normal' 
                        ? 'Level' 
                        : `${patternStatus.hipLevelness.side} drop (${patternStatus.hipLevelness.status})`}
                    </Badge>
                  </div>
                  
                  {/* Shoulder Levelness */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Shoulder Levelness</span>
                    <Badge variant={patternStatus.shoulderLevelness.status === 'normal' ? 'secondary' : 'destructive'}>
                      {patternStatus.shoulderLevelness.status === 'normal' 
                        ? 'Level' 
                        : `${patternStatus.shoulderLevelness.side} drop (${patternStatus.shoulderLevelness.status})`}
                    </Badge>
                  </div>
                  
                  {/* Trunk Tilt */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Trunk Alignment</span>
                    <Badge variant={patternStatus.trunkTilt.status === 'normal' ? 'secondary' : 'destructive'}>
                      {patternStatus.trunkTilt.status === 'normal' 
                        ? 'Vertical' 
                        : `${patternStatus.trunkTilt.degrees.toFixed(1)}° ${patternStatus.trunkTilt.direction}`}
                    </Badge>
                  </div>
                  
                  {/* Arm Swing */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Arm Swing</span>
                    <Badge variant={patternStatus.armSwingSymmetry.status === 'normal' ? 'secondary' : 'outline'}>
                      {patternStatus.armSwingSymmetry.status === 'normal' 
                        ? 'Symmetric' 
                        : `${(patternStatus.armSwingSymmetry.ratio * 100).toFixed(0)}% ratio`}
                    </Badge>
                  </div>
                  
                  {/* Head Position */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Head Position</span>
                    <Badge variant={patternStatus.headPosition.status === 'normal' ? 'secondary' : 'destructive'}>
                      {patternStatus.headPosition.status === 'normal' ? 'Aligned' : `Forward (${patternStatus.headPosition.status})`}
                    </Badge>
                  </div>
                  
                  {/* Gait Phase */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-slate-600">Current Phase</span>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        L: {patternStatus.currentPhase.left || '—'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        R: {patternStatus.currentPhase.right || '—'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Compensations Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Detected Compensations
                </CardTitle>
                <CardDescription>
                  Movement pattern abnormalities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {compensations.length > 0 ? (
                  <div className="space-y-2">
                    {/* Group compensations by type */}
                    {Array.from(new Set(compensations.map(c => c.type))).map(type => {
                      const typeCompensations = compensations.filter(c => c.type === type);
                      const mostSevere = typeCompensations.reduce((prev, curr) => 
                        curr.severity === 'severe' ? curr :
                        curr.severity === 'moderate' && prev.severity !== 'severe' ? curr : prev
                      );
                      
                      return (
                        <div
                          key={type}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${getCompensationColor(mostSevere.severity)}`} />
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {getCompensationLabel(type)}
                              </p>
                              <p className="text-xs text-slate-500">
                                {mostSevere.side} • {typeCompensations.length} occurrences
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              mostSevere.severity === 'severe' ? 'border-red-300 text-red-700' :
                              mostSevere.severity === 'moderate' ? 'border-orange-300 text-orange-700' :
                              'border-yellow-300 text-yellow-700'
                            }`}
                          >
                            {mostSevere.severity}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No compensations detected</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Export Button */}
            {metrics && (
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
        featureName="Gait Analysis"
      />
    </div>
  );
}
