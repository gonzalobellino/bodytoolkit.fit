import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Upload, 
  Video as VideoIcon, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Minus,
  ZoomIn,
  ZoomOut,
  Circle,
  Square,
  Download,
  Grid3x3,
  Camera,
  SwitchCamera,
  Trash2,
  RotateCcw,
  Undo,
  Bookmark,
  Share2,
  Clock,
  Repeat,
  Globe,
  X,
  Move,
  Pencil,
  Volume2,
  VolumeX,
  ChevronsLeft,
  ChevronsRight,
  Split,
  PanelLeftClose,
  PanelLeftOpen,
  Compass,
  Maximize2,
  Minimize2,
  Palette,
  Hand,
  ArrowRight,
  Brain,
  Ruler,
} from 'lucide-react';

// ArUco marker icon (SVG inline, replicates the look of an ArUco sticker)
const ArucoIcon = ({ className }: { className?: string }): React.JSX.Element => (
  <svg viewBox="0 0 12 12" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="12" height="12" fill="black" />
    {/* White inner cells — pattern from ArUco 4x4 ID #0 */}
    <rect x="4" y="2" width="2" height="2" fill="white" />
    <rect x="4" y="4" width="6" height="2" fill="white" />
    <rect x="2" y="6" width="6" height="2" fill="white" />
    <rect x="4" y="8" width="2" height="2" fill="white" />
    <rect x="8" y="8" width="2" height="2" fill="white" />
  </svg>
);
import { PlumbLineButton } from './PlumbLineButton';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Separator } from './ui/separator';
import { usePoseDetection } from '../hooks/usePoseDetection';
import { usePoseTrails } from '../hooks/usePoseTrails';
import { PoseOverlay } from './PoseOverlay';
import { CenterOfMassCanvas } from './CenterOfMassCanvas';
import { KeypointToolbar } from './KeypointToolbar';
import { AnalysisHeader } from './AnalysisHeader';
import { usePremium } from '../contexts/PremiumContext';
import { SubscriptionModal } from './ui/SubscriptionModal';
import { LimitedTimeFreeModal } from './ui/LimitedTimeFreeModal';
import { PremiumBadge } from './ui/PremiumBadge';
import { PREMIUM_PAYMENTS_ENABLED } from '../config/env';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { getContainLayout } from '../utils/videoLayout';
import {
  normalizeAngle,
  getAngleDifference,
  hexToRgba,
  invertHexColor,
  rotateHexChannels,
  getArcData,
  drawPieSlice,
  strokePieArc,
  getGoniometerRadius,
  drawSpot,
  drawAngleText,
  drawLineHorizontalAngles,
  drawVertexAngleLabels,
  drawPlumbLinePreview,
  drawPlumbLine,
} from '../utils/drawingUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';
import { usePosePresets, type PoseTuningParams } from '../hooks/usePosePresets';
import { usePoseMetrics } from '../hooks/usePoseMetrics';
import { drawWatermark } from '../utils/watermark';
import { calculateCenterOfMass, calculateBalancePoint } from '../utils/poseAnalysis';
import { 
  applyManualOffsets, 
  getReferenceKeypoints, 
  screenToLocalOffset,
  type KeypointOffset 
} from '../utils/keypointOffsets';
import { useFileDropzone } from '../hooks/useFileDropzone';
import { useVideoPlaybackNotice } from '../hooks/useVideoPlaybackNotice';
import { VideoPlaybackBanner } from './VideoPlaybackBanner';
import { useFullscreen } from '../hooks/useFullscreen';
import { useExportShare } from '../hooks/useExportShare';
import { useArucoCalibration } from '../hooks/useArucoCalibration';
import { useEnsurePageScroll } from '../hooks/useEnsurePageScroll';

interface VideoAnalysisProps {
  onBack: () => void;
  onSwitchToDual?: () => void;
}

type Tool = 'select' | 'line' | 'angle' | 'circle' | 'freehand' | 'goniometer' | 'plumbline';
type DrawingMode = 'global' | 'timebound';
type MobileToolbarMode = 'hidden' | 'icons' | 'expanded';

interface Point {
  x: number;
  y: number;
}

interface DrawingElement {
  id: string;
  type: Tool;
  points: Point[];
  color: string;
  mode: DrawingMode;
  timeRange?: { start: number; end: number };
  axisAngle?: number;
}

interface Marker {
  id: string;
  time: number;
  color: string;
  label: string;
}

  const COLORS = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' },
  ];

const cycleColor = (current: string): string => {
  const index = COLORS.findIndex((c) => c.value.toLowerCase() === current.toLowerCase());
  if (index === -1) return COLORS[0].value;
  return COLORS[(index + 1) % COLORS.length].value;
};

// Sound effects hook
function useCountdownSounds(): { playCountdownTick: () => void; playRecordStart: () => void; playRecordEnd: () => void; } {
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }
    return audioContextRef.current;
  }, []);
  
  const playBeep = useCallback((frequency: number, duration: number, volume: number = 0.3) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  }, [getAudioContext]);
  
  const playCountdownTick = useCallback(() => playBeep(800, 0.15, 0.2), [playBeep]);
  const playRecordStart = useCallback(() => playBeep(1200, 0.3, 0.4), [playBeep]);
  const playRecordEnd = useCallback(() => playBeep(600, 0.5, 0.3), [playBeep]);
  
  return { playCountdownTick, playRecordStart, playRecordEnd };
}

const videoScrubberClassName =
  'w-full [&_[data-slot=slider-track]]:h-0.5 [&_[data-slot=slider-thumb]]:size-2';
const videoScrubberRestClassName =
  'w-full [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-thumb]]:size-2';

