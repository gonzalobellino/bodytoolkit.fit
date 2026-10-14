import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SplitSquareVertical,
  RotateCcw,
  Download,
  Info,
  FlipHorizontal,
  BarChart3,
  Sliders,
  AlertTriangle,
  Scale,
  Ruler,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Progress } from './ui/progress';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useSymmetryAnalysis } from '../hooks/useSymmetryAnalysis';
import { usePoseDetection } from '../hooks/usePoseDetection';
import { useCompensationDetection } from '../hooks/useCompensationDetection';
import { PoseOverlay } from './PoseOverlay';
import { AnalysisHeader } from './AnalysisHeader';
import { CompensationAlerts, CompensationAlertOverlay } from './CompensationAlerts';
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
import {
  compareToNormative,
  NORMATIVE_ROM_DATA,
  MovementComparison as MovementComparisonResult,
} from '../utils/normativeData';
import { calculateAngle, findKeypoint, type Keypoint } from '../utils/poseAnalysis';
import { usePoseMetrics } from '../hooks/usePoseMetrics';
import { useArucoCalibration } from '../hooks/useArucoCalibration';

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

interface MovementAnalysisProps {
  onBack: () => void;
}

type AnalysisTab = 'symmetry' | 'normative' | 'compensations';

const DISCLAIMER = "Measurements are estimates based on 2D video analysis. Accuracy is limited without calibration markers. For clinical decisions, use calibrated instruments.";

const ASSESSMENT_PATTERNS: Array<{ id: string; name: string }> = [
  { id: 'overhead_squat', name: 'Overhead Squat' },
  { id: 'classic_squat', name: 'Classic Squat' },
  { id: 'hip_hinge', name: 'Hip Hinge' },
  { id: 'shoulder_flexion', name: 'Shoulder Flexion' },
  { id: 'single_overhead_press', name: 'Single Overhead Press' },
  { id: 'shoulder_abduction', name: 'Shoulder Abduction' },
];

const MOVEMENT_JOINT_MAP: Record<string, Array<{ joint: string; movement: string }>> = {
  overhead_squat: [
    { joint: 'shoulder', movement: 'flexion' },
    { joint: 'hip', movement: 'flexion' },
    { joint: 'knee', movement: 'flexion' },
    { joint: 'ankle', movement: 'dorsiflexion' },
  ],
  classic_squat: [
    { joint: 'hip', movement: 'flexion' },
    { joint: 'knee', movement: 'flexion' },
    { joint: 'ankle', movement: 'dorsiflexion' },
  ],
  hip_hinge: [
    { joint: 'hip', movement: 'flexion' },
    { joint: 'knee', movement: 'flexion' },
  ],
  shoulder_flexion: [{ joint: 'shoulder', movement: 'flexion' }],
  single_overhead_press: [{ joint: 'shoulder', movement: 'flexion' }],
  shoulder_abduction: [{ joint: 'shoulder', movement: 'abduction' }],
};

const PATTERN_GUIDE: Record<string, { movement: string; plane: string }> = {
  overhead_squat: {
    movement: 'Squat with arms held overhead (full flexion). Full descent and ascent, feet shoulder-width.',
    plane: 'Sagittal (lateral view) or frontal to assess knee alignment.',
  },
  classic_squat: {
    movement: 'Bilateral squat (back squat or goblet style). Hip, knee and ankle flexion through full range.',
    plane: 'Sagittal (lateral view) or frontal to assess knee alignment.',
  },
  hip_hinge: {
    movement: 'Hip hinge: bend at the hips with minimal knee flexion, neutral spine. Used to assess lumbar motor control (e.g. deadlift pattern).',
    plane: 'Sagittal (lateral view).',
  },
  shoulder_flexion: {
    movement: 'Raise arm(s) forward and up in the sagittal plane (forward elevation to overhead).',
    plane: 'Sagittal (lateral view).',
  },
  single_overhead_press: {
    movement: 'Single-arm overhead press: press one arm from shoulder height to full overhead in the sagittal plane.',
    plane: 'Sagittal (lateral view).',
  },
  shoulder_abduction: {
    movement: 'Raise arm(s) sideways (abduction) to 90° or full overhead in the frontal plane.',
    plane: 'Frontal (front view).',
  },
};

