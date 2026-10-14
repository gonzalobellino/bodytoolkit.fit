import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Maximize2,
  SplitSquareVertical,
  RotateCcw,
  Download,
  Info,
  FlipHorizontal,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { useSymmetryAnalysis } from '../hooks/useSymmetryAnalysis';
import { usePoseDetection } from '../hooks/usePoseDetection';
import { useArucoCalibration } from '../hooks/useArucoCalibration';
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

interface SymmetryAnalysisProps {
  onBack: () => void;
}

export function SymmetryAnalysis({ onBack }: SymmetryAnalysisProps) {
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
  const [viewMode, setViewMode] = useState<'normal' | 'mirror' | 'split'>('normal');
  const [capturedFrames, setCapturedFrames] = useState<{ left: string | null; right: string | null }>({
    left: null,
    right: null,
  });
  const [modelType, setModelType] = useState<'movenet' | 'blazepose'>('movenet');
  const showTuningPanel = import.meta.env.VITE_AI_TUNING_PANEL === 'true';
  const { presets, defaultPresetId } = usePosePresets('symmetry');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [tuningParams, setTuningParams] = useState<PoseTuningParams | null>(null);
  
  // Check premium access
  useEffect(() => {
    if (!hasFeature('symmetryAnalysis')) {
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
    enabled: videoUrl !== null && hasFeature('symmetryAnalysis'),
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
  
  // Symmetry analysis
  const {
    symmetryScore,
    comparisons,
    analyzeSymmetry,
  } = useSymmetryAnalysis();

  // Analyze symmetry when keypoints change
  useEffect(() => {
    if (keypoints.length > 0) {
      analyzeSymmetry(keypoints);
    }
  }, [keypoints, analyzeSymmetry]);

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
      detectMarkers(videoRef.current).catch(() => {});
    }
  }, [videoUrl, detectMarkers, calibration.isCalibrated]);

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
  
  const captureFrame = (side: 'left' | 'right') => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedFrames(prev => ({ ...prev, [side]: dataUrl }));
    }
  };
  
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getScoreBarColor = (score: number) => {
    if (score >= 90) return '[&>div]:bg-emerald-500';
    if (score >= 75) return '[&>div]:bg-yellow-500';
    return '[&>div]:bg-red-500';
  };
  
  const jointLabels: Record<string, string> = {
    shoulder: 'Shoulder',
    elbow: 'Elbow',
    hip: 'Hip',
    knee: 'Knee',
    ankle: 'Ankle',
  };

  return (
    <div className={`bg-slate-50 ${videoUrl ? 'h-screen overflow-hidden flex flex-col' : 'min-h-screen'}`}>
      <AnalysisHeader
        title="Symmetry Analysis"
        subtitle="Bilateral Comparison"
        badgeText="Premium Feature"
        badgeIcon={<FlipHorizontal className="w-3 h-3" />}
        onBack={onBack}
      />

      <div className={`max-w-7xl mx-auto p-4 sm:p-6 ${videoUrl ? 'flex-1 flex flex-col min-h-0' : ''}`}>
        <div className={`grid lg:grid-cols-3 gap-6 ${videoUrl ? 'flex-1 min-h-0 content-start' : ''}`}>
          {/* Video Section: viewport-fitted when video loaded to avoid scroll */}
          <div className={`lg:col-span-2 ${videoUrl ? 'flex flex-col min-h-0' : 'space-y-4'}`}>
            {!videoUrl ? (
              <Card className="border-2 border-dashed border-slate-300">
                <CardContent className="py-12 text-center">
                  <FlipHorizontal className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-slate-900 font-medium mb-2">Upload Movement Video</h3>
                  <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
                    Record or upload a video from the frontal view. 
                    The AI will compare left and right side symmetry.
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
              <div className="flex flex-col flex-1 min-h-0 gap-4">
                {/* View Mode Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant={viewMode === 'normal' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('normal')}
                    className="gap-2"
                  >
                    <Maximize2 className="w-4 h-4" />
                    Normal
                  </Button>
                  <Button
                    variant={viewMode === 'mirror' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('mirror')}
                    className="gap-2"
                  >
                    <FlipHorizontal className="w-4 h-4" />
                    Mirror Overlay
                  </Button>
                  <Button
                    variant={viewMode === 'split' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('split')}
                    className="gap-2"
                  >
                    <SplitSquareVertical className="w-4 h-4" />
                    Split View
                  </Button>
                </div>
                
                {/* Video Container */}
                <div ref={containerRef} className="bg-slate-900 rounded-xl overflow-hidden relative flex-1 min-h-0">
                  <VideoPlaybackBanner notice={videoPlaybackNotice} />
                  {viewMode === 'split' ? (
                    <div className="flex h-full">
                      <div className="w-1/2 relative">
                        <video
                          ref={videoRef}
                          src={videoUrl}
                          onTimeUpdate={handleTimeUpdate}
                          onLoadedMetadata={handleLoadedMetadata}
                          onLoadedData={() => inspectVideoElement(videoRef.current, true)}
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                          className="w-full h-full object-contain"
                          style={{ clipPath: 'inset(0 50% 0 0)' }}
                          playsInline
                        />
                        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          Left
                        </div>
                      </div>
                      <div className="w-1/2 relative">
                        <video
                          src={videoUrl}
                          className="w-full h-full object-contain"
                          style={{ 
                            transform: 'scaleX(-1)',
                            clipPath: 'inset(0 50% 0 0)',
                          }}
                          playsInline
                          muted
                        />
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          Right (Mirrored)
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        src={videoUrl}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onLoadedData={() => inspectVideoElement(videoRef.current, true)}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        className="w-full h-full object-contain"
                        style={viewMode === 'mirror' ? { transform: 'scaleX(-1)' } : {}}
                        playsInline
                      />
                      
                      {/* Pose Overlay */}
                      {keypoints.length > 0 && videoRef.current && (
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
                          flipX={viewMode === 'mirror'}
                          modelType={modelType}
                          threshold={tuningParams?.scoreThreshold ?? 0.3}
                          keypointColor="#00ff00"
                          skeletonColor="#ff00ff"
                        />
                      )}
                      
                      {/* Center Line */}
                      <div className="absolute inset-y-0 left-1/2 w-px bg-white/30" />
                    </>
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
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => captureFrame('left')}
                        >
                          Capture Left
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => captureFrame('right')}
                        >
                          Capture Right
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setCapturedFrames({ left: null, right: null });
                          }} 
                          className="gap-2"
                        >
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
                
                {/* Captured Frames Comparison */}
                {(capturedFrames.left ?? capturedFrames.right) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Frame Comparison</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[50vh] overflow-hidden">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-100 rounded-lg overflow-hidden aspect-video min-h-0 flex items-center justify-center">
                          {capturedFrames.left ? (
                            <img src={capturedFrames.left} alt="Left capture" className="max-w-full max-h-full object-contain" />
                          ) : (
                            <p className="text-slate-400 text-sm">No left frame captured</p>
                          )}
                        </div>
                        <div className="bg-slate-100 rounded-lg overflow-hidden aspect-video min-h-0 flex items-center justify-center">
                          {capturedFrames.right ? (
                            <img
                              src={capturedFrames.right}
                              alt="Right capture"
                              className="max-w-full max-h-full object-contain"
                              style={{ transform: 'scaleX(-1)' }}
                            />
                          ) : (
                            <p className="text-slate-400 text-sm">No right frame captured</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="space-y-4">
            {/* Overall Symmetry Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FlipHorizontal className="w-4 h-4 text-blue-500" />
                  Symmetry Score
                </CardTitle>
                <CardDescription>
                  Overall bilateral comparison
                </CardDescription>
              </CardHeader>
              <CardContent>
                {symmetryScore ? (
                  <div className="text-center">
                    <div className={`text-5xl font-bold mb-2 ${getScoreColor(symmetryScore.overall)}`}>
                      {symmetryScore.overall}%
                    </div>
                    <p className="text-sm text-slate-500 mb-4">
                      {symmetryScore.overall >= 90 ? 'Excellent symmetry' :
                       symmetryScore.overall >= 75 ? 'Good symmetry' :
                       symmetryScore.overall >= 60 ? 'Moderate asymmetry' :
                       'Significant asymmetry'}
                    </p>
                    
                    <Separator className="my-4" />
                    
                    <div className="space-y-3 text-left">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600">Angular Symmetry</span>
                          <span className={`font-medium ${getScoreColor(symmetryScore.angles)}`}>
                            {symmetryScore.angles}%
                          </span>
                        </div>
                        <Progress value={symmetryScore.angles} className={`h-2 ${getScoreBarColor(symmetryScore.angles)}`} />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600">ROM Symmetry</span>
                          <span className={`font-medium ${getScoreColor(symmetryScore.rom)}`}>
                            {symmetryScore.rom}%
                          </span>
                        </div>
                        <Progress value={symmetryScore.rom} className={`h-2 ${getScoreBarColor(symmetryScore.rom)}`} />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600">Timing Symmetry</span>
                          <span className={`font-medium ${getScoreColor(symmetryScore.timing)}`}>
                            {symmetryScore.timing}%
                          </span>
                        </div>
                        <Progress value={symmetryScore.timing} className={`h-2 ${getScoreBarColor(symmetryScore.timing)}`} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Upload video to analyze symmetry</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Joint Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Joint Analysis</CardTitle>
                <CardDescription>
                  Left vs Right comparison
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(comparisons).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(comparisons).map(([joint, comparison]) => (
                      <div key={joint} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-slate-900">
                            {jointLabels[joint] ?? joint}
                          </span>
                          <span className={`text-sm font-medium ${getScoreColor(comparison.percentage)}`}>
                            {Math.round(comparison.percentage)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <Progress 
                              value={comparison.percentage} 
                              className={`h-1.5 ${getScoreBarColor(comparison.percentage)}`}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-slate-500">
                          <span>Diff: {comparison.difference.toFixed(1)}px</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No joint data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Export Button */}
            {symmetryScore && (
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
        featureName="Symmetry Analysis"
      />
    </div>
  );
}