export function VideoAnalysis({ onBack, onSwitchToDual }: VideoAnalysisProps): React.JSX.Element {
  useEnsurePageScroll(true);
  // Premium check
  const { hasFeature, activateTier } = usePremium();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showLimitedTimeModal, setShowLimitedTimeModal] = useState(false);
  const [subscriptionFeatureName, setSubscriptionFeatureName] = useState<string>('Premium Feature');
  
  // Refs - must be declared before hooks that use them
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const countdownTimeoutsRef = useRef<number[]>([]);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const scheduleRenderRef = useRef<() => void>(() => {});
  
  // Container dimensions tracked via ResizeObserver so overlay sizing never reads
  // the DOM directly during render (BUG-17).
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Video states
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const {
    notice: videoPlaybackNotice,
    inspectFile: inspectVideoFile,
    inspectVideo: inspectVideoElement,
    reset: resetVideoPlaybackNotice,
  } = useVideoPlaybackNotice();

  // Fullscreen hook
  const { toggleFullscreen, exitFullscreen } = useFullscreen({
    elementRef: fullscreenRef,
    isFullscreen,
    setIsFullscreen,
  });

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [countdownActive, setCountdownActive] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [videoElementKey, setVideoElementKey] = useState(0);

  // File dropzone hook
  const handleVideoFileSelect = useCallback((file: File) => {
    inspectVideoFile(file);
    const url = URL.createObjectURL(file);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute('src');
      videoRef.current.currentTime = 0;
      videoRef.current.load();
    }
    setCameraActive(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setVideoElementKey((key) => key + 1);
    setVideoUrl(url);
  }, [inspectVideoFile]);

  const {
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileChange,
  } = useFileDropzone({
    accept: ['video/*'],
    onFileSelect: handleVideoFileSelect,
    onDragActiveChange: setDragActive,
  });
  
  // AI Analysis states
  const [aiAnalysisEnabled, setAiAnalysisEnabled] = useState(false);
  const [modelType, setModelType] = useState<'movenet' | 'blazepose'>('blazepose');
  const [pendingAiEnable, setPendingAiEnable] = useState(false);
  const showTuningPanel = import.meta.env.VITE_AI_TUNING_PANEL === 'true';
  const { presets, defaultPresetId } = usePosePresets('video');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [tuningParams, setTuningParams] = useState<PoseTuningParams | null>(null);
  
  // Trails states - per keypoint configuration
  const [selectedKeypoint, setSelectedKeypoint] = useState<number | null>(null);
  const [keypointDragMode, setKeypointDragMode] = useState<boolean>(false); // Mode: true = drag, false = select
  const [hoveredKeypointIndex, setHoveredKeypointIndex] = useState<number | null>(null); // Track hover state for pointer events
  const [trailConfigs, setTrailConfigs] = useState<Record<number, { enabled: boolean; color: string }>>({});
  // Global trail config that persists between keypoints (for reuse)
  const [globalTrailConfig, setGlobalTrailConfig] = useState<{ enabled: boolean; color: string }>({
    enabled: false,
    color: '#ffff00',
  });
  const [trailLength, setTrailLength] = useState(60); // Default: 60 frames (~2 seconds at 30fps)
  const [trailOpacity, setTrailOpacity] = useState(0.5);
  
  // Manual keypoint offsets for drag adjustments
  const [manualOffsets, setManualOffsets] = useState<Map<number, KeypointOffset>>(new Map());
  
  // Center of mass and balance point visualization
  const [showCenterOfMass, setShowCenterOfMass] = useState(false);
  const [showBalancePoint, setShowBalancePoint] = useState(false);
  
  // Joint angles overlay
  const [showJointAngles, setShowJointAngles] = useState(false);
  
  // Mobile toolbar state
  const [toolbarExpanded, setToolbarExpanded] = useState(false);
  const [mobileToolbarMode, setMobileToolbarMode] = useState<MobileToolbarMode>('icons');

  useEffect(() => {
    // When a video is loaded, auto-hide tools to maximize video space.
    // When cleared, show tools (icon mode) again.
    setMobileToolbarMode(videoUrl ? 'hidden' : 'icons');
  }, [videoUrl]);

  // Drawing states - using ref for mutable state like original app
  const [selectedTool, setSelectedTool] = useState<Tool>('select');
  const [selectedColor, setSelectedColor] = useState('#EF4444');
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('global');
  const [showGrid, setShowGrid] = useState(false);
  
  // Mutable drawing state (like original app)
  const drawingsRef = useRef<DrawingElement[]>([]);
  const pendingPointsRef = useRef<Point[]>([]);
  const cursorRef = useRef<Point | null>(null);
  const dragPointRef = useRef<Point | null>(null);
  const dragShapeRef = useRef<DrawingElement | null>(null);
  const selectedShapeRef = useRef<DrawingElement | null>(null);
  const dragStartRef = useRef<Point | null>(null);
  const hoverPointRef = useRef<Point | null>(null);
  const hoverShapeRef = useRef<DrawingElement | null>(null);
  const dragAxisRef = useRef<DrawingElement | null>(null);
  const hoverAxisRef = useRef<DrawingElement | null>(null);
  const freehandDrawingRef = useRef(false);
  const freehandShapeRef = useRef<DrawingElement | null>(null);
  const ignoreClickUntilRef = useRef(0);
  const panStartRef = useRef<Point | null>(null);
  const panOriginRef = useRef<Point>({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastVideoMetricsRef = useRef<{
    width: number;
    height: number;
    drawWidth: number;
    drawHeight: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  
  // Force re-render trigger
  const [renderTrigger, setRenderTrigger] = useState(0);
  const forceRender = useCallback(() => setRenderTrigger(n => n + 1), []);
  
  // Markers and loop
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [loopPoints, setLoopPoints] = useState<{ start: number | null; end: number | null }>({ start: null, end: null });
  const [isLooping, setIsLooping] = useState(false);
  const [toolsDrawerOpen, setToolsDrawerOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  // Pose detection hook
  const {
    isLoading: poseDetectionLoading,
    keypoints,
    error: poseError,
    detectPose,
    debugInfo,
    cameraOrientation,
  } = usePoseDetection({
    videoRef,
    enabled: aiAnalysisEnabled && (videoUrl !== null || cameraActive) && hasFeature('aiPoseDetection'),
    modelType,
    tuning: tuningParams ?? undefined,
  });
  const {
    metrics: poseMetrics,
    markSwingStart,
    markImpact,
    clearSwingMarkers,
  } = usePoseMetrics({ keypoints, timeSec: currentTime });

  // Pose trails
  const {
    trailHistory,
    resetTrails,
  } = usePoseTrails({
    keypoints,
    currentTime,
    enabled: aiAnalysisEnabled && (videoUrl !== null || cameraActive),
    maxTrailLength: trailLength,
    minScoreThreshold: tuningParams?.scoreThreshold ?? 0.3,
    trailConfigs,
  });

  // ArUco calibration for real-world measurements
  const {
    calibration,
    isDetecting: arucoDetecting,
    error: arucoError,
    detectMarkers,
    pixelsToCm,
    setManualCalibration,
  } = useArucoCalibration();

  const [patientHeight, setPatientHeight] = useState<number | ''>('');
  const handleApplyPatientHeight = useCallback(() => {
    if (patientHeight && poseMetrics.bodyHeight) {
      setManualCalibration(patientHeight as number, poseMetrics.bodyHeight);
    }
  }, [patientHeight, poseMetrics.bodyHeight, setManualCalibration]);

  // Re-detect ArUco when user seeks the video to a new frame
  const handleVideoSeeked = useCallback(() => {
    if (videoRef.current && !calibration.isCalibrated && !arucoDetecting) {
      detectMarkers(videoRef.current).catch(() => {});
    }
  }, [calibration.isCalibrated, arucoDetecting, detectMarkers]);

  // Auto-detect ArUco markers when video loads or on first frame
  useEffect(() => {
    if (videoUrl && videoRef.current && videoRef.current.readyState >= 2 && !calibration.isCalibrated) {
      // Try to detect markers on current frame
      detectMarkers(videoRef.current).catch(() => {});
    }
  }, [videoUrl, detectMarkers, calibration.isCalibrated]);

  useEffect(() => {
    if (!presets.length) return;
    const fallbackId = presets.some((preset) => preset.id === defaultPresetId)
      ? defaultPresetId
      : presets[0].id;
    setSelectedPresetId((prev) => (prev && presets.some((preset) => preset.id === prev) ? prev : fallbackId));
  }, [defaultPresetId, presets]);

  useEffect(() => {
    if (zoom <= 1) {
      setPanOffset({ x: 0, y: 0 });
    }
  }, [zoom]);

  useEffect(() => {
    if (!videoUrl) return;
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    lastVideoMetricsRef.current = null;
  }, [videoUrl]);

  const resetVideo = useCallback(() => {
    if (isFullscreen) {
      void exitFullscreen();
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
    setVideoUrl(null);
    setIsPlaying(false);
    drawingsRef.current = [];
    pendingPointsRef.current = [];
    setMarkers([]);
    setLoopPoints({ start: null, end: null });
    setCurrentTime(0);
    setDuration(0);
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    lastVideoMetricsRef.current = null;
    resetTrails();
    setSelectedKeypoint(null);
    setTrailConfigs({});
    setVideoElementKey((key) => key + 1);
    resetVideoPlaybackNotice();
  }, [exitFullscreen, isFullscreen, resetVideoPlaybackNotice, resetTrails]);

  useEffect(() => {
    if (!selectedPresetId) return;
    const preset = presets.find((item) => item.id === selectedPresetId);
    if (!preset) return;
    setTuningParams(preset.params);
    if (preset.modelType) {
      setModelType(preset.modelType);
    }
  }, [presets, selectedPresetId]);

  // Camera orientation mismatch warning:
  // Shown when the detected view angle doesn't match what the active preset expects
  // (e.g. golf preset expects lateral view but frontal video was loaded).
  const activePreset = presets.find((p) => p.id === selectedPresetId);
  const orientationMismatch =
    aiAnalysisEnabled &&
    cameraOrientation.orientation !== 'unknown' &&
    cameraOrientation.confidence >= 0.5 &&
    activePreset?.expectedView !== undefined &&
    !activePreset.expectedView.includes(cameraOrientation.orientation);

  const orientationLabel: Record<string, string> = {
    'lateral-left':  'lateral (left)',
    'lateral-right': 'lateral (right)',
    'frontal':       'frontal',
    'overhead':      'overhead',
    'unknown':       'unknown',
  };
  

  const debugPoseInfo = useCallback(() => {
    const scores = keypoints.map((kp) => kp.score ?? 0);
    const xs = keypoints.map((kp) => kp.x ?? 0);
    const ys = keypoints.map((kp) => kp.y ?? 0);
    const maxScore = Math.max(...scores, 0);
    const maxX = Math.max(...xs, 0);
    const maxY = Math.max(...ys, 0);
    const minX = Math.min(...xs, 0);
    const minY = Math.min(...ys, 0);
    return {
      count: keypoints.length,
      maxScore: maxScore.toFixed(3),
      maxX: maxX.toFixed(2),
      maxY: maxY.toFixed(2),
      minX: minX.toFixed(2),
      minY: minY.toFixed(2),
      videoW: videoRef.current?.videoWidth ?? 0,
      videoH: videoRef.current?.videoHeight ?? 0,
    };
  }, [keypoints]);

  const formatMetric = useCallback((value: number | undefined, decimals: number, suffix = '') => {
    return value !== undefined ? `${value.toFixed(decimals)}${suffix}` : '--';
  }, []);

  const formatScaledMetric = useCallback((
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
  }, [calibration.isCalibrated, pixelsToCm]);

  const openPremiumGate = useCallback((featureName: string, forAiAnalysis = false) => {
    setSubscriptionFeatureName(featureName);
    if (forAiAnalysis) setPendingAiEnable(true);
    if (PREMIUM_PAYMENTS_ENABLED) {
      setShowSubscriptionModal(true);
    } else {
      setShowLimitedTimeModal(true);
    }
  }, []);

  // Handle AI Analysis toggle
  const handleToggleAiAnalysis = (): void => {
    if (!hasFeature('aiPoseDetection')) {
      openPremiumGate('AI Analysis', true);
      return;
    }
    setAiAnalysisEnabled(!aiAnalysisEnabled);
  };

  const handleSelectModelType = useCallback((next: 'movenet' | 'blazepose') => {
    if (!hasFeature('aiPoseDetection')) {
      openPremiumGate('AI Analysis');
      return;
    }
    setModelType(next);
  }, [hasFeature, openPremiumGate]);

  useEffect(() => {
    if (pendingAiEnable && hasFeature('aiPoseDetection')) {
      setAiAnalysisEnabled(true);
      setPendingAiEnable(false);
    }
  }, [pendingAiEnable, hasFeature]);
  
  // Handle Dual Video click
  const handleDualVideoClick = (): void => {
    if (!hasFeature('dualVideoSync')) {
      openPremiumGate('Dual Video Analysis');
      return;
    }
    if (onSwitchToDual) {
      onSwitchToDual();
    }
  };

  const handleLimitedTimeGetStarted = useCallback(() => {
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    activateTier('pro', `limited_${Date.now()}`, expiresAt);
    setShowLimitedTimeModal(false);
    if (subscriptionFeatureName === 'AI Analysis') {
      setPendingAiEnable(true);
    }
    if (subscriptionFeatureName === 'Dual Video Analysis' && onSwitchToDual) {
      onSwitchToDual();
    }
  }, [activateTier, subscriptionFeatureName, onSwitchToDual]);

  // Handle keypoint click for trail menu
  const handleKeypointClick = useCallback((index: number, x: number, y: number) => {
    setSelectedKeypoint(index);
    // Don't reset drag mode - keep it persistent across keypoint selection
    // Apply global trail config to the newly selected keypoint if it's enabled
    if (globalTrailConfig.enabled) {
      setTrailConfigs(prev => ({
        ...prev,
        [index]: {
          enabled: true,
          color: globalTrailConfig.color,
        },
      }));
    }
  }, [globalTrailConfig]);

  // Handle keypoint drag for manual adjustment
  const handleKeypointDrag = useCallback((
    keypointIndex: number,
    newX: number,
    newY: number,
    originalX: number,
    originalY: number
  ) => {
    const kp = keypoints[keypointIndex];
    if (!kp) return;

    // Calculate offset in video coordinates
    const screenOffset = {
      x: newX - originalX,
      y: newY - originalY,
    };

    // Only save offset if there's a significant movement (avoid saving accidental tiny movements)
    const offsetDistance = Math.hypot(screenOffset.x, screenOffset.y);
    if (offsetDistance < 0.01) {
      // Too small to be a real adjustment, don't save
      return;
    }

    // Get reference keypoints for this keypoint
    const references = getReferenceKeypoints(keypointIndex, keypoints);
    
    if (!references || !references.start || !references.end) {
      // No references available, use absolute offset as fallback
      setManualOffsets(prev => {
        const newMap = new Map(prev);
        newMap.set(keypointIndex, {
          keypointIndex,
          offsetLocal: {
            alongSegment: screenOffset.x,
            perpendicular: screenOffset.y,
          },
          referenceKeypoints: null,
          frameTime: currentTime,
        });
        return newMap;
      });
      return;
    }

    // Find indices of reference keypoints.
    // Do NOT fall back to '' on a missing name: ''.includes('') is true for every
    // string, which would silently return index 0 (nose) instead of -1 (BUG-14).
    const startName = references.start!.name?.toLowerCase();
    const endName = references.end!.name?.toLowerCase();
    const startIdx = startName
      ? keypoints.findIndex(k => k.name?.toLowerCase().includes(startName))
      : -1;
    const endIdx = endName
      ? keypoints.findIndex(k => k.name?.toLowerCase().includes(endName))
      : -1;

    if (startIdx === -1 || endIdx === -1) return;

    // Convert to local coordinates
    const localOffset = screenToLocalOffset(
      screenOffset,
      references.start,
      references.end
    );

    setManualOffsets(prev => {
      const newMap = new Map(prev);
      newMap.set(keypointIndex, {
        keypointIndex,
        offsetLocal: localOffset,
        referenceKeypoints: {
          start: startIdx,
          end: endIdx,
        },
        frameTime: currentTime,
      });
      return newMap;
    });
  }, [keypoints, currentTime]);

  // Filter manual offsets to only include those up to current time (remove future offsets when scrubbing backwards)
  const filteredManualOffsets = useMemo(() => {
    if (manualOffsets.size === 0) return new Map<number, KeypointOffset>();
    const filtered = new Map<number, KeypointOffset>();
    manualOffsets.forEach((offset, index) => {
      // Only include offsets from current time or earlier
      if (offset.frameTime <= currentTime) {
        filtered.set(index, offset);
      }
    });
    return filtered;
  }, [manualOffsets, currentTime]);

  // Apply manual offsets to keypoints
  const adjustedKeypoints = useMemo(() => {
    if (filteredManualOffsets.size === 0) return keypoints;
    return applyManualOffsets(keypoints, filteredManualOffsets);
  }, [keypoints, filteredManualOffsets]);

  // Calculate center of mass and balance point
  const centerOfMass = useMemo(() => {
    if (!showCenterOfMass || !aiAnalysisEnabled) return null;
    return calculateCenterOfMass(adjustedKeypoints);
  }, [adjustedKeypoints, showCenterOfMass, aiAnalysisEnabled]);

  const balancePoint = useMemo(() => {
    if (!showBalancePoint || !aiAnalysisEnabled) return null;
    return calculateBalancePoint(adjustedKeypoints);
  }, [adjustedKeypoints, showBalancePoint, aiAnalysisEnabled]);

  const handleToggleTrailForKeypoint = useCallback((index: number) => {
    setTrailConfigs(prev => {
      const current = prev[index];
      const newEnabled = !current?.enabled;
      const newColor = current?.color || globalTrailConfig.color;
      
      // Update global config so it persists for next keypoint
      setGlobalTrailConfig({
        enabled: newEnabled,
        color: newColor,
      });
      
      return {
        ...prev,
        [index]: {
          enabled: newEnabled,
          color: newColor,
        },
      };
    });
  }, [globalTrailConfig.color]);

  const handleChangeTrailColor = useCallback((index: number, color: string) => {
    setGlobalTrailConfig(prev => ({ ...prev, color }));
    setTrailConfigs(prev => ({
      ...prev,
      [index]: {
        enabled: prev[index]?.enabled ?? globalTrailConfig.enabled,
        color,
      },
    }));
  }, [globalTrailConfig.enabled]);
  
  // Handler for resetting keypoint offset
  const handleResetKeypointOffset = useCallback((index: number) => {
    setManualOffsets(prev => {
      const newMap = new Map(prev);
      newMap.delete(index);
      return newMap;
    });
  }, []);

  const handleCloseKeypointMenu = useCallback(() => {
    setSelectedKeypoint(null);
    setKeypointDragMode(false);
  }, []);

  // Close keypoint menu when clicking outside (only in select mode, not drag mode)
  useEffect(() => {
    if (selectedKeypoint === null || keypointDragMode) return;

    const handleClickOutside = (e: MouseEvent): void => {
      const target = e.target as HTMLElement;
      // Don't close if clicking on keypoint toolbar or its children
      if (target.closest('.keypoint-menu') || target.closest('[data-keypoint-toolbar]')) {
        return;
      }
      // Don't close if clicking on a keypoint (PoseOverlay will handle that)
      if (target.closest('canvas[style*="z-index: 15"]')) {
        return;
      }
      // Close the menu
      handleCloseKeypointMenu();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedKeypoint, keypointDragMode, handleCloseKeypointMenu]);

  // Reset trails and offsets when video changes
  useEffect(() => {
    if (!videoUrl) {
      resetTrails();
      setTrailConfigs({});
      setSelectedKeypoint(null);
      setKeypointDragMode(false);
      setManualOffsets(new Map());
    }
  }, [videoUrl, resetTrails]);
  
  // Sound effects
  const { playCountdownTick, playRecordStart, playRecordEnd } = useCountdownSounds();

  const getCanvasScreenPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>): Point => {
    // Use containerRef instead of canvasRef to avoid CSS transform affecting coordinates
    // The canvas is inside a transformed div, so its getBoundingClientRect includes the transform
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  // Convert pointer event to canvas buffer coordinates.
  // The canvas sits inside a CSS-transformed div (translate + scale).
  // canvas.getBoundingClientRect() returns the *visual* rect (post-transform),
  // so the ratio canvas.width / rect.width correctly inverts the CSS scale.
  const getCanvasPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const getVideoMetrics = useCallback((width: number, height: number) => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video?.videoHeight || width <= 0 || height <= 0) {
      return null;
    }
    const layout = getContainLayout(width, height, video.videoWidth, video.videoHeight);
    return {
      width,
      height,
      drawWidth: layout.drawWidth,
      drawHeight: layout.drawHeight,
      offsetX: layout.offsetX,
      offsetY: layout.offsetY
    };
  }, [videoRef]);

  // Point to segment distance
  const pointToSegmentDistance = (px: number, py: number, p1: Point, p2: Point): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) return Math.hypot(px - p1.x, py - p1.y);
    
    let t = ((px - p1.x) * dx + (py - p1.y) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));
    
    const nearestX = p1.x + t * dx;
    const nearestY = p1.y + t * dy;
    return Math.hypot(px - nearestX, py - nearestY);
  };
  
  // Find nearest point (returns direct reference to point object)
  const findNearestPoint = useCallback((x: number, y: number, radius: number = 20): Point | null => {
    const points: Point[] = [];
    drawingsRef.current.forEach(shape => {
      if (shape.type === 'freehand') return;
      // Check if shape is visible at current time
      if (shape.mode === 'timebound' && shape.timeRange) {
        if (currentTime < shape.timeRange.start || currentTime > shape.timeRange.end) return;
      }
      shape.points.forEach(pt => points.push(pt));
    });
    pendingPointsRef.current.forEach(pt => points.push(pt));
    
    let nearest: Point | null = null;
    let nearestDist = radius / Math.max(zoom, 0.1);
    points.forEach(pt => {
      const dist = Math.hypot(pt.x - x, pt.y - y);
      if (dist <= nearestDist) {
        nearestDist = dist;
        nearest = pt;
      }
    });
    return nearest;
  }, [currentTime, zoom]);

  const findShapeForPoint = useCallback((point: Point) => {
    for (const shape of drawingsRef.current) {
      const index = shape.points.indexOf(point);
      if (index !== -1) {
        return { shape, index };
      }
    }
    return null;
  }, []);
  
  // Find nearest shape (returns direct reference to shape object)
  const findNearestShape = useCallback((x: number, y: number, threshold: number = 12): DrawingElement | null => {
    let nearest: DrawingElement | null = null;
    let nearestDist = threshold / Math.max(zoom, 0.1);

    drawingsRef.current.forEach(shape => {
      // Check visibility
      if (shape.mode === 'timebound' && shape.timeRange) {
        if (currentTime < shape.timeRange.start || currentTime > shape.timeRange.end) return;
      }
      if (!shape.points || shape.points.length < 2) return;
      
      if (shape.type === 'circle') {
        const center = shape.points[0];
        const edge = shape.points[1];
        const radius = Math.hypot(edge.x - center.x, edge.y - center.y);
        const dist = Math.abs(Math.hypot(x - center.x, y - center.y) - radius);
        if (dist <= nearestDist) {
          nearestDist = dist;
          nearest = shape;
        }
        return;
      }

      if (shape.type === 'goniometer' && shape.points.length >= 2) {
        const pivot = shape.points[0];
        const p1 = shape.points[1];
        const dist1 = pointToSegmentDistance(x, y, pivot, p1);
        if (dist1 <= nearestDist) {
          nearestDist = dist1;
          nearest = shape;
        }
        return;
      }
      
      // For lines, angles, freehand - check distance to segments
      for (let i = 0; i < shape.points.length - 1; i++) {
        const p1 = shape.points[i];
        const p2 = shape.points[i + 1];
        const dist = pointToSegmentDistance(x, y, p1, p2);
        if (dist <= nearestDist) {
          nearestDist = dist;
          nearest = shape;
        }
      }
    });
    return nearest;
  }, [currentTime, zoom]);

  const findGoniometerHandle = useCallback((x: number, y: number, radius: number = 12): DrawingElement | null => {
    let nearest: DrawingElement | null = null;
    let nearestDist = radius / Math.max(zoom, 0.1);

    drawingsRef.current.forEach(shape => {
      if (shape.mode === 'timebound' && shape.timeRange) {
        if (currentTime < shape.timeRange.start || currentTime > shape.timeRange.end) return;
      }
      if (shape.type !== 'goniometer' || shape.points.length < 2) return;
      const pivot = shape.points[0];
      const p1 = shape.points[1];
      const axisAngle = shape.axisAngle ?? 0;
      const axisRadius = getGoniometerRadius(pivot, p1, p1);
      const axisRad = (axisAngle * Math.PI) / 180;
      const handleX = pivot.x + Math.cos(axisRad) * axisRadius;
      const handleY = pivot.y + Math.sin(axisRad) * axisRadius;
      const dist = Math.hypot(x - handleX, y - handleY);
      if (dist <= nearestDist) {
        nearestDist = dist;
        nearest = shape;
      }
    });
    return nearest;
  }, [currentTime, zoom]);
  
  // Render canvas (called on every frame during interaction)
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(rect.width));
    const nextHeight = Math.max(1, Math.round(rect.height));
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const metrics = getVideoMetrics(canvas.width, canvas.height);
    if (metrics) {
      lastVideoMetricsRef.current = metrics;
    }

    // Draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      const gridSize = 50;
      
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    }

    // Draw completed shapes
    drawingsRef.current.forEach((drawing) => {
      if (drawing.mode === 'timebound' && drawing.timeRange) {
        if (currentTime < drawing.timeRange.start || currentTime > drawing.timeRange.end) {
          return;
        }
      }

      const isHovered =
        hoverShapeRef.current === drawing ||
        dragShapeRef.current === drawing ||
        selectedShapeRef.current === drawing;
      const isAxisHovered = hoverAxisRef.current === drawing || dragAxisRef.current === drawing;
      ctx.strokeStyle = drawing.color;
      ctx.fillStyle = drawing.color;
      ctx.lineWidth = (isHovered ? 4 : 3);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Draw spots - NOT for freehand
      if (drawing.type !== 'freehand') {
        drawing.points.forEach((p) => {
          const isPointHovered = hoverPointRef.current === p || dragPointRef.current === p;
          drawSpot(ctx, p, drawing.color, isPointHovered || isHovered);
        });
      }

      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = (isHovered ? 4 : 3);
      
      if (drawing.type === 'line' && drawing.points.length === 2) {
        ctx.beginPath();
        ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
        ctx.lineTo(drawing.points[1].x, drawing.points[1].y);
        ctx.stroke();
        drawLineHorizontalAngles(ctx, drawing.points[0], drawing.points[1]);
      } else if (drawing.type === 'plumbline' && drawing.points.length === 1) {
        drawPlumbLine(ctx, drawing.points[0], canvas);
      } else if (drawing.type === 'angle' && drawing.points.length === 3) {
        ctx.beginPath();
        ctx.moveTo(drawing.points[1].x, drawing.points[1].y);
        ctx.lineTo(drawing.points[0].x, drawing.points[0].y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(drawing.points[1].x, drawing.points[1].y);
        ctx.lineTo(drawing.points[2].x, drawing.points[2].y);
        ctx.stroke();

        drawVertexAngleLabels(ctx, drawing.points[0], drawing.points[1], drawing.points[2]);
      } else if (drawing.type === 'goniometer' && drawing.points.length === 2) {
        const pivot = drawing.points[0];
        const p1 = drawing.points[1];
        const axisAngle = drawing.axisAngle ?? 0;
        const axisOppAngle = normalizeAngle(axisAngle + 180);
        const axisQuarterAngle = normalizeAngle(axisAngle + 90);
        const axisRadius = getGoniometerRadius(pivot, p1, p1);
        const axisRad = (axisAngle * Math.PI) / 180;
        const axisRadPerp = axisRad + Math.PI / 2;
        const primaryFill = hexToRgba(drawing.color, 0.18);
        const secondaryFill = hexToRgba(invertHexColor(drawing.color), 0.18);
        const tertiaryColor = rotateHexChannels(drawing.color);
        const tertiaryFill = hexToRgba(tertiaryColor, 0.28);
        const wedgeRadius = axisRadius * 0.85;
        const labelRadius = axisRadius * 0.6;
        const quarterWedgeRadius = axisRadius * 0.75;
        const quarterLabelRadius = axisRadius * 0.56;

        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pivot.x, pivot.y, axisRadius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pivot.x - Math.cos(axisRad) * axisRadius, pivot.y - Math.sin(axisRad) * axisRadius);
        ctx.lineTo(pivot.x + Math.cos(axisRad) * axisRadius, pivot.y + Math.sin(axisRad) * axisRadius);
        ctx.moveTo(pivot.x - Math.cos(axisRadPerp) * axisRadius, pivot.y - Math.sin(axisRadPerp) * axisRadius);
        ctx.lineTo(pivot.x + Math.cos(axisRadPerp) * axisRadius, pivot.y + Math.sin(axisRadPerp) * axisRadius);
        ctx.stroke();
        ctx.restore();

        const segAngle = Math.atan2(p1.y - pivot.y, p1.x - pivot.x) * (180 / Math.PI);
        const angle = getAngleDifference(axisAngle, segAngle);
        const angleSup = getAngleDifference(axisOppAngle, segAngle);
        const angleQuarter = getAngleDifference(axisQuarterAngle, segAngle);

        const arc = drawPieSlice(ctx, pivot, wedgeRadius, axisAngle, segAngle, primaryFill);
        const arcSup = drawPieSlice(ctx, pivot, wedgeRadius, axisOppAngle, segAngle, secondaryFill);
        const arcQuarter = drawPieSlice(ctx, pivot, quarterWedgeRadius, axisQuarterAngle, segAngle, tertiaryFill);
        if (arcQuarter) {
          strokePieArc(ctx, pivot, quarterWedgeRadius, arcQuarter, hexToRgba(tertiaryColor, 0.85), 2);
        }

        ctx.beginPath();
        ctx.moveTo(pivot.x, pivot.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();

        const handleX = pivot.x + Math.cos(axisRad) * axisRadius;
        const handleY = pivot.y + Math.sin(axisRad) * axisRadius;
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = drawing.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(handleX, handleY, (isAxisHovered ? 7 : 5), 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        const labelFromArc = (arc: ReturnType<typeof getArcData>, value: number, radius: number): void => {
          if (arc.arcAngle < 0.5) return;
          drawAngleText(
            ctx,
            `${Math.round(value)}°`,
            pivot.x + Math.cos(arc.midRad) * radius,
            pivot.y + Math.sin(arc.midRad) * radius
          );
        };

        labelFromArc(arc, angle, labelRadius);
        labelFromArc(arcSup, angleSup, labelRadius);
        labelFromArc(arcQuarter, angleQuarter, quarterLabelRadius);
      } else if (drawing.type === 'circle' && drawing.points.length === 2) {
        const radius = Math.sqrt(
          Math.pow(drawing.points[1].x - drawing.points[0].x, 2) +
          Math.pow(drawing.points[1].y - drawing.points[0].y, 2)
        );
        ctx.beginPath();
        ctx.arc(drawing.points[0].x, drawing.points[0].y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (drawing.type === 'freehand' && drawing.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
        for (let i = 1; i < drawing.points.length; i++) {
          ctx.lineTo(drawing.points[i].x, drawing.points[i].y);
        }
        ctx.stroke();
      }
    });

    // Draw freehand in progress
    if (freehandShapeRef.current && freehandShapeRef.current.points.length > 1) {
      const shape = freehandShapeRef.current;
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(shape.points[0].x, shape.points[0].y);
      for (let i = 1; i < shape.points.length; i++) {
        ctx.lineTo(shape.points[i].x, shape.points[i].y);
      }
      ctx.stroke();
    }

    // Draw pending points and preview
    if (pendingPointsRef.current.length > 0) {
      ctx.strokeStyle = selectedColor;
      ctx.fillStyle = selectedColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      
      // Draw placed spots
      pendingPointsRef.current.forEach((p) => {
        ctx.setLineDash([]);
        drawSpot(ctx, p, selectedColor, false);
        ctx.setLineDash([6, 4]);
      });
      
      // Draw preview with cursor
      const cursor = cursorRef.current;
      if (cursor) {
        if (selectedTool === 'line' && pendingPointsRef.current.length === 1) {
          ctx.beginPath();
          ctx.moveTo(pendingPointsRef.current[0].x, pendingPointsRef.current[0].y);
          ctx.lineTo(cursor.x, cursor.y);
          ctx.stroke();
          drawLineHorizontalAngles(ctx, pendingPointsRef.current[0], cursor);
        } else if (selectedTool === 'angle') {
          if (pendingPointsRef.current.length === 1) {
            ctx.beginPath();
            ctx.moveTo(pendingPointsRef.current[0].x, pendingPointsRef.current[0].y);
            ctx.lineTo(cursor.x, cursor.y);
            ctx.stroke();
          } else if (pendingPointsRef.current.length === 2) {
            ctx.beginPath();
            ctx.moveTo(pendingPointsRef.current[1].x, pendingPointsRef.current[1].y);
            ctx.lineTo(pendingPointsRef.current[0].x, pendingPointsRef.current[0].y);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(pendingPointsRef.current[1].x, pendingPointsRef.current[1].y);
            ctx.lineTo(cursor.x, cursor.y);
            ctx.stroke();
            
            drawVertexAngleLabels(ctx, pendingPointsRef.current[0], pendingPointsRef.current[1], cursor);
          }
        } else if (selectedTool === 'goniometer') {
          const pivot = pendingPointsRef.current[0];
          if (pendingPointsRef.current.length === 1) {
            ctx.beginPath();
            ctx.moveTo(pivot.x, pivot.y);
            ctx.lineTo(cursor.x, cursor.y);
            ctx.stroke();
            const axisRadius = getGoniometerRadius(pivot, cursor, cursor);
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.arc(pivot.x, pivot.y, axisRadius, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(pivot.x - axisRadius, pivot.y);
            ctx.lineTo(pivot.x + axisRadius, pivot.y);
            ctx.moveTo(pivot.x, pivot.y - axisRadius);
            ctx.lineTo(pivot.x, pivot.y + axisRadius);
            ctx.stroke();
            ctx.restore();
          }
        } else if (selectedTool === 'circle' && pendingPointsRef.current.length === 1) {
          const radius = Math.sqrt(
            Math.pow(cursor.x - pendingPointsRef.current[0].x, 2) +
            Math.pow(cursor.y - pendingPointsRef.current[0].y, 2)
          );
          ctx.beginPath();
          ctx.arc(pendingPointsRef.current[0].x, pendingPointsRef.current[0].y, radius, 0, 2 * Math.PI);
          ctx.stroke();
        } else if (selectedTool === 'plumbline' && pendingPointsRef.current.length === 1) {
          drawPlumbLinePreview(ctx, pendingPointsRef.current[0], canvas);
        }
      }
      
      ctx.setLineDash([]);
    }

  }, [showGrid, selectedColor, selectedTool, currentTime, getAngleDifference, getGoniometerRadius, getVideoMetrics]);

  // Schedule render
  const scheduleRender = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      renderCanvas();
      animationFrameRef.current = null;
    });
  }, [renderCanvas]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || (target as HTMLElement).isContentEditable)) {
        return;
      }
      if (selectedTool !== 'select') return;
      const selected = selectedShapeRef.current;
      if (!selected) return;
      e.preventDefault();
      drawingsRef.current = drawingsRef.current.filter((s) => s !== selected);
      selectedShapeRef.current = null;
      hoverShapeRef.current = null;
      scheduleRenderRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedTool]);

  useEffect(() => {
    scheduleRenderRef.current = scheduleRender;
  }, [scheduleRender]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      // Always update the container size state so overlay dimensions are correct
      // without reading the DOM during render (BUG-17).
      setContainerSize({ width: Math.round(rect.width), height: Math.round(rect.height) });

      if (
        isPanningRef.current ||
        dragPointRef.current !== null ||
        dragShapeRef.current !== null ||
        dragAxisRef.current !== null ||
        freehandDrawingRef.current
      ) {
        scheduleRender();
        return;
      }
      const next = getVideoMetrics(Math.round(rect.width), Math.round(rect.height));
      const prev = lastVideoMetricsRef.current;
      if (!next || !prev) {
        if (next) lastVideoMetricsRef.current = next;
        scheduleRender();
        return;
      }

      const widthDelta = Math.abs(next.width - prev.width);
      const heightDelta = Math.abs(next.height - prev.height);
      const offsetDelta = Math.max(Math.abs(next.offsetX - prev.offsetX), Math.abs(next.offsetY - prev.offsetY));
      const scaleDelta = Math.max(
        Math.abs(next.drawWidth - prev.drawWidth),
        Math.abs(next.drawHeight - prev.drawHeight)
      );
      if (widthDelta < 2 && heightDelta < 2 && offsetDelta < 1 && scaleDelta < 2) {
        scheduleRender();
        return;
      }

      const mapPoint = (p: Point): void => {
        const normX = prev.drawWidth ? (p.x - prev.offsetX) / prev.drawWidth : 0;
        const normY = prev.drawHeight ? (p.y - prev.offsetY) / prev.drawHeight : 0;
        p.x = normX * next.drawWidth + next.offsetX;
        p.y = normY * next.drawHeight + next.offsetY;
      };
      drawingsRef.current.forEach(shape => {
        shape.points.forEach(mapPoint);
      });
      pendingPointsRef.current.forEach(mapPoint);
      lastVideoMetricsRef.current = next;

      // Only adjust panOffset if not currently panning (to prevent bounce)
      if (!isPanningRef.current) {
        const dx = (next.width - prev.width) / 2;
        const dy = (next.height - prev.height) / 2;
        if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) {
          setPanOffset(prevOffset => ({
            x: prevOffset.x - dx,
            y: prevOffset.y - dy
          }));
        }
      }
      scheduleRender();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [getVideoMetrics, scheduleRender]);

  // When entering/exiting fullscreen: reset zoom/pan so video fits the new container, then force size update
  useEffect(() => {
    setZoom(prev => (prev === 1 ? prev : 1));
    setPanOffset(prev => (prev.x === 0 && prev.y === 0 ? prev : { x: 0, y: 0 }));
    lastVideoMetricsRef.current = null;

    const updateSize = (): void => {
      const el = containerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        setContainerSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
        scheduleRenderRef.current();
      }
    };
    const raf1 = requestAnimationFrame(updateSize);
    const t1 = window.setTimeout(updateSize, 100);
    const t2 = window.setTimeout(updateSize, 350);
    const t3 = window.setTimeout(updateSize, 600);
    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isFullscreen]);

  // Update canvas cursor style
  const updateCanvasCursor = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    if (isPanningRef.current) {
      canvas.style.cursor = 'grabbing';
    } else if (
      dragAxisRef.current !== null ||
      dragPointRef.current !== null ||
      dragShapeRef.current !== null
    ) {
      canvas.style.cursor = 'grabbing';
    } else if (hoverAxisRef.current) {
      canvas.style.cursor = 'grab';
    } else if (hoverPointRef.current) {
      canvas.style.cursor = 'grab';
    } else if (hoverShapeRef.current) {
      canvas.style.cursor = 'move';
    } else if (selectedTool === 'select' && zoom > 1) {
      canvas.style.cursor = 'grab';
    } else if (selectedTool === 'select') {
      canvas.style.cursor = 'default';
    } else {
      canvas.style.cursor = 'crosshair';
    }
  }, [selectedTool, zoom]);

  // Pointer event handlers (like original app)
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    
    const point = getCanvasPoint(e);
    const screenPoint = getCanvasScreenPoint(e);

    const goniometerHandle = findGoniometerHandle(point.x, point.y, 12);
    if (goniometerHandle) {
      dragAxisRef.current = goniometerHandle;
      selectedShapeRef.current = goniometerHandle;
      pendingPointsRef.current = [];
      freehandDrawingRef.current = false;
      freehandShapeRef.current = null;
      cursorRef.current = null;
      ignoreClickUntilRef.current = Date.now() + 200;
      updateCanvasCursor();
      scheduleRender();
      return;
    }
    
    // Check if clicking on a point to drag
    const nearestPoint = findNearestPoint(point.x, point.y, 20);
    if (nearestPoint) {
      const pointOwner = findShapeForPoint(nearestPoint);
      if (pointOwner?.shape.type === 'goniometer' && pointOwner.index === 0) {
        dragShapeRef.current = pointOwner.shape;
        dragStartRef.current = point;
        selectedShapeRef.current = pointOwner.shape;
      } else {
        dragPointRef.current = nearestPoint;
        selectedShapeRef.current = pointOwner?.shape ?? selectedShapeRef.current;
      }
      pendingPointsRef.current = [];
      freehandDrawingRef.current = false;
      freehandShapeRef.current = null;
      cursorRef.current = null;
      ignoreClickUntilRef.current = Date.now() + 200;
      updateCanvasCursor();
      scheduleRender();
      return;
    }
    
    // Check if clicking on a shape to drag
    const nearestShape = findNearestShape(point.x, point.y, 12);
    if (nearestShape) {
      dragShapeRef.current = nearestShape;
      dragStartRef.current = point;
      selectedShapeRef.current = nearestShape;
      pendingPointsRef.current = [];
      freehandDrawingRef.current = false;
      freehandShapeRef.current = null;
      cursorRef.current = null;
      ignoreClickUntilRef.current = Date.now() + 200;
      updateCanvasCursor();
      scheduleRender();
      return;
    }

    // Handle select tool: pan if zoomed (same as PhotoAnalysis)
    if (selectedTool === 'select' && zoom > 1) {
      isPanningRef.current = true;
      panStartRef.current = screenPoint;
      panOriginRef.current = { ...panOffset };
      selectedShapeRef.current = null;
      pendingPointsRef.current = [];
      freehandDrawingRef.current = false;
      freehandShapeRef.current = null;
      cursorRef.current = null;
      ignoreClickUntilRef.current = Date.now() + 200;
      updateCanvasCursor();
      scheduleRender();
      return;
    }
    
    // Start freehand drawing
    if (selectedTool === 'freehand') {
      freehandDrawingRef.current = true;
      selectedShapeRef.current = null;
      freehandShapeRef.current = {
        id: Date.now().toString(),
        type: 'freehand',
        points: [{ ...point }],
        color: selectedColor,
        mode: drawingMode,
        timeRange: drawingMode === 'timebound' ? { start: currentTime, end: currentTime + 2 } : undefined
      };
      pendingPointsRef.current = [];
      cursorRef.current = point;
      scheduleRender();
    }
  }, [getCanvasPoint, getCanvasScreenPoint, findGoniometerHandle, findNearestPoint, findNearestShape, findShapeForPoint, selectedTool, selectedColor, drawingMode, currentTime, panOffset, updateCanvasCursor, scheduleRender, zoom]);
  
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e);
    const screenPoint = getCanvasScreenPoint(e);
    
    const shouldBlockScroll =
      dragAxisRef.current !== null ||
      dragPointRef.current !== null ||
      dragShapeRef.current !== null ||
      freehandDrawingRef.current ||
      pendingPointsRef.current.length > 0 ||
      isPanningRef.current;
    if (shouldBlockScroll) {
      e.preventDefault();
    }

    if (isPanningRef.current && panStartRef.current) {
      const dx = screenPoint.x - panStartRef.current.x;
      const dy = screenPoint.y - panStartRef.current.y;
      setPanOffset({
        x: panOriginRef.current.x + dx,
        y: panOriginRef.current.y + dy
      });
      cursorRef.current = null;
      scheduleRender();
      return;
    }
    
    if (dragAxisRef.current) {
      const pivot = dragAxisRef.current.points[0];
      const angle = Math.atan2(point.y - pivot.y, point.x - pivot.x) * (180 / Math.PI);
      dragAxisRef.current.axisAngle = normalizeAngle(angle);
      cursorRef.current = null;
      scheduleRender();
      return;
    }

    // Dragging a point - directly mutate the point object!
    if (dragPointRef.current) {
      dragPointRef.current.x = point.x;
      dragPointRef.current.y = point.y;
      cursorRef.current = null;
      scheduleRender();
      return;
    }
    
    // Dragging a shape - move all points
    if (dragShapeRef.current && dragStartRef.current) {
      const dx = point.x - dragStartRef.current.x;
      const dy = point.y - dragStartRef.current.y;
      dragShapeRef.current.points.forEach(pt => {
        pt.x += dx;
        pt.y += dy;
      });
      dragStartRef.current = point;
      cursorRef.current = null;
      scheduleRender();
      return;
    }
    
    // Freehand drawing
    if (freehandDrawingRef.current && freehandShapeRef.current) {
      const points = freehandShapeRef.current.points;
      const last = points[points.length - 1];
      if (!last || Math.hypot(point.x - last.x, point.y - last.y) > 2) {
        points.push({ ...point });
        scheduleRender();
      }
      return;
    }
    
    // Update hover state
    hoverAxisRef.current = findGoniometerHandle(point.x, point.y, 12);
    hoverPointRef.current = hoverAxisRef.current ? null : findNearestPoint(point.x, point.y, 20);
    const hasHoverTarget = hoverAxisRef.current !== null || hoverPointRef.current !== null;
    hoverShapeRef.current = hasHoverTarget ? null : findNearestShape(point.x, point.y, 12);
    
    // Update cursor for preview
    if (pendingPointsRef.current.length > 0) {
      cursorRef.current = point;
      scheduleRender();
    }
    
    updateCanvasCursor();
    scheduleRender();
  }, [getCanvasPoint, getCanvasScreenPoint, findGoniometerHandle, findNearestPoint, findNearestShape, normalizeAngle, updateCanvasCursor, scheduleRender]);
  
  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      panStartRef.current = null;
      updateCanvasCursor();
      scheduleRender();
      return;
    }
    
    if (dragAxisRef.current) {
      dragAxisRef.current = null;
      updateCanvasCursor();
      forceRender(); // Sync state
      scheduleRender();
      return;
    }

    // End point drag
    if (dragPointRef.current) {
      dragPointRef.current = null;
      updateCanvasCursor();
      forceRender(); // Sync state
      scheduleRender();
      return;
    }
    
    // End shape drag
    if (dragShapeRef.current) {
      dragShapeRef.current = null;
      dragStartRef.current = null;
      updateCanvasCursor();
      forceRender(); // Sync state
      scheduleRender();
      return;
    }
    
    // End freehand drawing
    if (freehandDrawingRef.current && freehandShapeRef.current) {
      if (freehandShapeRef.current.points.length > 2) {
        drawingsRef.current.push(freehandShapeRef.current);
      }
      freehandDrawingRef.current = false;
      freehandShapeRef.current = null;
      forceRender();
      scheduleRender();
      return;
    }
    
    // Ignore clicks right after drag
    if (Date.now() < ignoreClickUntilRef.current) {
      return;
    }
    
    // Deselect keypoint when clicking outside (only in select mode, not drag mode)
    if (selectedTool === 'select' && selectedKeypoint !== null && !keypointDragMode) {
      // Check if we clicked on the drawing canvas (not on a keypoint)
      // PoseOverlay handles keypoint clicks, so if we reach here, it wasn't a keypoint
      handleCloseKeypointMenu();
    }
    
    // Handle tool clicks
    if (selectedTool === 'select' || selectedTool === 'freehand' || selectedTool === 'plumbline') {
      if (selectedTool === 'plumbline') {
        const point = getCanvasPoint(e);
        const nearestPoint = findNearestPoint(point.x, point.y, 20);
        if (nearestPoint) return;
        
        pendingPointsRef.current.push({ ...point });
        
        if (pendingPointsRef.current.length === 1) {
          const newDrawing: DrawingElement = {
            id: Date.now().toString(),
            type: 'plumbline',
            points: [...pendingPointsRef.current],
            color: selectedColor,
            mode: drawingMode,
            timeRange: drawingMode === 'timebound' ? { start: currentTime, end: currentTime + 2 } : undefined
          };
          drawingsRef.current.push(newDrawing);
          pendingPointsRef.current = [];
        }
        
        forceRender();
        scheduleRender();
      }
      return;
    }
    
    const point = getCanvasPoint(e);
    
    // Don't add point if clicking on existing point
    const nearestPoint = findNearestPoint(point.x, point.y, 20);
    if (nearestPoint) return;
    
    pendingPointsRef.current.push({ ...point });
    
    const requiredPoints = selectedTool === 'angle' ? 3 : 2;
    if (pendingPointsRef.current.length === requiredPoints) {
      const newDrawing: DrawingElement = {
        id: Date.now().toString(),
        type: selectedTool,
        points: pendingPointsRef.current,
        color: selectedColor,
        mode: drawingMode,
        timeRange: drawingMode === 'timebound' ? { start: currentTime, end: currentTime + 2 } : undefined
      };
      if (selectedTool === 'goniometer') {
        newDrawing.axisAngle = 270;
      }
      drawingsRef.current.push(newDrawing);
      pendingPointsRef.current = [];
    }
    
    forceRender();
    scheduleRender();
  }, [selectedTool, selectedColor, drawingMode, currentTime, getCanvasPoint, findNearestPoint, updateCanvasCursor, forceRender, scheduleRender]);
  
  const handlePointerLeave = useCallback(() => {
    cursorRef.current = null;
    hoverAxisRef.current = null;
    hoverPointRef.current = null;
    hoverShapeRef.current = null;
    if (isPanningRef.current) {
      isPanningRef.current = false;
      panStartRef.current = null;
    }
    updateCanvasCursor();
    scheduleRender();
  }, [updateCanvasCursor, scheduleRender]);

  // Start actual recording (defined first so it can be referenced)
  const startActualRecordingRef = useRef<() => void>(() => {});
  
  const stopRecording = useCallback(() => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
  }, []);

  const cancelCamera = useCallback(() => {
    countdownTimeoutsRef.current.forEach(id => window.clearTimeout(id));
    countdownTimeoutsRef.current = [];
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
    setIsRecording(false);
    setCountdownActive(false);
    setCountdown(0);
    setCameraActive(false);
    setIsPlaying(false);
  }, []);

  const doStartActualRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    
    playRecordStart();
    setIsRecording(true);
    recordedChunksRef.current = [];
    
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
        ? 'video/webm;codecs=vp9' 
        : 'video/webm'
    });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };
    
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);

      // Revoke the previous blob URL (if any) before replacing state so that
      // repeated recordings don't accumulate unreleased blobs (BUG-03).
      setVideoUrl(prev => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return url;
      });
      setIsRecording(false);
      setCameraActive(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setVideoElementKey((key) => key + 1);
      playRecordEnd();
      
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.load();
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
    
    recorderRef.current = recorder;
    recorder.start();
    
    recordingTimeoutRef.current = setTimeout(() => {
      stopRecording();
    }, 8000);
  }, [playRecordStart, playRecordEnd, stopRecording]);
  
  // Keep ref updated
  useEffect(() => {
    startActualRecordingRef.current = doStartActualRecording;
  }, [doStartActualRecording]);

  // Activate camera preview (stream visible, no countdown/recording yet).
  // When called for a camera flip (cameraActive already true) the state reset is skipped.
  const activateCamera = useCallback(async (facing: 'environment' | 'user' = 'environment', isFlip = false) => {
    if (!isFlip) {
      setVideoUrl(null);
      drawingsRef.current = [];
      pendingPointsRef.current = [];
      setMarkers([]);
      setLoopPoints({ start: null, end: null });
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setVideoElementKey((key) => key + 1);
    }

    if (!window.isSecureContext) {
      alert('Camera requires HTTPS or localhost.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Camera not supported in this browser.');
      return;
    }

    try {
      // Stop any existing stream before requesting a new one
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          frameRate: { ideal: 30 },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;
      setCameraFacing(facing);

      // Assign the new stream directly to the video element.
      // setCameraActive(true) only triggers the sync useEffect on the first activation;
      // on a camera flip cameraActive stays true so the effect won't re-run.
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => console.warn('Video play error:', err));
      }

      setCameraActive(true);
    } catch (error) {
      console.error('Camera error:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  }, []);

  // Flip camera (toggle front/back) during preview
  const flipCamera = useCallback(() => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    activateCamera(nextFacing, true);
  }, [cameraFacing, activateCamera]);

  // Start countdown then recording (called by the Record button)
  const startCountdown = useCallback(() => {
    setCountdownActive(true);
    setCountdown(3);

    // Clear any existing countdown timeouts
    countdownTimeoutsRef.current.forEach(id => window.clearTimeout(id));
    countdownTimeoutsRef.current = [];

    try { playCountdownTick(); } catch (e) { console.warn('Audio error:', e); }

    // Use window.setTimeout to avoid interference from React effects
    const t1 = window.setTimeout(() => {
      setCountdown(2);
      try { playCountdownTick(); } catch (e) { console.warn('Audio error:', e); }

      const t2 = window.setTimeout(() => {
        setCountdown(1);
        try { playCountdownTick(); } catch (e) { console.warn('Audio error:', e); }

        const t3 = window.setTimeout(() => {
          setCountdown(0);
          setCountdownActive(false);
          countdownTimeoutsRef.current = [];
          startActualRecordingRef.current();
        }, 1000);
        countdownTimeoutsRef.current.push(t3);
      }, 1000);
      countdownTimeoutsRef.current.push(t2);
    }, 1000);
    countdownTimeoutsRef.current.push(t1);
  }, [playCountdownTick]);

  // Video controls
  const syncPlaybackState = useCallback((video: HTMLVideoElement | null = videoRef.current) => {
    const isCurrentVideo = Boolean(video && video === videoRef.current);
    const isFileVideo = Boolean(videoUrl) && !cameraActive;
    setIsPlaying(Boolean(isCurrentVideo && isFileVideo && video && !video.paused && !video.ended));
  }, [cameraActive, videoUrl]);

  const togglePlayPause = useCallback(async () => {
    const video = videoRef.current;
    if (video && videoUrl && !cameraActive) {
      if (!video.paused && !video.ended) {
        video.pause();
        syncPlaybackState(video);
      } else {
        try {
          await video.play();
          syncPlaybackState(video);
        } catch {
          // play() was rejected (e.g. browser autoplay policy on mobile).
          // The video remains paused; do not update isPlaying.
          syncPlaybackState(video);
        }
      }
    }
  }, [cameraActive, syncPlaybackState, videoUrl]);

  const handleTimeUpdate = (): void => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      
      if (isLooping && loopPoints.start !== null && loopPoints.end !== null) {
        if (videoRef.current.currentTime >= loopPoints.end) {
          videoRef.current.currentTime = loopPoints.start;
        }
      }
    }
  };

  const handleLoadedMetadata = (): void => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setCurrentTime(videoRef.current.currentTime);
      syncPlaybackState(videoRef.current);
      if (!videoRef.current.srcObject) {
        inspectVideoElement(videoRef.current);
      }
    }
  };

  const handleSeek = (value: number[]): void => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
      syncPlaybackState(videoRef.current);
      // Detection is handled by the 'seeked' event in usePoseDetection,
      // which fires once the browser has actually loaded the new frame.
    }
  };

  const jumpToStart = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  }, []);

  const jumpToEnd = useCallback(() => {
    if (videoRef.current && duration) {
      videoRef.current.currentTime = duration;
      setCurrentTime(duration);
    }
  }, [duration]);

  const skipForward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(duration, currentTime + 0.033);
    }
  }, [currentTime, duration]);

  const skipBackward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, currentTime - 0.033);
    }
  }, [currentTime]);
  
  const setSpeed = (speed: number): void => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackRate(speed);
    }
  };

  const toggleMute = (): void => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Undo last drawing
  const undoLastDrawing = useCallback(() => {
    if (drawingsRef.current.length > 0) {
      drawingsRef.current.pop();
    }
    pendingPointsRef.current = [];
    forceRender();
    scheduleRender();
  }, [forceRender, scheduleRender]);

  // Markers
  const addMarker = useCallback(() => {
    const newMarker: Marker = {
      id: Date.now().toString(),
      time: currentTime,
      color: selectedColor,
      label: `Marker ${markers.length + 1}`,
    };
    setMarkers([...markers, newMarker]);
  }, [currentTime, selectedColor, markers]);
  
  const deleteMarker = (id: string): void => {
    setMarkers(markers.filter(m => m.id !== id));
  };
  
  const jumpToMarker = (time: number): void => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const cycleMobileToolbarMode = useCallback(() => {
    setMobileToolbarMode((prev) => {
      if (prev === 'hidden') return 'icons';
      if (prev === 'icons') return 'expanded';
      return 'hidden';
    });
  }, []);

  // Loop controls
  const setLoopStart = (): void => {
    setLoopPoints({ ...loopPoints, start: currentTime });
  };

  const setLoopEnd = (): void => {
    setLoopPoints({ ...loopPoints, end: currentTime });
  };

  const clearLoop = (): void => {
    setLoopPoints({ start: null, end: null });
    setIsLooping(false);
  };

  const clearDrawings = (): void => {
    drawingsRef.current = [];
    pendingPointsRef.current = [];
    forceRender();
    scheduleRender();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const buildWatermarkedFrame = useCallback(async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !video.videoWidth || !video.videoHeight) return null;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    const layout = getContainLayout(canvas.width, canvas.height, video.videoWidth, video.videoHeight);
    ctx.drawImage(video, layout.offsetX, layout.offsetY, layout.drawWidth, layout.drawHeight);
    ctx.drawImage(canvas, 0, 0);
    await drawWatermark(ctx, exportCanvas.width, exportCanvas.height);
    return exportCanvas;
  }, []);

  // Export current frame
  const handleExport = async (): Promise<void> => {
    if (!videoUrl) return;

    const exportCanvas = await buildWatermarkedFrame();
    if (!exportCanvas) return;

    const link = document.createElement('a');
    link.download = `video-analysis-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  // Share using Web Share API
  const handleShare = async (): Promise<void> => {
    try {
      const exportCanvas = await buildWatermarkedFrame();
      if (!exportCanvas) {
        alert('No content to share');
        return;
      }
      
      const blob = await new Promise<Blob | null>((resolve) => {
        exportCanvas.toBlob(resolve, 'image/png');
      });
      
      if (!blob) {
        alert('Failed to create image');
        return;
      }
      
      const file = new File([blob], `analysis-${Date.now()}.png`, { type: 'image/png' });
      
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Movement Analysis',
          text: 'Check out my movement analysis!',
          files: [file]
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `analysis-${Date.now()}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        alert('Image downloaded. You can share it manually.');
      }
    } catch (error) {
      console.error('Share error:', error);
      if ((error as Error).name !== 'AbortError') {
        alert('Unable to share. Try downloading instead.');
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === ' ') {
        e.preventDefault();
        togglePlayPause();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undoLastDrawing();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        skipForward();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        skipBackward();
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        addMarker();
      } else if (e.key === 'Escape') {
        pendingPointsRef.current = [];
        forceRender();
        scheduleRender();
      } else if (e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setShowGrid(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [togglePlayPause, undoLastDrawing, skipForward, skipBackward, addMarker, forceRender, scheduleRender]);
  
  // Initial render
  useEffect(() => {
    scheduleRender();
  }, [scheduleRender]);
  
  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      countdownTimeoutsRef.current.forEach(id => window.clearTimeout(id));
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // Sync camera stream with video element - this runs AFTER React renders
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.muted = true;
      video.playsInline = true;
      video.play().catch(err => console.warn('Video play error:', err));
    }
  }, [cameraActive]);
  
  // Re-render when relevant state changes
  useEffect(() => {
    scheduleRender();
  }, [showGrid, selectedColor, selectedTool, currentTime, renderTrigger, zoom, panOffset, scheduleRender]);

  useEffect(() => {
    return () => {
      if (videoUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const speeds = [0.25, 0.5, 1, 1.5, 2];
  const durationMax = duration > 0 ? duration : 100;
  // Use containerSize state (updated by ResizeObserver) rather than reading the DOM
  // directly during render — DOM reads in render violate React rules and produce stale
  // values until the next re-render (BUG-17).
  const overlayWidth = containerSize.width || videoRef.current?.videoWidth || 0;
  const overlayHeight = containerSize.height || videoRef.current?.videoHeight || 0;

  const hasMedia = !!(videoUrl || cameraActive);
  const isDropzone = !hasMedia;
  const canTogglePlayback = Boolean(videoUrl) && !cameraActive;
  const toolsDisabled = !videoUrl || cameraActive;
  const shouldCaptureTouch = isFullscreen || selectedTool !== 'select' || zoom > 1;
  const dropzoneActive = isDropzone;
  const dropzoneHandlers = dropzoneActive
    ? {
        onDragEnter: handleDragEnter,
        onDragLeave: handleDragLeave,
        onDragOver: handleDragOver,
        onDrop: handleDrop,
      }
    : undefined;
  const containerClassName = `rounded-xl overflow-hidden relative flex items-center justify-center ${
    isFullscreen ? 'touch-none overscroll-contain' : ''
  } ${
    isFullscreen
      ? 'flex-1 rounded-none min-h-0'
      : isDropzone
        ? `border-2 border-dashed min-h-[60vh] max-h-[90vh] touch-pan-y ${
            dragActive ? 'bg-blue-50/60 border-blue-400' : 'bg-white border-slate-300'
          }`
        : cameraActive
          ? 'bg-slate-900 min-h-[calc(100vh-10rem)]'
          : 'bg-slate-900 min-h-[calc(100vh-13rem)]'
  }`;
  // Layout: root → header | ( toolbar | canvas ). Only fullscreen fills viewport; otherwise scrollable page. Canvas = drop zone (no media) or video (with media), always has min-height so it’s visible.
  return (
    <div
      ref={fullscreenRef}
      className={`bg-slate-50 flex flex-col ${isFullscreen ? 'w-full h-full overflow-hidden' : 'min-h-screen'}`}
    >
      <AnalysisHeader
        title="Video Analysis"
        subtitle="Movement Assessment"
        badgeText="Field Tools"
        badgeIcon={<VideoIcon className="w-3 h-3" />}
        onBack={onBack}
        isFullscreen={isFullscreen}
        maxWidth="wide"
        rightContent={
          onSwitchToDual && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDualVideoClick}
              className="gap-2"
              title="Switch to Dual Video Mode"
            >
              <Split className="w-4 h-4" />
              Dual Video
              <PremiumBadge variant="icon-only" />
            </Button>
          )
        }
      />

      <div
        className={`w-full max-w-[1800px] mx-auto p-2 sm:p-4 lg:p-6 flex flex-col min-w-0 ${isFullscreen ? 'flex-1 h-full min-h-0' : ''}`}
      >
        <div className={`flex gap-2 sm:gap-4 min-w-0 ${isFullscreen ? 'flex-1 min-h-0 overflow-hidden' : 'w-full'}`}>
          {/* Toolbar - Desktop only (mobile uses an overlay handle to preserve video width) */}
          <div
            className={`hidden lg:flex flex-shrink-0 bg-white rounded-xl border border-slate-200 flex flex-col transition-all duration-200 ${isFullscreen ? 'gap-0.5 p-1 overflow-visible [&_button]:h-7' : 'gap-2 p-2 sticky top-16 sm:top-20'} ${
              toolbarExpanded ? 'w-[140px]' : 'w-12'
            } lg:w-[140px] ${
              !videoUrl || cameraActive ? 'opacity-60 pointer-events-none' : ''
            }`}
          >
              {/* Toggle button - only on mobile/tablet */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setToolbarExpanded(!toolbarExpanded)}
                className="lg:hidden p-1 h-8 w-full justify-center"
                title={toolbarExpanded ? 'Collapse toolbar' : 'Expand toolbar'}
              >
                {toolbarExpanded ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
              </Button>
              
              {/* Tools */}
              <div className="flex flex-col gap-1">
                <p className={`text-xs text-slate-500 px-2 mb-1 ${toolbarExpanded ? 'block' : 'hidden'} lg:block`}>Tools</p>
                <Button
                  variant={selectedTool === 'select' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => { setSelectedTool('select'); pendingPointsRef.current = []; scheduleRender(); }}
                  className={`gap-2 ${toolbarExpanded ? 'justify-start' : 'justify-center p-1'} lg:justify-start`}
                  title="Select"
                >
                  <Move className="w-4 h-4 flex-shrink-0" />
                  <span className={`text-xs ${toolbarExpanded ? 'inline' : 'hidden'} lg:inline`}>Select</span>
                </Button>
                <Button
                  variant={selectedTool === 'line' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => { setSelectedTool('line'); pendingPointsRef.current = []; scheduleRender(); }}
                  className={`gap-2 ${toolbarExpanded ? 'justify-start' : 'justify-center p-1'} lg:justify-start`}
                  title="Line"
                >
                  <Minus className="w-4 h-4 flex-shrink-0" />
                  <span className={`text-xs ${toolbarExpanded ? 'inline' : 'hidden'} lg:inline`}>Line</span>
                </Button>
                <Button
                  variant={selectedTool === 'angle' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => { setSelectedTool('angle'); pendingPointsRef.current = []; scheduleRender(); }}
                  className={`gap-2 ${toolbarExpanded ? 'justify-start' : 'justify-center p-1'} lg:justify-start`}
                  title="Angle"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20 20L4 20L4 4" strokeWidth="2" strokeLinecap="round" />
                    <path d="M4 20L16 8" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span className={`text-xs ${toolbarExpanded ? 'inline' : 'hidden'} lg:inline`}>Angle</span>
                </Button>
                <Button
                  variant={selectedTool === 'goniometer' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => { setSelectedTool('goniometer'); pendingPointsRef.current = []; scheduleRender(); }}
                  className={`gap-2 ${toolbarExpanded ? 'justify-start' : 'justify-center p-1'} lg:justify-start`}
                  title="Goniometer"
                >
                  <Compass className="w-4 h-4 flex-shrink-0" />
                  <span className={`text-xs ${toolbarExpanded ? 'inline' : 'hidden'} lg:inline`}>Goniometer</span>
                </Button>
                <Button
                  variant={selectedTool === 'circle' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => { setSelectedTool('circle'); pendingPointsRef.current = []; scheduleRender(); }}
                  className={`gap-2 ${toolbarExpanded ? 'justify-start' : 'justify-center p-1'} lg:justify-start`}
                  title="Circle"
                >
                  <Circle className="w-4 h-4 flex-shrink-0" />
                  <span className={`text-xs ${toolbarExpanded ? 'inline' : 'hidden'} lg:inline`}>Circle</span>
                </Button>
                <Button
                  variant={selectedTool === 'freehand' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => { setSelectedTool('freehand'); pendingPointsRef.current = []; scheduleRender(); }}
                  className={`gap-2 ${toolbarExpanded ? 'justify-start' : 'justify-center p-1'} lg:justify-start`}
                  title="Freehand"
                >
                  <Pencil className="w-4 h-4 flex-shrink-0" />
                  <span className={`text-xs ${toolbarExpanded ? 'inline' : 'hidden'} lg:inline`}>Freehand</span>
                </Button>
                <PlumbLineButton
                  selectedTool={selectedTool}
                  onToolChange={(tool) => { setSelectedTool(tool as Tool); pendingPointsRef.current = []; scheduleRender(); }}
                  toolbarExpanded={toolbarExpanded}
                  buttonClass={`gap-2 ${toolbarExpanded ? 'justify-start' : 'justify-center p-1'} lg:justify-start`}
                  labelClass={`text-xs ${toolbarExpanded ? 'inline' : 'hidden'} lg:inline`}
                />
                <Button
                  variant={isFullscreen ? 'default' : 'ghost'}
                  size="sm"
                  onClick={toggleFullscreen}
                  className={`gap-2 ${toolbarExpanded ? 'justify-start' : 'justify-center p-1'} lg:justify-start`}
                  title={isFullscreen ? 'Exit full screen' : 'Full screen'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4 flex-shrink-0" /> : <Maximize2 className="w-4 h-4 flex-shrink-0" />}
                  <span className={`text-xs ${toolbarExpanded ? 'inline' : 'hidden'} lg:inline`}>Full screen</span>
                </Button>
              </div>

              <Separator />

              {/* Drawing Mode */}
              <div className="flex flex-col gap-1">
                <p className={`text-xs text-slate-500 px-2 mb-1 ${toolbarExpanded ? 'block' : 'hidden'} lg:block`}>Mode</p>
                <Button
                  variant={drawingMode === 'global' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDrawingMode('global')}
                  className={`gap-2 ${toolbarExpanded ? 'justify-start' : 'justify-center p-1'} lg:justify-start`}
                  title="Global"
                >
                  <Globe className="w-4 h-4 flex-shrink-0" />
                  <span className={`text-xs ${toolbarExpanded ? 'inline' : 'hidden'} lg:inline`}>Global</span>
                </Button>
                <Button
                  variant={drawingMode === 'timebound' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDrawingMode('timebound')}
                  className={`gap-2 ${toolbarExpanded ? 'justify-start' : 'justify-center p-1'} lg:justify-start`}
                  title="Timebound"
                >
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span className={`text-xs ${toolbarExpanded ? 'inline' : 'hidden'} lg:inline`}>Timebound</span>
                </Button>
              </div>

              <Separator />

              {/* Colors */}
              <div className={`flex flex-col gap-1 ${toolbarExpanded ? 'block' : 'hidden'} lg:block`}>
                <p className="text-xs text-slate-500 px-2 mb-1">Colors</p>
                <div className="grid grid-cols-4 gap-1 px-1">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={`w-6 h-6 lg:w-7 lg:h-7 rounded-lg border-2 transition-all ${
                        selectedColor === color.value 
                          ? 'border-slate-900 scale-110' 
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              
              {/* Color indicator when collapsed */}
              <div className={`${toolbarExpanded ? 'hidden' : 'flex'} lg:hidden justify-center`}>
                <div 
                  className="w-6 h-6 rounded-lg border-2 border-slate-300"
                  style={{ backgroundColor: selectedColor }}
                  title="Current color"
                />
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex flex-col gap-1">
                <p className={`text-xs text-slate-500 px-2 mb-1 ${toolbarExpanded ? 'block' : 'hidden'} lg:block`}>Actions</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={undoLastDrawing}
                  className={`gap-2 ${toolbarExpanded ? 'justify-start' : 'justify-center p-1'} lg:justify-start`}
                  disabled={drawingsRef.current.length === 0}
                  title="Undo"
                >
                  <Undo className="w-4 h-4 flex-shrink-0" />
                  <span className={`text-xs ${toolbarExpanded ? 'inline' : 'hidden'} lg:inline`}>Undo</span>
                </Button>
                <Button
                  variant={showGrid ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setShowGrid(!showGrid)}
                  className={`gap-2 ${toolbarExpanded ? 'justify-start' : 'justify-center p-1'} lg:justify-start`}
                  title="Grid"
                >
                  <Grid3x3 className="w-4 h-4 flex-shrink-0" />
                  <span className={`text-xs ${toolbarExpanded ? 'inline' : 'hidden'} lg:inline`}>Grid</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDrawings}
                  className={`gap-2 ${toolbarExpanded ? 'justify-start' : 'justify-center p-1'} lg:justify-start`}
                  title="Clear"
                >
                  <RotateCcw className="w-4 h-4 flex-shrink-0" />
                  <span className={`text-xs ${toolbarExpanded ? 'inline' : 'hidden'} lg:inline`}>Clear</span>
                </Button>
              </div>

              <Separator />

              {/* Premium Features - only show expanded */}
              <div className={`flex flex-col gap-1 ${toolbarExpanded ? 'block' : 'hidden'} lg:block`}>
                <div className="flex items-center gap-2 px-2 mb-1">
                  <p className="text-xs text-slate-500">AI Analysis</p>
                  <PremiumBadge variant="icon-only" />
                </div>
                <div className="px-2">
                  <div 
                    className="flex items-center justify-between gap-2 cursor-pointer"
                    onClick={handleToggleAiAnalysis}
                  >
                    <Label 
                      htmlFor="ai-analysis" 
                      className="text-xs text-slate-700 flex items-center gap-2 cursor-pointer pointer-events-none"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>Enable</span>
                    </Label>
                    <Switch
                      id="ai-analysis"
                      checked={aiAnalysisEnabled}
                      onCheckedChange={handleToggleAiAnalysis}
                      className="pointer-events-auto cursor-pointer opacity-100"
                      disabled={false}
                    />
                  </div>
                  <div className="mt-2">
                    <Label className="text-xs text-slate-500">Model</Label>
                    <Select value={modelType} onValueChange={(value) => setModelType(value as 'movenet' | 'blazepose')}>
                      <SelectTrigger size="sm" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="movenet">MoveNet (fast)</SelectItem>
                        <SelectItem value="blazepose">BlazePose (more points)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {poseDetectionLoading && (
                    <div className="text-xs text-slate-500 mt-1">Loading AI model...</div>
                  )}
                  {poseError && (
                    <div className="text-xs text-red-500 mt-1">Error: {poseError}</div>
                  )}
                  {aiAnalysisEnabled && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between gap-2 cursor-pointer">
                        <Label 
                          htmlFor="center-of-mass-toggle"
                          className="text-xs text-slate-700 cursor-pointer flex-1"
                        >
                          Center of Mass
                        </Label>
                        <Switch
                          id="center-of-mass-toggle"
                          checked={showCenterOfMass}
                          onCheckedChange={setShowCenterOfMass}
                          className="cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 cursor-pointer">
                        <Label 
                          htmlFor="balance-point-toggle"
                          className="text-xs text-slate-700 cursor-pointer flex-1"
                        >
                          Base of Support
                        </Label>
                        <Switch
                          id="balance-point-toggle"
                          checked={showBalancePoint}
                          onCheckedChange={setShowBalancePoint}
                          className="cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 cursor-pointer">
                        <Label
                          htmlFor="joint-angles-toggle"
                          className="text-xs text-slate-700 cursor-pointer flex-1"
                        >
                          Joint Angles
                        </Label>
                        <Switch
                          id="joint-angles-toggle"
                          checked={showJointAngles}
                          onCheckedChange={setShowJointAngles}
                          className="cursor-pointer"
                        />
                      </div>

                      {/* Scale reference — ArUco or subject height fallback */}
                      <div className="pt-2 border-t border-slate-100">
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
                    </div>
                  )}
                </div>
              </div>
              
              {/* AI toggle when collapsed */}
              <div className={`${toolbarExpanded ? 'hidden' : 'flex'} lg:hidden flex-col items-center gap-1`}>
                <Button
                  variant={aiAnalysisEnabled ? 'default' : 'ghost'}
                  size="sm"
                  onClick={handleToggleAiAnalysis}
                  className="p-1 justify-center relative"
                  title="AI Analysis"
                >
                  <Brain className="w-4 h-4" />
                  <div className="absolute -top-1 -right-1">
                    <PremiumBadge variant="icon-only" />
                  </div>
                </Button>
              </div>

              <Separator />

              {/* Export/Share */}
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="sm" onClick={handleExport} className={`gap-2 ${toolbarExpanded ? 'justify-start' : 'justify-center p-1'} lg:justify-start`} title="Export">
                  <Download className="w-4 h-4 flex-shrink-0" />
                  <span className={`text-xs ${toolbarExpanded ? 'inline' : 'hidden'} lg:inline`}>Export</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleShare} className={`gap-2 ${toolbarExpanded ? 'justify-start' : 'justify-center p-1'} lg:justify-start`} title="Share">
                  <Share2 className="w-4 h-4 flex-shrink-0" />
                  <span className={`text-xs ${toolbarExpanded ? 'inline' : 'hidden'} lg:inline`}>Share</span>
                </Button>
              </div>
          </div>

          {/* Main: toolbar | canvas (drop zone or video). flex-1 = remaining width. Do NOT add h-screen/fixed height to root when media loaded: it breaks page scroll. */}
          <div className={`min-w-0 flex-1 flex flex-col ${isFullscreen ? 'min-h-0' : ''}`}>
            <div className={`flex flex-col gap-2 ${isFullscreen ? 'flex-1 min-h-0 h-full' : ''}`}>
              <div
                ref={containerRef}
                {...dropzoneHandlers}
                className={containerClassName}
                style={isFullscreen ? { minHeight: 0, maxHeight: '100%' } : undefined}
              >
                {isDropzone ? (
                  <div
                    className={`absolute inset-0 flex items-center justify-center text-center p-4 transition-colors pointer-events-none ${
                      dragActive ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <div className="w-full max-w-md pointer-events-auto">
                      <div className={`w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 lg:mb-6 transition-colors ${dragActive ? 'bg-blue-100' : 'bg-slate-100'}`}>
                        <VideoIcon className={`w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 ${dragActive ? 'text-blue-500' : 'text-slate-400'}`} />
                      </div>
                      <h3 className="text-slate-900 font-medium text-sm sm:text-base mb-1 sm:mb-2">
                        {dragActive ? 'Drop to upload' : 'Upload or Record'}
                      </h3>
                      <p className="text-slate-500 text-xs sm:text-sm mb-4 sm:mb-6 lg:mb-8">
                        {dragActive ? 'Release to add the video.' : 'Drag and drop, upload, or record.'}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center">
                        <Button 
                          onClick={() => fileInputRef.current?.click()} 
                          className="gap-2"
                          size="sm"
                          title="Files stay on your device - nothing is uploaded to any server"
                        >
                          <Upload className="w-4 h-4" />
                          Upload
                        </Button>
                        <Button
                          onClick={() => activateCamera(cameraFacing)}
                          variant="outline"
                          className="gap-2"
                          size="sm"
                          title="Recording stays local - nothing is uploaded to any server"
                        >
                          <Camera className="w-4 h-4" />
                          Camera
                        </Button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className="absolute inset-0"
                      style={{
                        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                        transformOrigin: 'center',
                        willChange: 'transform'
                      }}
                    >
                      {/* Video element - don't set src when camera is active to prevent srcObject reset */}
                      <video
                        key={videoElementKey}
                        ref={videoRef}
                        {...(!cameraActive && videoUrl ? { src: videoUrl } : {})}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onLoadedData={(event) => {
                          if (!event.currentTarget.srcObject) {
                            inspectVideoElement(event.currentTarget, true);
                          }
                        }}
                        onPlay={(event) => syncPlaybackState(event.currentTarget)}
                        onPause={(event) => syncPlaybackState(event.currentTarget)}
                        onEnded={(event) => syncPlaybackState(event.currentTarget)}
                        onSeeked={(event) => {
                          syncPlaybackState(event.currentTarget);
                          handleVideoSeeked();
                        }}
                        className="w-full h-full object-contain bg-black"
                        style={{
                          display: 'block',
                          zIndex: 1
                        }}
                        playsInline
                        muted={isMuted || cameraActive}
                        autoPlay={cameraActive}
                      />

                      {/* AI Pose Overlay */}
                      {aiAnalysisEnabled && (videoUrl || cameraActive) && videoRef.current && videoRef.current.videoWidth > 0 && (
                        <PoseOverlay
                          keypoints={adjustedKeypoints}
                          videoWidth={videoRef.current.videoWidth}
                          videoHeight={videoRef.current.videoHeight}
                          canvasWidth={overlayWidth}
                          canvasHeight={overlayHeight}
                          {...getContainLayout(
                            overlayWidth,
                            overlayHeight,
                            videoRef.current.videoWidth,
                            videoRef.current.videoHeight
                          )}
                          modelType={modelType}
                          threshold={tuningParams?.scoreThreshold ?? 0.3}
                          trailHistory={trailHistory}
                          trailConfigs={trailConfigs}
                          trailOpacity={trailOpacity}
                          currentTime={currentTime}
                          onKeypointClick={handleKeypointClick}
                          onKeypointDrag={keypointDragMode ? handleKeypointDrag : undefined}
                          selectedKeypoint={selectedKeypoint}
                          containerTransform={{ x: panOffset.x, y: panOffset.y, scale: zoom }}
                          dragModeEnabled={keypointDragMode}
                          allowInteraction={selectedTool === 'select'}
                          onHoverKeypoint={setHoveredKeypointIndex}
                          hoveredKeypointIndex={hoveredKeypointIndex}
                          onClickOutside={() => setSelectedKeypoint(null)}
                          showAngles={showJointAngles}
                        />
                      )}

                      {/* Center of Mass and Balance Point Visualization */}
                      {(centerOfMass || balancePoint) && videoRef.current && (
                        <CenterOfMassCanvas
                          centerOfMass={centerOfMass}
                          balancePoint={balancePoint}
                          videoWidth={videoRef.current.videoWidth}
                          videoHeight={videoRef.current.videoHeight}
                          canvasWidth={overlayWidth}
                          canvasHeight={overlayHeight}
                        />
                      )}

                      {/* Canvas for drawings */}
                      {!cameraActive && (
                        <canvas
                          ref={canvasRef}
                          onPointerDown={handlePointerDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onPointerLeave={handlePointerLeave}
                          className={`absolute inset-0 w-full h-full ${shouldCaptureTouch ? 'touch-none' : ''}`}
                          style={{
                            cursor: 'crosshair',
                            zIndex: 2,
                            pointerEvents: 'auto'
                          }}
                        />
                      )}

                      </div>
                    <VideoPlaybackBanner notice={videoPlaybackNotice} />

                  {aiAnalysisEnabled && showTuningPanel && (
                    <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs rounded-md px-2 py-1 z-20">
                      <div>Model: {modelType}</div>
                      <div>Raw: {debugInfo.source} ({debugInfo.rawCount})</div>
                      <div>Raw min x/y: {debugInfo.rawMinX.toFixed(3)}/{debugInfo.rawMinY.toFixed(3)}</div>
                      <div>Raw max x/y: {debugInfo.rawMaxX.toFixed(3)}/{debugInfo.rawMaxY.toFixed(3)}</div>
                      <div>Keypoints: {debugPoseInfo().count}</div>
                      <div>Max score: {debugPoseInfo().maxScore}</div>
                      <div>Min x/y: {debugPoseInfo().minX}/{debugPoseInfo().minY}</div>
                      <div>Max x/y: {debugPoseInfo().maxX}/{debugPoseInfo().maxY}</div>
                      <div>Video: {debugPoseInfo().videoW}x{debugPoseInfo().videoH}</div>
                      {debugInfo.qualityScore !== undefined && (
                        <div className={`mt-1 ${debugInfo.qualityScore < 0.7 ? 'text-amber-400' : 'text-green-400'}`}>
                          Quality: {(debugInfo.qualityScore * 100).toFixed(0)}%
                          {debugInfo.qualityScore < 0.7 && debugInfo.missingCriticalKeypoints && debugInfo.missingCriticalKeypoints.length > 0 && (
                            <div className="text-amber-300 text-[10px]">Missing: {debugInfo.missingCriticalKeypoints.join(', ')}</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Quality indicator badge - visible when AI is enabled */}
                  {aiAnalysisEnabled && debugInfo.qualityScore !== undefined && (
                    <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-medium z-20 shadow-lg ${
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

                  {/* Camera orientation mismatch warning */}
                  {orientationMismatch && (
                    <div className="absolute top-12 right-3 px-3 py-1.5 rounded-lg text-xs font-medium z-20 shadow-lg bg-amber-500/90 text-white max-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-100">⚠</span>
                        <span>View mismatch</span>
                      </div>
                      <div className="mt-0.5 text-[10px] opacity-90 leading-snug">
                        {activePreset?.label} expects{' '}
                        {activePreset?.expectedView
                          ?.map((v) => orientationLabel[v] ?? v)
                          .join(' or ')}{' '}
                        view. Detected: {orientationLabel[cameraOrientation.orientation] ?? cameraOrientation.orientation}.
                      </div>
                    </div>
                  )}

                  {/* ArUco calibration badge — 3 states: scanning / calibrated / not found */}
                  {videoUrl && !cameraActive && (arucoDetecting || calibration.isCalibrated || arucoError) && (
                    <div
                      className={`absolute top-3 ${aiAnalysisEnabled && debugInfo.qualityScore !== undefined ? 'right-36' : 'right-3'} px-2.5 py-1 rounded-full text-xs font-medium z-20 shadow-lg flex items-center gap-1.5 ${
                        calibration.isCalibrated
                          ? 'bg-blue-500/90 text-white'
                          : arucoDetecting
                          ? 'bg-zinc-700/90 text-zinc-200'
                          : 'bg-amber-500/90 text-white'
                      }`}
                    >
                      {calibration.isCalibrated ? (
                        <>
                          <ArucoIcon className="h-3 w-3 rounded-[2px]" />
                          <span>ArUco calibrated</span>
                        </>
                      ) : arucoDetecting ? (
                        <>
                          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
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

                    {/* Countdown Overlay */}
                    {countdownActive && countdown > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                        <div className="text-center">
                          <div 
                            className="text-[180px] font-black text-white"
                            style={{
                              textShadow: '0 0 80px rgba(255,255,255,0.6), 0 0 160px rgba(239,68,68,0.4)',
                              animation: 'pulse 1s ease-in-out infinite'
                            }}
                          >
                            {countdown}
                          </div>
                          <p className="text-white/60 text-xl mt-4">Get ready...</p>
                        </div>
                      </div>
                    )}

                    {/* Recording indicator */}
                    {isRecording && (
                      <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg z-10">
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                        <span className="text-sm font-medium">REC</span>
                      </div>
                    )}

                    {/* Drawing instructions */}
                    {!cameraActive && selectedTool !== 'select' && pendingPointsRef.current.length > 0 && (
                      <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded-lg text-xs backdrop-blur-sm">
                        {selectedTool === 'angle' && <span>Points: {pendingPointsRef.current.length}/3</span>}
                        {selectedTool === 'line' && <span>Points: {pendingPointsRef.current.length}/2</span>}
                        {selectedTool === 'circle' && <span>Points: {pendingPointsRef.current.length}/2</span>}
                      </div>
                    )}

                    {/* Camera controls overlay — Record/Stop/Flip centered at bottom of canvas */}
                    {cameraActive && !countdownActive && (
                      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 pointer-events-auto">
                        {!isRecording && (
                          <button
                            onClick={cancelCamera}
                            className="h-10 px-4 rounded-full bg-white/90 text-slate-900 text-sm font-medium shadow-lg hover:bg-white transition-colors"
                            title="Cancel"
                          >
                            Cancel
                          </button>
                        )}
                        {!isRecording && (
                          <button
                            onClick={flipCamera}
                            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                            title="Switch front/back camera"
                          >
                            <SwitchCamera className="w-5 h-5" />
                          </button>
                        )}
                        {isRecording ? (
                          <button
                            onClick={stopRecording}
                            className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg transition-colors"
                            title="Stop recording"
                          >
                            <Square className="w-6 h-6 fill-white text-white" />
                          </button>
                        ) : (
                          <button
                            onClick={startCountdown}
                            className="w-12 h-12 rounded-full bg-white/20 backdrop-blur border-4 border-white hover:bg-white/30 flex items-center justify-center shadow-lg transition-colors"
                            title="Start recording"
                          >
                            <div className="w-7 h-7 rounded-full bg-red-500" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Toolbars container - groups KeypointToolbar and ZoomToolbar */}
                    <div className="absolute bottom-4 right-4 z-10 pointer-events-auto flex flex-col items-end gap-2">
                      <div className="flex items-center gap-4">
                      {/* Keypoint Toolbar — visible whenever AI is active; keypoint-specific controls appear on selection */}
                      {aiAnalysisEnabled && (videoUrl !== null || cameraActive) && (
                        <div className="hidden sm:block">
                          <KeypointToolbar
                            selectedKeypoint={selectedKeypoint}
                            keypointDragMode={keypointDragMode}
                            onDragModeChange={setKeypointDragMode}
                            trailEnabled={selectedKeypoint !== null ? (trailConfigs[selectedKeypoint]?.enabled ?? false) : false}
                            trailColor={selectedKeypoint !== null ? (trailConfigs[selectedKeypoint]?.color ?? globalTrailConfig.color) : globalTrailConfig.color}
                            onTrailToggle={() => selectedKeypoint !== null && handleToggleTrailForKeypoint(selectedKeypoint)}
                            onTrailColorChange={(color) => selectedKeypoint !== null && handleChangeTrailColor(selectedKeypoint, color)}
                            showCenterOfMass={showCenterOfMass}
                            showBalancePoint={showBalancePoint}
                            onCenterOfMassChange={setShowCenterOfMass}
                            onBalancePointChange={setShowBalancePoint}
                            onClose={handleCloseKeypointMenu}
                            onResetKeypoint={selectedKeypoint !== null ? () => handleResetKeypointOffset(selectedKeypoint) : undefined}
                          />
                        </div>
                      )}
                      {/* Zoom Toolbar */}
                      <div className={`bg-white/90 backdrop-blur border border-slate-200 rounded-lg shadow-sm p-1 ${isFullscreen && videoUrl && !cameraActive ? 'flex flex-col items-stretch gap-1 min-w-[320px]' : 'flex items-center gap-1'}`}>
                        {isFullscreen && videoUrl && !cameraActive && (
                          <div className="px-1 pt-1">
                            <Slider
                              value={[currentTime]}
                              min={0}
                              max={durationMax}
                              step={0.01}
                              onValueChange={handleSeek}
                              className={videoScrubberClassName}
                            />
                            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                              <span className="tabular-nums">{formatTime(currentTime)}</span>
                              <span className="tabular-nums">{formatTime(duration)}</span>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                        {isFullscreen && videoUrl && !cameraActive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={skipBackward}
                            className="h-8 w-8"
                            title="Previous Frame"
                            disabled={!canTogglePlayback}
                          >
                            <ChevronsLeft className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={togglePlayPause}
                          className="h-8 w-8"
                          title="Play / Still"
                          disabled={!canTogglePlayback}
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                        {isFullscreen && videoUrl && !cameraActive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={skipForward}
                            className="h-8 w-8"
                            title="Next Frame"
                            disabled={!canTogglePlayback}
                          >
                            <ChevronsRight className="w-4 h-4" />
                          </Button>
                        )}
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <Button
                          variant={selectedTool === 'select' ? 'default' : 'ghost'}
                          size="icon"
                          onClick={() => { setSelectedTool('select'); pendingPointsRef.current = []; scheduleRender(); }}
                          className="h-8 w-8"
                          title="Select"
                        >
                          <Move className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                          className="h-8 w-8"
                          title="Zoom out"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setZoom(z => Math.min(3, z + 0.1))}
                          className="h-8 w-8"
                          title="Zoom in"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleFullscreen}
                          className="h-8 w-8"
                          title={isFullscreen ? 'Exit full screen' : 'Full screen'}
                        >
                          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </Button>
                        {videoUrl && !cameraActive && (
                          <>
                            <div className="w-px h-5 bg-slate-200 mx-1" />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={resetVideo}
                              className="h-8 w-8 text-rose-600 hover:text-rose-700"
                              title="New"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        </div>
                      </div>
                    </div>
                    </div>
	
                    {/* Floating tools (3-state): hidden → icons → expanded.
                       Mobile/tablet only (lg:hidden). Desktop uses the sidebar instead. */}
                    {!cameraActive && (
                      <div className={`lg:hidden absolute left-2 ${isFullscreen ? 'top-14' : 'top-4'} z-20 pointer-events-none`}>
                        {mobileToolbarMode === 'hidden' ? (
                          <button
                            type="button"
                            onClick={cycleMobileToolbarMode}
                            className="pointer-events-auto h-10 w-10 rounded-full bg-white/90 backdrop-blur border border-slate-200 shadow-sm flex items-center justify-center"
                            title="Tools"
                            disabled={toolsDisabled}
                          >
                            <PanelLeftOpen className="w-5 h-5 text-slate-700" />
                          </button>
                        ) : (
                          <div
                            className={`pointer-events-auto bg-white/90 backdrop-blur border border-slate-200 shadow-lg rounded-xl overflow-hidden ${
                              mobileToolbarMode === 'icons' ? 'w-12' : 'w-44'
                            }`}
                          >
                            <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-200">
                              <button
                                type="button"
                                onClick={cycleMobileToolbarMode}
                                className="h-8 w-8 rounded-md hover:bg-slate-100 flex items-center justify-center"
                                title={
                                  mobileToolbarMode === 'icons'
                                    ? 'Expand tools'
                                    : 'Hide tools'
                                }
                                disabled={toolsDisabled}
                              >
                                {mobileToolbarMode === 'icons' ? (
                                  <PanelLeftOpen className="w-4 h-4 text-slate-700" />
                                ) : (
                                  <PanelLeftClose className="w-4 h-4 text-slate-700" />
                                )}
                              </button>
                              {mobileToolbarMode === 'expanded' && (
                                <div className="text-xs text-slate-600">Tools</div>
                              )}
                              <div className="w-8" />
                            </div>

                            <div className="max-h-[70vh] overflow-y-auto p-1.5 space-y-1">
                              <Button
                                variant={selectedTool === 'select' ? 'default' : 'ghost'}
                                size="sm"
                                disabled={toolsDisabled}
                                onClick={() => { setSelectedTool('select'); pendingPointsRef.current = []; scheduleRender(); }}
                                className={`h-9 ${mobileToolbarMode === 'icons' ? 'justify-center px-0' : 'justify-start gap-2 px-2'}`}
                                title="Select"
                              >
                                <Move className="w-4 h-4" />
                                {mobileToolbarMode === 'expanded' && <span className="text-xs">Select</span>}
                              </Button>

                              <Button
                                variant={selectedTool === 'freehand' ? 'default' : 'ghost'}
                                size="sm"
                                disabled={toolsDisabled}
                                onClick={() => { setSelectedTool('freehand'); pendingPointsRef.current = []; scheduleRender(); }}
                                className={`h-9 ${mobileToolbarMode === 'icons' ? 'justify-center px-0' : 'justify-start gap-2 px-2'}`}
                                title="Freehand"
                              >
                                <Pencil className="w-4 h-4" />
                                {mobileToolbarMode === 'expanded' && <span className="text-xs">Freehand</span>}
                              </Button>

                              <Button
                                variant={selectedTool === 'line' ? 'default' : 'ghost'}
                                size="sm"
                                disabled={toolsDisabled}
                                onClick={() => { setSelectedTool('line'); pendingPointsRef.current = []; scheduleRender(); }}
                                className={`h-9 ${mobileToolbarMode === 'icons' ? 'justify-center px-0' : 'justify-start gap-2 px-2'}`}
                                title="Line"
                              >
                                <Minus className="w-4 h-4" />
                                {mobileToolbarMode === 'expanded' && <span className="text-xs">Line</span>}
                              </Button>

                              <Button
                                variant={selectedTool === 'angle' ? 'default' : 'ghost'}
                                size="sm"
                                disabled={toolsDisabled}
                                onClick={() => { setSelectedTool('angle'); pendingPointsRef.current = []; scheduleRender(); }}
                                className={`h-9 ${mobileToolbarMode === 'icons' ? 'justify-center px-0' : 'justify-start gap-2 px-2'}`}
                                title="Angle"
                              >
                                <Compass className="w-4 h-4" />
                                {mobileToolbarMode === 'expanded' && <span className="text-xs">Angle</span>}
                              </Button>

                              <Button
                                variant={selectedTool === 'circle' ? 'default' : 'ghost'}
                                size="sm"
                                disabled={toolsDisabled}
                                onClick={() => { setSelectedTool('circle'); pendingPointsRef.current = []; scheduleRender(); }}
                                className={`h-9 ${mobileToolbarMode === 'icons' ? 'justify-center px-0' : 'justify-start gap-2 px-2'}`}
                                title="Circle"
                              >
                                <Circle className="w-4 h-4" />
                                {mobileToolbarMode === 'expanded' && <span className="text-xs">Circle</span>}
                              </Button>

                              <Button
                                variant={selectedTool === 'goniometer' ? 'default' : 'ghost'}
                                size="sm"
                                disabled={toolsDisabled}
                                onClick={() => { setSelectedTool('goniometer'); pendingPointsRef.current = []; scheduleRender(); }}
                                className={`h-9 ${mobileToolbarMode === 'icons' ? 'justify-center px-0' : 'justify-start gap-2 px-2'}`}
                                title="Goniometer"
                              >
                                <Compass className="w-4 h-4" />
                                {mobileToolbarMode === 'expanded' && <span className="text-xs">Gonio</span>}
                              </Button>

                              <Button
                                variant={selectedTool === 'plumbline' ? 'default' : 'ghost'}
                                size="sm"
                                disabled={toolsDisabled}
                                onClick={() => { setSelectedTool('plumbline'); pendingPointsRef.current = []; scheduleRender(); }}
                                className={`h-9 ${mobileToolbarMode === 'icons' ? 'justify-center px-0' : 'justify-start gap-2 px-2'}`}
                                title="Plumb Line"
                              >
                                <Ruler className="w-4 h-4" />
                                {mobileToolbarMode === 'expanded' && <span className="text-xs">Plumb</span>}
                              </Button>

                              <Separator />

                              {mobileToolbarMode === 'expanded' && (
                                <div className="px-2 pt-1 text-[11px] text-slate-500">Mode</div>
                              )}

                              <Button
                                variant={drawingMode === 'global' ? 'default' : 'outline'}
                                size="sm"
                                disabled={toolsDisabled}
                                onClick={() => setDrawingMode('global')}
                                className={`h-9 ${mobileToolbarMode === 'icons' ? 'justify-center px-0' : 'justify-start gap-2 px-2'}`}
                                title="Global"
                              >
                                <Globe className="w-4 h-4" />
                                {mobileToolbarMode === 'expanded' && <span className="text-xs">Global</span>}
                              </Button>

                              <Button
                                variant={drawingMode === 'timebound' ? 'default' : 'outline'}
                                size="sm"
                                disabled={toolsDisabled}
                                onClick={() => setDrawingMode('timebound')}
                                className={`h-9 ${mobileToolbarMode === 'icons' ? 'justify-center px-0' : 'justify-start gap-2 px-2'}`}
                                title="Timebound"
                              >
                                <Clock className="w-4 h-4" />
                                {mobileToolbarMode === 'expanded' && <span className="text-xs">Timebound</span>}
                              </Button>

                              <Separator />

                              <Button
                                variant="outline"
                                size="sm"
                                disabled={toolsDisabled}
                                onClick={() => setSelectedColor((prev) => cycleColor(prev))}
                                className={`h-9 ${mobileToolbarMode === 'icons' ? 'justify-center px-0' : 'justify-start gap-2 px-2'}`}
                                title="Cycle color"
                              >
                                <span className="relative inline-flex items-center justify-center">
                                  <Palette className="w-4 h-4" />
                                  <span
                                    className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-white shadow"
                                    style={{ backgroundColor: selectedColor }}
                                    aria-hidden="true"
                                  />
                                </span>
                                {mobileToolbarMode === 'expanded' && (
                                  <span className="text-xs flex items-center gap-2">
                                    Color
                                    <span
                                      className="w-3 h-3 rounded-full border border-slate-200"
                                      style={{ backgroundColor: selectedColor }}
                                      aria-hidden="true"
                                    />
                                  </span>
                                )}
                              </Button>

                              <Button
                                variant={showGrid ? 'default' : 'outline'}
                                size="sm"
                                disabled={toolsDisabled}
                                onClick={() => setShowGrid((prev) => !prev)}
                                className={`h-9 ${mobileToolbarMode === 'icons' ? 'justify-center px-0' : 'justify-start gap-2 px-2'}`}
                                title="Grid"
                              >
                                <Grid3x3 className="w-4 h-4" />
                                {mobileToolbarMode === 'expanded' && <span className="text-xs">Grid</span>}
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                disabled={toolsDisabled}
                                onClick={undoLastDrawing}
                                className={`h-9 ${mobileToolbarMode === 'icons' ? 'justify-center px-0' : 'justify-start gap-2 px-2'}`}
                                title="Undo"
                              >
                                <Undo className="w-4 h-4" />
                                {mobileToolbarMode === 'expanded' && <span className="text-xs">Undo</span>}
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                disabled={toolsDisabled}
                                onClick={clearDrawings}
                                className={`h-9 ${mobileToolbarMode === 'icons' ? 'justify-center px-0' : 'justify-start gap-2 px-2'}`}
                                title="Clear drawings"
                              >
                                <Trash2 className="w-4 h-4" />
                                {mobileToolbarMode === 'expanded' && <span className="text-xs">Clear</span>}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

              </div>

                {/* Controls */}
                {!cameraActive && videoUrl && !isFullscreen && (
                  <>
                    {/* Mobile: compact controls + drawer */}
                    <div className="sm:hidden bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                      <div className="relative">
                        <Slider
                          value={[currentTime]}
                          min={0}
                          max={durationMax}
                          step={0.01}
                          onValueChange={handleSeek}
                          className={videoScrubberRestClassName}
                        />

                        {markers.map((marker) => (
                          <div
                            key={marker.id}
                            className="absolute top-0 w-1 h-2 -mt-0.5 rounded"
                            style={{
                              left: `${duration ? (marker.time / duration) * 100 : 0}%`,
                              backgroundColor: marker.color,
                            }}
                          />
                        ))}

                        {loopPoints.start !== null && loopPoints.end !== null && duration && (
                          <div
                            className="absolute top-1 h-0.5 bg-blue-500/50 rounded"
                            style={{
                              left: `${(loopPoints.start / duration) * 100}%`,
                              width: `${((loopPoints.end - loopPoints.start) / duration) * 100}%`,
                            }}
                          />
                        )}

                        <div className="flex justify-between text-[11px] text-slate-500 mt-0.5">
                          <span className="tabular-nums">{formatTime(currentTime)}</span>
                          <span className="tabular-nums">{formatTime(duration)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={skipBackward}
                            title="Previous Frame"
                            className="h-8 w-8"
                          >
                            <ChevronsLeft className="w-4 h-4" />
                          </Button>
                          <Button onClick={togglePlayPause} size="icon" className="h-9 w-9">
                            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={skipForward}
                            title="Next Frame"
                            className="h-8 w-8"
                          >
                            <ChevronsRight className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          <Sheet open={toolsDrawerOpen} onOpenChange={setToolsDrawerOpen}>
                            <SheetTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 px-3">
                                Tools
                              </Button>
                            </SheetTrigger>
                            <SheetContent side="bottom" className="max-h-[80vh] rounded-t-lg flex flex-col overflow-hidden">
                              <SheetHeader className="pb-2">
                                <div className="flex items-center justify-between gap-2">
                                  <SheetTitle>Tools</SheetTitle>
                                  <SheetClose asChild>
                                    <Button variant="ghost" size="sm" className="h-8 px-2">
                                      Close
                                    </Button>
                                  </SheetClose>
                                </div>
                              </SheetHeader>
	
                              <div className="px-4 pb-4 space-y-4 overflow-y-auto flex-1">
                                <div className="grid grid-cols-2 gap-2">
                                  <Button variant="outline" size="sm" onClick={jumpToStart} className="h-9">
                                    Start
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={jumpToEnd} className="h-9">
                                    End
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={toggleMute}
                                    className="h-9"
                                    title={isMuted ? 'Unmute' : 'Mute'}
                                  >
                                    {isMuted ? 'Unmute' : 'Mute'}
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={resetVideo} className="h-9">
                                    New
                                  </Button>
                                </div>
	
                                <div className="space-y-1">
                                  <Label className="text-xs text-slate-500">Speed</Label>
                                  <Select
                                    value={String(playbackRate)}
                                    onValueChange={(value) => setSpeed(Number(value))}
                                  >
                                    <SelectTrigger size="sm" className="h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {speeds.map((s) => (
                                        <SelectItem key={s} value={String(s)}>
                                          {s}×
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
	
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-500">Loop</Label>
                                  <div className="grid grid-cols-4 gap-2">
                                    <Button variant="outline" size="sm" onClick={setLoopStart} className="h-9">
                                      A
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={setLoopEnd} className="h-9">
                                      B
                                    </Button>
                                    <Button
                                      variant={isLooping ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => setIsLooping(!isLooping)}
                                      className="h-9"
                                      disabled={loopPoints.start === null || loopPoints.end === null}
                                    >
                                      Loop
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={clearLoop}
                                      className="h-9"
                                      disabled={loopPoints.start === null && loopPoints.end === null}
                                    >
                                      Clear
                                    </Button>
                                  </div>
                                </div>
	
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-slate-500">Markers</Label>
                                    <Button variant="outline" size="sm" onClick={addMarker} className="h-8">
                                      Add
                                    </Button>
                                  </div>
                                  {markers.length === 0 ? (
                                    <div className="text-xs text-slate-500">No markers yet.</div>
                                  ) : (
                                    <div className="flex flex-wrap gap-2">
                                      {[...markers]
                                        .sort((a, b) => a.time - b.time)
                                        .map((marker) => (
                                          <div
                                            key={marker.id}
                                            className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg"
                                          >
                                            <div
                                              className="w-2 h-2 rounded-full"
                                              style={{ backgroundColor: marker.color }}
                                            />
                                            <button
                                              onClick={() => jumpToMarker(marker.time)}
                                              className="text-xs text-slate-700 tabular-nums"
                                            >
                                              {formatTime(marker.time)}
                                            </button>
                                            <button
                                              onClick={() => deleteMarker(marker.id)}
                                              className="text-red-500 hover:text-red-600"
                                              title="Delete marker"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                </div>
	
                                <div className="grid grid-cols-2 gap-2">
                                  <Button variant="outline" size="sm" onClick={handleExport} className="h-9">
                                    Export
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={handleShare} className="h-9">
                                    Share
                                  </Button>
                                </div>
                              </div>
                            </SheetContent>
                          </Sheet>

                          <Sheet open={aiDrawerOpen} onOpenChange={setAiDrawerOpen}>
                            <SheetTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="relative h-8 px-3 bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100"
                                title="AI Analysis"
                              >
                                <Brain className="w-4 h-4 mr-2" />
                                AI
                                <span className="absolute -top-1 -right-1 pointer-events-none">
                                  <PremiumBadge variant="icon-only" />
                                </span>
                              </Button>
                            </SheetTrigger>
                            <SheetContent side="bottom" className="max-h-[80vh] rounded-t-lg flex flex-col overflow-hidden">
                              <SheetHeader className="pb-2">
                                <div className="flex items-center justify-between gap-2">
                                  <SheetTitle>AI Analysis</SheetTitle>
                                  <SheetClose asChild>
                                    <Button variant="ghost" size="sm" className="h-8 px-2">
                                      Close
                                    </Button>
                                  </SheetClose>
                                </div>
                              </SheetHeader>

                              <div className="px-4 pb-4 space-y-4 overflow-y-auto flex-1">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium text-slate-900">Enable AI</div>
                                    <div className="text-xs text-slate-500 truncate">Pose detection overlays</div>
                                  </div>
                                  <div className="relative flex items-center">
                                    <Switch checked={aiAnalysisEnabled} onCheckedChange={handleToggleAiAnalysis} />
                                    <span className="absolute -top-1 -right-1 pointer-events-none">
                                      <PremiumBadge variant="icon-only" />
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-500">Model</Label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <Button
                                      variant={modelType === 'blazepose' ? 'default' : 'outline'}
                                      size="sm"
                                      className="h-9"
                                      disabled={!aiAnalysisEnabled}
                                      onClick={() => handleSelectModelType('blazepose')}
                                    >
                                      BlazePose
                                    </Button>
                                    <Button
                                      variant={modelType === 'movenet' ? 'default' : 'outline'}
                                      size="sm"
                                      className="h-9"
                                      disabled={!aiAnalysisEnabled}
                                      onClick={() => handleSelectModelType('movenet')}
                                    >
                                      MoveNet
                                    </Button>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <Label className="text-xs text-slate-500">Keypoints</Label>

                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm text-slate-900">Drag mode</div>
                                    <Switch checked={keypointDragMode} onCheckedChange={setKeypointDragMode} disabled={!aiAnalysisEnabled} />
                                  </div>

                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm text-slate-900">Trail</div>
                                    <Switch
                                      checked={selectedKeypoint !== null ? (trailConfigs[selectedKeypoint]?.enabled ?? false) : false}
                                      onCheckedChange={() => selectedKeypoint !== null && handleToggleTrailForKeypoint(selectedKeypoint)}
                                      disabled={!aiAnalysisEnabled || selectedKeypoint === null}
                                    />
                                  </div>

                                  {selectedKeypoint !== null && (trailConfigs[selectedKeypoint]?.enabled ?? false) && (
                                    <div className="flex flex-wrap gap-2">
                                      {['#ffff00', '#00ff00', '#ff00ff', '#00ffff', '#ff0000', '#0000ff'].map((color) => (
                                        <button
                                          key={color}
                                          type="button"
                                          onClick={() => handleChangeTrailColor(selectedKeypoint, color)}
                                          className={`h-8 w-8 rounded-md border ${
                                            (trailConfigs[selectedKeypoint]?.color ?? globalTrailConfig.color) === color
                                              ? 'border-slate-900'
                                              : 'border-slate-200'
                                          }`}
                                          style={{ backgroundColor: color }}
                                          title={color}
                                        />
                                      ))}
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm text-slate-900">COM</div>
                                    <Switch checked={showCenterOfMass} onCheckedChange={setShowCenterOfMass} disabled={!aiAnalysisEnabled} />
                                  </div>

                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm text-slate-900">BOS</div>
                                    <Switch checked={showBalancePoint} onCheckedChange={setShowBalancePoint} disabled={!aiAnalysisEnabled} />
                                  </div>

                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm text-slate-900">Joint Angles</div>
                                    <Switch checked={showJointAngles} onCheckedChange={setShowJointAngles} disabled={!aiAnalysisEnabled} />
                                  </div>

                                  {selectedKeypoint !== null ? (
                                    <div className="grid grid-cols-2 gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9"
                                        disabled={!aiAnalysisEnabled}
                                        onClick={() => handleResetKeypointOffset(selectedKeypoint)}
                                      >
                                        Reset keypoint
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9"
                                        onClick={() => setSelectedKeypoint(null)}
                                      >
                                        Deselect
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-slate-500">
                                      Select a keypoint on the video to enable trails and reset.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </SheetContent>
                          </Sheet>
                        </div>
                      </div>
                    </div>

                    {/* Desktop/tablet: keep full controls */}
                    <div className="hidden sm:block bg-white rounded-xl border border-slate-200 p-2 sm:p-3 space-y-2">
                      {/* Timeline */}
                      <div className="relative">
                        <Slider
                          value={[currentTime]}
                          min={0}
                          max={durationMax}
                          step={0.01}
                          onValueChange={handleSeek}
                          className={videoScrubberRestClassName}
                        />
                        
                        {markers.map((marker) => (
                          <div
                            key={marker.id}
                            className="absolute top-0 w-1 h-3 -mt-1 rounded"
                            style={{
                              left: `${duration ? (marker.time / duration) * 100 : 0}%`,
                              backgroundColor: marker.color,
                            }}
                          />
                        ))}

                        {loopPoints.start !== null && loopPoints.end !== null && duration && (
                          <div
                            className="absolute top-1 h-1 bg-blue-500/50 rounded"
                            style={{
                              left: `${(loopPoints.start / duration) * 100}%`,
                              width: `${((loopPoints.end - loopPoints.start) / duration) * 100}%`,
                            }}
                          />
                        )}

                        <div className="flex justify-between text-[11px] text-slate-500 mt-0.5">
                          <span className="tabular-nums">{formatTime(currentTime)}</span>
                          <span className="tabular-nums">{formatTime(duration)}</span>
                        </div>
                      </div>

                      {/* Playback Controls */}
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <Button variant="outline" size="icon" onClick={jumpToStart} title="Jump to Start" className="h-7 w-7">
                          <SkipBack className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={skipBackward} title="Previous Frame" className="h-7 w-7">
                          <ChevronsLeft className="w-3.5 h-3.5" />
                        </Button>
                        
                        <Button onClick={togglePlayPause} size="icon" className="h-9 w-9">
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>

                        <Button variant="outline" size="icon" onClick={skipForward} title="Next Frame" className="h-7 w-7">
                          <ChevronsRight className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={jumpToEnd} title="Jump to End" className="h-7 w-7">
                          <SkipForward className="w-3.5 h-3.5" />
                        </Button>

                        <Separator orientation="vertical" className="h-6 mx-1" />

                        <Button variant="outline" size="icon" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'} className="h-7 w-7">
                          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </Button>
                        
                        <Separator orientation="vertical" className="h-6 mx-1" />
                        
                        {speeds.map((s) => (
                          <Button
                            key={s}
                            variant={playbackRate === s ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSpeed(s)}
                            className="px-2 text-[11px] h-7"
                          >
                            {s}×
                          </Button>
                        ))}

                        <Separator orientation="vertical" className="h-6 mx-1" />

                        <Button variant="outline" size="sm" onClick={addMarker} className="gap-1 h-7 px-2" title="Add Marker (M)">
                          <Bookmark className="w-3 h-3" />
                        </Button>

                        <Button variant="outline" size="sm" onClick={setLoopStart} className="h-7 px-2 text-[11px]">A</Button>
                        <Button variant="outline" size="sm" onClick={setLoopEnd} className="h-7 px-2 text-[11px]">B</Button>

                        {loopPoints.start !== null && loopPoints.end !== null && (
                          <>
                            <Button
                              variant={isLooping ? 'default' : 'outline'}
                              size="icon"
                              onClick={() => setIsLooping(!isLooping)}
                              className="h-7 w-7"
                            >
                              <Repeat className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={clearLoop} className="h-7 w-7">
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}

                        <Separator orientation="vertical" className="h-6 mx-1" />

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetVideo}
                          className="gap-1 h-7 px-2"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      </div>

	
                  </>
                )}

                {showTuningPanel && !isFullscreen && (
                  <div className="hidden sm:block bg-white rounded-xl border border-slate-200 p-4 space-y-4">
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
                                  enableSmoothing: false,
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
                                  enableSmoothing: false,
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
                          checked={tuningParams?.enableSmoothing ?? false}
                          onCheckedChange={(checked) =>
                            setTuningParams((prev) => ({
                              ...(prev ?? {
                                scoreThreshold: 0.3,
                                minPoseScore: 0.1,
                                enableSmoothing: false,
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
                                  enableSmoothing: false,
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
                                  enableSmoothing: false,
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
                                  enableSmoothing: false,
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
                                  enableSmoothing: false,
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
                  </div>
                )}
                

                {/* Markers Panel */}
                {markers.length > 0 && (
                  <div className="hidden sm:block bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-slate-900">Markers ({markers.length})</h4>
                      <Button variant="ghost" size="sm" onClick={() => setMarkers([])} className="text-xs text-red-500 h-6 px-2">
                        Clear All
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[...markers].sort((a, b) => a.time - b.time).map((marker) => (
                        <div
                          key={marker.id}
                          className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group"
                        >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: marker.color }} />
                          <button onClick={() => jumpToMarker(marker.time)} className="text-xs text-slate-700 tabular-nums">
                            {formatTime(marker.time)}
                          </button>
                          <button
                            onClick={() => deleteMarker(marker.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>

      {/* Subscription Modal (when payments are enabled) */}
      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
        featureName={subscriptionFeatureName}
      />
      {/* Limited-time free modal (when payments are off) */}
      <LimitedTimeFreeModal
        open={showLimitedTimeModal}
        onOpenChange={setShowLimitedTimeModal}
        featureName={subscriptionFeatureName}
        onGetStarted={handleLimitedTimeGetStarted}
      />
    </div>
  );
}