const DEFAULT_JOINTS = [
  { joint: 'shoulder', movement: 'flexion' },
  { joint: 'hip', movement: 'flexion' },
  { joint: 'knee', movement: 'flexion' },
  { joint: 'ankle', movement: 'dorsiflexion' },
];

export function MovementAnalysis({ onBack }: MovementAnalysisProps) {
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
  const [activeTab, setActiveTab] = useState<AnalysisTab>('symmetry');
  
  // View modes
  const [viewMode, setViewMode] = useState<'normal' | 'mirror' | 'split'>('normal');
  const [showOverlay, setShowOverlay] = useState(true);
  
  // Settings
  const [selectedMovement, setSelectedMovement] = useState('overhead_squat');
  const [clientAge, setClientAge] = useState(30);
  const [clientGender, setClientGender] = useState<'male' | 'female'>('male');
  const [compensationSensitivity, setCompensationSensitivity] = useState<'low' | 'medium' | 'high'>('medium');
  
  // Model settings — default BlazePose for more keypoints; user can switch to MoveNet if needed
  const [modelType, setModelType] = useState<'movenet' | 'blazepose'>('blazepose');
  const defaultTuning = { scoreThreshold: 0.3 };

  // Results
  const [normativeComparisons, setNormativeComparisons] = useState<MovementComparisonResult[]>([]);
  
  // Check premium access
  useEffect(() => {
    if (!hasFeature('movementComparison') && !hasFeature('symmetryAnalysis')) {
      setShowSubscriptionModal(true);
    }
  }, [hasFeature]);
  
  // Pose detection
  const {
    keypoints,
    isLoading: poseLoading,
  } = usePoseDetection({
    videoRef,
    enabled: videoUrl !== null,
    modelType,
    tuning: defaultTuning,
  });

  const {
    metrics: poseMetrics,
  } = usePoseMetrics({ keypoints, timeSec: currentTime });
  
  // Symmetry analysis
  const {
    symmetryScore,
    analyzeSymmetry,
  } = useSymmetryAnalysis();
  
  // ArUco calibration for real-world measurements (height estimate when calibrated)
  const {
    calibration,
    isDetecting: arucoDetecting,
    detectMarkers,
    pixelsToCm,
  } = useArucoCalibration();

  // Auto-detect ArUco markers when video loads
  useEffect(() => {
    if (videoUrl && videoRef.current && videoRef.current.readyState >= 2 && !calibration.isCalibrated) {
      detectMarkers(videoRef.current).catch(() => {
        // Silently fail - calibration is optional
      });
    }
  }, [videoUrl, detectMarkers, calibration.isCalibrated]);

  // Compensation detection
  const {
    currentCompensations,
    alerts: compensationAlerts,
    processKeypoints: processCompensations,
    clearAlerts,
    getCompensationLabel,
  } = useCompensationDetection({ 
    enabled: activeTab === 'compensations',
    sensitivity: compensationSensitivity,
  });

  const keypointThreshold = defaultTuning.scoreThreshold;

  const getKeypoint = useCallback((names: string[]) => {
    for (const name of names) {
      const kp = findKeypoint(keypoints, name);
      if (kp && kp.score >= keypointThreshold) return kp;
    }
    return null;
  }, [keypoints, keypointThreshold]);

  const getJointAngle = useCallback((joint: string, side: 'left' | 'right'): number | null => {
    const hip = getKeypoint([`${side}_hip`, `hip_${side}`]);
    const shoulder = getKeypoint([`${side}_shoulder`, `shoulder_${side}`]);
    const elbow = getKeypoint([`${side}_elbow`, `elbow_${side}`]);
    const knee = getKeypoint([`${side}_knee`, `knee_${side}`]);
    const ankle = getKeypoint([`${side}_ankle`, `ankle_${side}`]);
    const foot = getKeypoint([`${side}_foot_index`, `foot_index_${side}`, `${side}_heel`, `heel_${side}`]);

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
  }, [getKeypoint]);

  const getMeasuredValue = useCallback((joint: string, movement: string): number | null => {
    if (movement !== 'flexion' && movement !== 'dorsiflexion' && movement !== 'abduction') {
      return null;
    }
    const left = getJointAngle(joint, 'left');
    const right = getJointAngle(joint, 'right');
    const values = [left, right].filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }, [getJointAngle]);

  const calculateNormativeComparisons = useCallback((): MovementComparisonResult[] => {
    const joints = MOVEMENT_JOINT_MAP[selectedMovement] ?? DEFAULT_JOINTS;
    const results: MovementComparisonResult[] = [];
    joints.forEach(({ joint, movement }) => {
      const hasNorm = NORMATIVE_ROM_DATA.some(n => n.joint === joint && n.movement === movement);
      if (!hasNorm) return;
      const measuredValue = getMeasuredValue(joint, movement);
      if (measuredValue === null) return;
      const comparison = compareToNormative(joint, movement, measuredValue, clientAge, clientGender);
      if (comparison) results.push(comparison);
    });
    return results;
  }, [keypoints, selectedMovement, clientAge, clientGender, getMeasuredValue]);

  // Process keypoints for active analysis
  useEffect(() => {
    if (keypoints.length > 0) {
      analyzeSymmetry(keypoints);
      setNormativeComparisons(calculateNormativeComparisons());
      if (activeTab === 'compensations') {
        processCompensations(keypoints, currentTime * 1000);
      }
    }
  }, [keypoints, analyzeSymmetry, processCompensations, activeTab, currentTime, calculateNormativeComparisons]);

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
      clearAlerts();
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

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <AnalysisHeader
        title="Movement Analysis"
        subtitle="Symmetry, Normative & Compensation Detection"
        badgeText="Premium Feature"
        badgeIcon={<Scale className="w-3 h-3" />}
        onBack={onBack}
      />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 pb-8">
        {/* Disclaimer */}
        <Alert className="mb-4 border-amber-200 bg-amber-50">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 text-sm">Precision Notice</AlertTitle>
          <AlertDescription className="text-amber-700 text-xs">
            {DISCLAIMER}
          </AlertDescription>
        </Alert>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Section — w-full so it stays within column, no viewport lock */}
          <div className="lg:col-span-2 space-y-4 min-w-0">
            {!videoUrl ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-12">
                  <div className="text-center">
                    <SplitSquareVertical className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">
                      Load a Movement Video
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Analyze symmetry, compare to normative data, and detect compensations
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Select Video
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Video Player — w-full + aspect-video so it fits column and scroll works */}
                <div
                  ref={containerRef}
                  className="relative bg-black rounded-lg overflow-hidden w-full aspect-video min-h-[200px] flex items-center justify-center"
                >
                  <VideoPlaybackBanner notice={videoPlaybackNotice} />
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className={`w-full h-full object-contain ${viewMode === 'mirror' ? 'scale-x-[-1]' : ''}`}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onLoadedData={() => inspectVideoElement(videoRef.current, true)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    playsInline
                  />
                  
                  {/* Pose Overlay */}
                  {showOverlay && keypoints.length > 0 && videoRef.current && (
                    <PoseOverlay
                      keypoints={keypoints}
                      videoWidth={videoRef.current.videoWidth}
                      videoHeight={videoRef.current.videoHeight}
                      canvasWidth={containerRef.current?.clientWidth || 640}
                      canvasHeight={containerRef.current?.clientHeight || 480}
                      {...getContainLayout(
                        containerRef.current?.clientWidth || 640,
                        containerRef.current?.clientHeight || 480,
                        videoRef.current.videoWidth,
                        videoRef.current.videoHeight
                      )}
                      modelType={modelType}
                      threshold={defaultTuning.scoreThreshold}
                      showAngles={activeTab === 'normative'}
                    />
                  )}

                  {/* Compensation Alerts Overlay */}
                  {activeTab === 'compensations' && (
                    <CompensationAlertOverlay currentCompensations={currentCompensations} />
                  )}

                  {/* Calibration badge — 3 states: scanning / calibrated / not found */}
                  {videoUrl && (arucoDetecting || calibration.isCalibrated || calibration.source === null) && (
                    <div className={`absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-medium z-20 shadow-lg flex items-center gap-1.5 ${
                      calibration.isCalibrated
                        ? 'bg-blue-500/90 text-white'
                        : arucoDetecting
                        ? 'bg-zinc-700/90 text-zinc-200'
                        : 'bg-amber-500/90 text-white'
                    }`}>
                      {calibration.isCalibrated ? (
                        <>
                          <ArucoIcon className="h-3 w-3 rounded-[2px]" />
                          <span>ArUco calibrated</span>
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

                {/* Video Controls */}
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={togglePlayPause}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  
                  <div className="flex-1">
                    <Slider
                      value={[currentTime]}
                      min={0}
                      max={duration || 1}
                      step={0.1}
                      onValueChange={([value]) => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = value;
                        }
                      }}
                    />
                  </div>
                  
                  <span className="text-sm text-slate-600 tabular-nums">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* View Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant={viewMode === 'normal' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('normal')}
                  >
                    Normal
                  </Button>
                  <Button
                    variant={viewMode === 'mirror' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('mirror')}
                    className="gap-1"
                  >
                    <FlipHorizontal className="w-4 h-4" />
                    Mirror
                  </Button>
                  
                  <div className="flex-1" />
                  
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-600">Overlay</Label>
                    <Switch
                      checked={showOverlay}
                      onCheckedChange={setShowOverlay}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Analysis Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Assessment pattern</CardTitle>
                <CardDescription>Select the movement pattern to analyze</CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedMovement}
                  onValueChange={setSelectedMovement}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSESSMENT_PATTERNS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Guide: expected movement and plane for selected pattern */}
            {PATTERN_GUIDE[selectedMovement] && (
              <Card className="border-emerald-200 bg-emerald-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-900">Recording guide</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-slate-700">
                  <p><span className="font-medium text-slate-900">Movement:</span> {PATTERN_GUIDE[selectedMovement].movement}</p>
                  <p><span className="font-medium text-slate-900">Plane:</span> {PATTERN_GUIDE[selectedMovement].plane}</p>
                </CardContent>
              </Card>
            )}

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AnalysisTab)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="symmetry" className="text-xs">
                  <SplitSquareVertical className="w-3 h-3 mr-1" />
                  Symmetry
                </TabsTrigger>
                <TabsTrigger value="normative" className="text-xs">
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Normative
                </TabsTrigger>
                <TabsTrigger value="compensations" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Alerts
                </TabsTrigger>
              </TabsList>

              {/* Symmetry Tab */}
              <TabsContent value="symmetry" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Bilateral Symmetry</CardTitle>
                    <CardDescription>Left vs right comparison</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {keypoints.length > 0 && symmetryScore ? (
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className={`text-3xl font-bold ${getScoreColor(symmetryScore.overall)}`}>
                            {symmetryScore.overall.toFixed(0)}%
                          </div>
                          <p className="text-xs text-slate-500">Overall Symmetry</p>
                        </div>
                        
                        <div className="space-y-2">
                          {[
                            { key: 'angles', label: 'Angular Symmetry', value: symmetryScore.angles },
                            { key: 'rom', label: 'ROM Symmetry', value: symmetryScore.rom },
                            { key: 'timing', label: 'Timing Symmetry', value: symmetryScore.timing },
                          ].map(({ key, label, value }) => (
                            <div key={key} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-600">
                                  {label}
                                </span>
                                <span className={getScoreColor(value)}>{value.toFixed(0)}%</span>
                              </div>
                              <Progress value={value} className="h-1.5" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <SplitSquareVertical className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Load a video to see symmetry analysis</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Normative Tab */}
              <TabsContent value="normative" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Normative Comparison</CardTitle>
                    <CardDescription>Compare to population data</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Client Settings */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <Label className="text-xs text-slate-600">Age</Label>
                        <Select
                          value={clientAge.toString()}
                          onValueChange={(v) => setClientAge(parseInt(v))}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[20, 30, 40, 50, 60, 70].map(age => (
                              <SelectItem key={age} value={age.toString()}>{age}s</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600">Gender</Label>
                        <Select
                          value={clientGender}
                          onValueChange={(v) => setClientGender(v as 'male' | 'female')}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {normativeComparisons.length > 0 ? (
                      <div className="space-y-3">
                        {normativeComparisons.map((comp, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium capitalize">{comp.joint} {comp.movement.replace('_', ' ')}</span>
                              <Badge variant={comp.status === 'within_normal' ? 'secondary' : 'destructive'}>
                                {comp.status === 'within_normal' ? 'Normal' : comp.status === 'below_normal' ? 'Below Normal' : 'Above Normal'}
                              </Badge>
                            </div>
                            <div className="text-xs text-slate-600">
                              <div>Measured: {comp.measuredValue.toFixed(1)}°</div>
                              <div>Normative (median): {comp.normativeValue.toFixed(1)}°</div>
                              <div className="mt-1">
                                Percentile: <span className={getScoreColor(comp.percentile)}>{comp.percentile.toFixed(0)}%</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Load a video to see normative comparison</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Compensations Tab */}
              <TabsContent value="compensations" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      Compensation Detection
                    </CardTitle>
                    <CardDescription>Real-time movement pattern alerts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Sensitivity Setting */}
                    <div className="mb-4">
                      <Label className="text-xs text-slate-600">Sensitivity</Label>
                      <Select
                        value={compensationSensitivity}
                        onValueChange={(v) => setCompensationSensitivity(v as 'low' | 'medium' | 'high')}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low (fewer alerts)</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High (more sensitive)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {videoUrl ? (
                      currentCompensations.length > 0 ? (
                        <CompensationAlerts 
                          currentCompensations={currentCompensations}
                          onDismiss={clearAlerts}
                        />
                      ) : (
                        <div className="text-center py-8 text-green-600">
                          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-100 flex items-center justify-center">
                            ✓
                          </div>
                          <p className="text-sm font-medium">No compensations detected</p>
                          <p className="text-xs text-slate-500 mt-1">Movement pattern looks good!</p>
                        </div>
                      )
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Load a video to detect compensations</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Alert History */}
                {compensationAlerts.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Alert History</CardTitle>
                      <CardDescription>{compensationAlerts.length} alerts recorded</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {compensationAlerts.slice(-10).reverse().map((alert, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs p-2 bg-slate-50 rounded">
                            <span className="text-slate-400 tabular-nums">
                              {(alert.timestamp / 1000).toFixed(1)}s
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {alert.severity}
                            </Badge>
                            <span className="text-slate-700">{getCompensationLabel(alert.type)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            {/* Model Settings */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  Detection Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-slate-600">AI Model</Label>
                  <Select
                    value={modelType}
                    onValueChange={(v) => setModelType(v as 'movenet' | 'blazepose')}
                  >
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="movenet">MoveNet (faster)</SelectItem>
                      <SelectItem value="blazepose">BlazePose (more keypoints)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Scale reference — ArUco only; show estimated height when calibrated */}
                <div className="pt-3 border-t border-slate-100">
                  <Label className="text-xs text-slate-600 mb-1.5 block">Scale reference</Label>
                  {calibration.isCalibrated ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-blue-600">
                        <ArucoIcon className="h-3 w-3 rounded-[2px]" />
                        <span>ArUco calibrated</span>
                      </div>
                      {poseMetrics.bodyHeight && pixelsToCm(poseMetrics.bodyHeight) != null && (
                        <p className="text-xs text-slate-600">
                          Estimated height: <span className="font-medium">{pixelsToCm(poseMetrics.bodyHeight)!.toFixed(0)} cm</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">ArUco not found</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Export Button */}
            {videoUrl && (
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
        featureName="Movement Analysis"
      />
    </div>
  );
}
