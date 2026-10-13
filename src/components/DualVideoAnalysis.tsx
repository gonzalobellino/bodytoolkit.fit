import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ChevronLeft,
  Upload,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronsLeft,
  ChevronsRight,
  Lock,
  Unlock,
  X,
  Volume2,
  VolumeX,
  Move,
  Minus,
  Circle,
  Pencil,
  Compass,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Separator } from './ui/separator';
import { useDualVideoSync } from '../hooks/useDualVideoSync';
import { useVideoPlaybackNotice } from '../hooks/useVideoPlaybackNotice';
import { VideoPlaybackBanner } from './VideoPlaybackBanner';

interface DualVideoAnalysisProps {
  onBack: () => void;
}

type DrawTool = 'select' | 'line' | 'angle' | 'circle' | 'freehand' | 'goniometer' | 'plumbline';

interface Point { x: number; y: number }

interface DrawingElement {
  id: string;
  type: DrawTool;
  points: Point[];
  color: string;
}

const COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#FFFFFF'];
const SPEEDS = [0.25, 0.5, 1, 1.5, 2];

// ── Canvas rendering ────────────────────────────────────────────────────────

function renderCanvas(
  canvas: HTMLCanvasElement,
  drawings: DrawingElement[],
  pendingPoints: Point[],
  pendingTool: DrawTool,
  color: string,
  mousePos: Point | null,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const stroke = (c: string, fn: () => void, dash = false, w = 2) => {
    ctx.save();
    ctx.strokeStyle = c;
    ctx.fillStyle = c;
    ctx.lineWidth = w;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 3;
    if (dash) ctx.setLineDash([6, 4]);
    fn();
    ctx.restore();
  };

  const dot = (p: Point, c: string) => {
    ctx.save();
    ctx.fillStyle = c;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const angleLabel = (vertex: Point, p1: Point, p2: Point, c: string) => {
    const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
    const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
    let deg = Math.abs((a2 - a1) * 180 / Math.PI);
    if (deg > 180) deg = 360 - deg;
    ctx.save();
    ctx.fillStyle = c;
    ctx.font = 'bold 9px sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(`${deg.toFixed(1)}°`, vertex.x + 8, vertex.y - 8);
    ctx.restore();
  };

  // Completed drawings
  for (const el of drawings) {
    const { color: c, type, points: pts } = el;
    if (type === 'line' && pts.length >= 2) {
      stroke(c, () => { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y); ctx.stroke(); });
    } else if ((type === 'angle' || type === 'goniometer') && pts.length >= 3) {
      stroke(c, () => {
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pts[1].x, pts[1].y); ctx.lineTo(pts[2].x, pts[2].y); ctx.stroke();
      });
      angleLabel(pts[1], pts[0], pts[2], c);
    } else if (type === 'circle' && pts.length >= 2) {
      const r = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      stroke(c, () => { ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, r, 0, Math.PI * 2); ctx.stroke(); });
    } else if (type === 'freehand' && pts.length > 1) {
      stroke(c, () => { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke(); });
    } else if (type === 'plumbline' && pts.length >= 1) {
      stroke(c, () => { ctx.beginPath(); ctx.moveTo(pts[0].x, 0); ctx.lineTo(pts[0].x, canvas.height); ctx.stroke(); }, true);
    }
    pts.forEach(p => dot(p, c));
  }

  // In-progress preview
  if (pendingPoints.length === 0) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]);
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 3;
  const mp = mousePos;
  if (pendingTool === 'line' && pendingPoints.length === 1 && mp) {
    ctx.beginPath(); ctx.moveTo(pendingPoints[0].x, pendingPoints[0].y); ctx.lineTo(mp.x, mp.y); ctx.stroke();
  } else if ((pendingTool === 'angle' || pendingTool === 'goniometer') && mp) {
    if (pendingPoints.length === 1) {
      ctx.beginPath(); ctx.moveTo(pendingPoints[0].x, pendingPoints[0].y); ctx.lineTo(mp.x, mp.y); ctx.stroke();
    } else if (pendingPoints.length === 2) {
      ctx.beginPath(); ctx.moveTo(pendingPoints[0].x, pendingPoints[0].y); ctx.lineTo(pendingPoints[1].x, pendingPoints[1].y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pendingPoints[1].x, pendingPoints[1].y); ctx.lineTo(mp.x, mp.y); ctx.stroke();
    }
  } else if (pendingTool === 'circle' && pendingPoints.length === 1 && mp) {
    const r = Math.hypot(mp.x - pendingPoints[0].x, mp.y - pendingPoints[0].y);
    ctx.beginPath(); ctx.arc(pendingPoints[0].x, pendingPoints[0].y, r, 0, Math.PI * 2); ctx.stroke();
  } else if (pendingTool === 'freehand' && pendingPoints.length > 1) {
    ctx.beginPath(); ctx.moveTo(pendingPoints[0].x, pendingPoints[0].y);
    pendingPoints.slice(1).forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();
  }
  pendingPoints.forEach(p => dot(p, color));
  ctx.restore();
}

function getCanvasPoint(e: React.MouseEvent, canvas: HTMLCanvasElement): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export function DualVideoAnalysis({ onBack }: DualVideoAnalysisProps) {
  const playback1 = useVideoPlaybackNotice();
  const playback2 = useVideoPlaybackNotice();
  const [video1Url, setVideo1Url] = useState<string | null>(null);
  const [video2Url, setVideo2Url] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [splitPosition, setSplitPosition] = useState(50);
  const [isMuted1, setIsMuted1] = useState(true);
  const [isMuted2, setIsMuted2] = useState(true);

  // Toolbar
  const [toolbarExpanded, setToolbarExpanded] = useState(false);
  const [selectedTool, setSelectedTool] = useState<DrawTool>('select');
  const [drawingColor, setDrawingColor] = useState('#EF4444');

  // Drawings
  const [drawings1, setDrawings1] = useState<DrawingElement[]>([]);
  const [drawings2, setDrawings2] = useState<DrawingElement[]>([]);
  const pendingPointsRef = useRef<Point[]>([]);
  const mousePosRef = useRef<Point | null>(null);
  const activeVideoRef = useRef<1 | 2 | null>(null);
  const isDraggingRef = useRef(false);

  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const canvas1Ref = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  const container1Ref = useRef<HTMLDivElement>(null);
  const container2Ref = useRef<HTMLDivElement>(null);
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);

  // Video playback state — tracked via React event handlers on the video elements
  const [isPlaying1, setIsPlaying1] = useState(false);
  const [isPlaying2, setIsPlaying2] = useState(false);
  const [currentTime1, setCurrentTime1] = useState(0);
  const [currentTime2, setCurrentTime2] = useState(0);
  const [duration1, setDuration1] = useState(0);
  const [duration2, setDuration2] = useState(0);
  const isPlayingBoth = isPlaying1 && isPlaying2;

  const {
    playbackRate, playBoth, pauseBoth, playSingle, pauseSingle,
    seek, setSpeed, step, formatTime,
  } = useDualVideoSync({
    video1Ref: video1Ref as React.RefObject<HTMLVideoElement>,
    video2Ref: video2Ref as React.RefObject<HTMLVideoElement>,
    locked,
  });

  // ── Canvas sizing ──────────────────────────────────────────────────────────

  const syncCanvasSize = useCallback((num: 1 | 2) => {
    const canvas = num === 1 ? canvas1Ref.current : canvas2Ref.current;
    const container = num === 1 ? container1Ref.current : container2Ref.current;
    if (!canvas || !container) return;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }, []);

  useEffect(() => {
    const obs = new ResizeObserver(() => { syncCanvasSize(1); syncCanvasSize(2); });
    if (container1Ref.current) obs.observe(container1Ref.current);
    if (container2Ref.current) obs.observe(container2Ref.current);
    return () => obs.disconnect();
  }, [syncCanvasSize]);

  // ── Canvas rendering ───────────────────────────────────────────────────────

  const scheduleRender = useCallback((num: 1 | 2) => {
    const canvas = num === 1 ? canvas1Ref.current : canvas2Ref.current;
    const drawings = num === 1 ? drawings1 : drawings2;
    if (!canvas) return;
    const pending = activeVideoRef.current === num ? pendingPointsRef.current : [];
    renderCanvas(canvas, drawings, pending, selectedTool, drawingColor, mousePosRef.current);
  }, [drawings1, drawings2, selectedTool, drawingColor]);

  useEffect(() => { scheduleRender(1); }, [drawings1, selectedTool, drawingColor]);
  useEffect(() => { scheduleRender(2); }, [drawings2, selectedTool, drawingColor]);

  // ── Drawing handlers ───────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent, num: 1 | 2) => {
    if (selectedTool === 'select') return;
    const canvas = num === 1 ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas) return;
    activeVideoRef.current = num;
    const pt = getCanvasPoint(e, canvas);
    const setDrawings = num === 1 ? setDrawings1 : setDrawings2;

    if (selectedTool === 'freehand') {
      isDraggingRef.current = true;
      pendingPointsRef.current = [pt];
    } else if (selectedTool === 'plumbline') {
      setDrawings(prev => [...prev, { id: `${Date.now()}`, type: 'plumbline', points: [pt], color: drawingColor }]);
      activeVideoRef.current = null;
    } else {
      const needed = (selectedTool === 'angle' || selectedTool === 'goniometer') ? 3 : 2;
      pendingPointsRef.current = [...pendingPointsRef.current, pt];
      if (pendingPointsRef.current.length >= needed) {
        setDrawings(prev => [...prev, { id: `${Date.now()}`, type: selectedTool, points: [...pendingPointsRef.current], color: drawingColor }]);
        pendingPointsRef.current = [];
        activeVideoRef.current = null;
      }
    }
    scheduleRender(num);
  }, [selectedTool, drawingColor, scheduleRender]);

  const handleMouseMove = useCallback((e: React.MouseEvent, num: 1 | 2) => {
    const canvas = num === 1 ? canvas1Ref.current : canvas2Ref.current;
    if (!canvas) return;
    mousePosRef.current = getCanvasPoint(e, canvas);
    if (selectedTool === 'freehand' && isDraggingRef.current && activeVideoRef.current === num) {
      pendingPointsRef.current = [...pendingPointsRef.current, mousePosRef.current];
    }
    if (pendingPointsRef.current.length > 0 || isDraggingRef.current) scheduleRender(num);
  }, [selectedTool, scheduleRender]);

  const handleMouseUp = useCallback((e: React.MouseEvent, num: 1 | 2) => {
    if (selectedTool !== 'freehand' || !isDraggingRef.current || activeVideoRef.current !== num) return;
    isDraggingRef.current = false;
    const setDrawings = num === 1 ? setDrawings1 : setDrawings2;
    if (pendingPointsRef.current.length > 1) {
      setDrawings(prev => [...prev, { id: `${Date.now()}`, type: 'freehand', points: [...pendingPointsRef.current], color: drawingColor }]);
    }
    pendingPointsRef.current = [];
    activeVideoRef.current = null;
    scheduleRender(num);
  }, [selectedTool, drawingColor, scheduleRender]);

  // ── File handlers ──────────────────────────────────────────────────────────

  const handleFile1 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      playback1.inspectFile(f);
      setVideo1Url(URL.createObjectURL(f));
    }
  };
  const handleFile2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      playback2.inspectFile(f);
      setVideo2Url(URL.createObjectURL(f));
    }
  };

  const hasAnyVideo = Boolean(video1Url ?? video2Url);

  // ── Toolbar helper ─────────────────────────────────────────────────────────

  const toolBtn = (tool: DrawTool, icon: React.ReactNode, label: string) => (
    <Button
      key={tool}
      variant={selectedTool === tool ? 'default' : 'ghost'}
      size="sm"
      onClick={() => { setSelectedTool(tool); pendingPointsRef.current = []; }}
      className={`gap-2 ${toolbarExpanded ? 'justify-start' : 'justify-center p-1'} lg:justify-start`}
      title={label}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className={`text-xs ${toolbarExpanded ? 'inline' : 'hidden'} lg:inline`}>{label}</span>
    </Button>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 flex-shrink-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <div className="text-slate-900 font-medium text-sm">Dual Video Analysis</div>
              <div className="text-xs text-slate-500">Scrub each video independently, then Lock + Play</div>
            </div>
          </div>
        </div>
      </header>

      {/* Content: left toolbar + videos */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left toolbar */}
        <div
          className={`bg-white border-r border-slate-200 p-2 flex flex-col gap-2 flex-shrink-0 overflow-y-auto transition-all duration-200 ${
            toolbarExpanded ? 'w-[140px]' : 'w-12'
          } lg:w-[140px] ${!hasAnyVideo ? 'opacity-40 pointer-events-none' : ''}`}
        >
          {/* Toggle (mobile) */}
          <Button variant="ghost" size="sm" onClick={() => setToolbarExpanded(!toolbarExpanded)}
            className="lg:hidden p-1 h-8 w-full justify-center"
            title={toolbarExpanded ? 'Collapse' : 'Expand'}
          >
            {toolbarExpanded ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </Button>

          <div className="flex flex-col gap-1">
            <p className={`text-xs text-slate-500 px-2 mb-1 ${toolbarExpanded ? 'block' : 'hidden'} lg:block`}>Tools</p>
            {toolBtn('select', <Move className="w-4 h-4" />, 'Select')}
            {toolBtn('line', <Minus className="w-4 h-4" />, 'Line')}
            {toolBtn('angle',
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 20L4 20L4 4" strokeWidth="2" strokeLinecap="round" />
                <path d="M4 20L16 8" strokeWidth="2" strokeLinecap="round" />
              </svg>, 'Angle')}
            {toolBtn('goniometer', <Compass className="w-4 h-4" />, 'Goniometer')}
            {toolBtn('circle', <Circle className="w-4 h-4" />, 'Circle')}
            {toolBtn('freehand', <Pencil className="w-4 h-4" />, 'Freehand')}
            {toolBtn('plumbline',
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="12" y1="2" x2="12" y2="22" strokeWidth="2" strokeDasharray="3 2" />
                <circle cx="12" cy="20" r="2" fill="currentColor" />
              </svg>, 'Plumb Line')}
          </div>

          <Separator />

          <div className="flex flex-col gap-1">
            <p className={`text-xs text-slate-500 px-2 mb-1 ${toolbarExpanded ? 'block' : 'hidden'} lg:block`}>Color</p>
            <div className={`flex flex-wrap gap-1.5 px-1 ${toolbarExpanded ? '' : 'justify-center'}`}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setDrawingColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${drawingColor === c ? 'border-slate-800 scale-110' : 'border-slate-300'}`}
                  style={{ backgroundColor: c }} title={c}
                />
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-1">
            <Button variant="ghost" size="sm"
              onClick={() => { setDrawings1([]); setDrawings2([]); pendingPointsRef.current = []; }}
              className={`gap-2 text-rose-500 hover:text-rose-600 ${toolbarExpanded ? 'justify-start' : 'justify-center p-1'} lg:justify-start`}
              title="Clear all drawings"
            >
              <Trash2 className="w-4 h-4 flex-shrink-0" />
              <span className={`text-xs ${toolbarExpanded ? 'inline' : 'hidden'} lg:inline`}>Clear all</span>
            </Button>
            <Button variant="ghost" size="sm"
              onClick={() => { setDrawings1(p => p.slice(0, -1)); setDrawings2(p => p.slice(0, -1)); }}
              className={`gap-2 ${toolbarExpanded ? 'justify-start' : 'justify-center p-1'} lg:justify-start`}
              title="Undo last"
            >
              <RotateCcw className="w-4 h-4 flex-shrink-0" />
              <span className={`text-xs ${toolbarExpanded ? 'inline' : 'hidden'} lg:inline`}>Undo</span>
            </Button>
          </div>
        </div>

        {/* Videos */}
        <div className="flex flex-1 overflow-hidden bg-black">

          {/* Video 1 */}
          <div ref={container1Ref} className="relative flex items-center justify-center overflow-hidden bg-black"
            style={{ width: `${splitPosition}%` }}
          >
            {!video1Url ? (
              <div className="text-center p-6">
                <p className="text-slate-400 mb-4 text-sm">Video 1</p>
                <Button onClick={() => fileInput1Ref.current?.click()} variant="outline" size="sm" className="gap-2">
                  <Upload className="w-4 h-4" /> Upload
                </Button>
                <input ref={fileInput1Ref} type="file" accept="video/*" onChange={handleFile1} className="hidden" />
              </div>
            ) : (
              <>
                <video
                  ref={video1Ref}
                  src={video1Url}
                  muted={isMuted1}
                  className="max-w-full max-h-full object-contain"
                  playsInline
                  onTimeUpdate={() => setCurrentTime1(video1Ref.current?.currentTime ?? 0)}
                  onLoadedMetadata={() => {
                    setDuration1(video1Ref.current?.duration ?? 0);
                    playback1.inspectVideo(video1Ref.current);
                  }}
                  onLoadedData={() => playback1.inspectVideo(video1Ref.current, true)}
                  onPlay={() => setIsPlaying1(true)}
                  onPause={() => setIsPlaying1(false)}
                  onEnded={() => setIsPlaying1(false)}
                />
                <VideoPlaybackBanner notice={playback1.notice} className="top-10" />
                <canvas ref={canvas1Ref}
                  className={`absolute inset-0 w-full h-full ${selectedTool === 'select' ? 'pointer-events-none' : 'cursor-crosshair'}`}
                  onMouseDown={e => handleMouseDown(e, 1)}
                  onMouseMove={e => handleMouseMove(e, 1)}
                  onMouseUp={e => handleMouseUp(e, 1)}
                />
                {/* Top-right controls */}
                <div className="absolute top-2 right-2 flex gap-1">
                  <button onClick={() => setIsMuted1(!isMuted1)}
                    className="p-1.5 bg-black/50 hover:bg-black/70 rounded text-white">
                    {isMuted1 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <button onClick={() => { URL.revokeObjectURL(video1Url); setVideo1Url(null); setDrawings1([]); playback1.reset(); }}
                    className="p-1.5 bg-black/50 hover:bg-black/70 rounded text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {/* Label */}
                <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  Video 1
                </div>
              </>
            )}
          </div>

          {/* Resize handle */}
          <div
            className="w-1 bg-slate-600 hover:bg-blue-500 cursor-col-resize flex-shrink-0 flex items-center justify-center group z-10"
            onMouseDown={e => {
              e.preventDefault();
              const startX = e.clientX;
              const startPos = splitPosition;
              const move = (mv: MouseEvent) => setSplitPosition(Math.max(15, Math.min(85, startPos + ((mv.clientX - startX) / window.innerWidth) * 100)));
              const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
              document.addEventListener('mousemove', move);
              document.addEventListener('mouseup', up);
            }}
          >
            <div className="w-0.5 h-12 bg-slate-500 group-hover:bg-blue-400 rounded" />
          </div>

          {/* Video 2 */}
          <div ref={container2Ref} className="relative flex items-center justify-center overflow-hidden bg-black"
            style={{ width: `${100 - splitPosition - 0.1}%` }}
          >
            {!video2Url ? (
              <div className="text-center p-6">
                <p className="text-slate-400 mb-4 text-sm">Video 2</p>
                <Button onClick={() => fileInput2Ref.current?.click()} variant="outline" size="sm" className="gap-2">
                  <Upload className="w-4 h-4" /> Upload
                </Button>
                <input ref={fileInput2Ref} type="file" accept="video/*" onChange={handleFile2} className="hidden" />
              </div>
            ) : (
              <>
                <video
                  ref={video2Ref}
                  src={video2Url}
                  muted={isMuted2}
                  className="max-w-full max-h-full object-contain"
                  playsInline
                  onTimeUpdate={() => setCurrentTime2(video2Ref.current?.currentTime ?? 0)}
                  onLoadedMetadata={() => {
                    setDuration2(video2Ref.current?.duration ?? 0);
                    playback2.inspectVideo(video2Ref.current);
                  }}
                  onLoadedData={() => playback2.inspectVideo(video2Ref.current, true)}
                  onPlay={() => setIsPlaying2(true)}
                  onPause={() => setIsPlaying2(false)}
                  onEnded={() => setIsPlaying2(false)}
                />
                <VideoPlaybackBanner notice={playback2.notice} className="top-10" />
                <canvas ref={canvas2Ref}
                  className={`absolute inset-0 w-full h-full ${selectedTool === 'select' ? 'pointer-events-none' : 'cursor-crosshair'}`}
                  onMouseDown={e => handleMouseDown(e, 2)}
                  onMouseMove={e => handleMouseMove(e, 2)}
                  onMouseUp={e => handleMouseUp(e, 2)}
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <button onClick={() => setIsMuted2(!isMuted2)}
                    className="p-1.5 bg-black/50 hover:bg-black/70 rounded text-white">
                    {isMuted2 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <button onClick={() => { URL.revokeObjectURL(video2Url); setVideo2Url(null); setDrawings2([]); playback2.reset(); }}
                    className="p-1.5 bg-black/50 hover:bg-black/70 rounded text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  Video 2
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      {hasAnyVideo && (
        <div className="bg-white border-t border-slate-200 px-4 py-3 flex-shrink-0">
          <div className="max-w-[1800px] mx-auto flex flex-col gap-2">

            {/* Independent sliders — each with its own Play when unlocked */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">

              {/* Video 1 row */}
              <div className="flex items-center gap-2">
                {!locked && (
                  <button
                    onClick={() => isPlaying1 ? pauseSingle(1) : playSingle(1)}
                    disabled={!video1Url}
                    className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-900 hover:bg-slate-700 disabled:opacity-40 flex items-center justify-center text-white transition-colors"
                    title={isPlaying1 ? 'Pause Video 1' : 'Play Video 1'}
                  >
                    {isPlaying1 ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                  </button>
                )}
                <span className="text-xs text-slate-400 w-10 text-right flex-shrink-0 tabular-nums">{formatTime(currentTime1)}</span>
                <Slider
                  value={[currentTime1]}
                  max={duration1 || 1}
                  step={0.033}
                  onValueChange={v => seek(v[0], 1)}
                  className="flex-1"
                  disabled={!video1Url}
                />
                <span className="text-xs text-slate-400 w-10 flex-shrink-0 tabular-nums">{formatTime(duration1)}</span>
              </div>

              {/* Video 2 row */}
              <div className="flex items-center gap-2">
                {!locked && (
                  <button
                    onClick={() => isPlaying2 ? pauseSingle(2) : playSingle(2)}
                    disabled={!video2Url}
                    className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-900 hover:bg-slate-700 disabled:opacity-40 flex items-center justify-center text-white transition-colors"
                    title={isPlaying2 ? 'Pause Video 2' : 'Play Video 2'}
                  >
                    {isPlaying2 ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                  </button>
                )}
                <span className="text-xs text-slate-400 w-10 text-right flex-shrink-0 tabular-nums">{formatTime(currentTime2)}</span>
                <Slider
                  value={[currentTime2]}
                  max={duration2 || 1}
                  step={0.033}
                  onValueChange={v => seek(v[0], 2)}
                  className="flex-1"
                  disabled={!video2Url}
                />
                <span className="text-xs text-slate-400 w-10 flex-shrink-0 tabular-nums">{formatTime(duration2)}</span>
              </div>
            </div>

            {/* Transport + Lock + Speed — always centered */}
            <div className="flex items-center justify-center gap-2 flex-wrap">

              {/* Jump / step / play (locked play lives here) */}
              <Button variant="ghost" size="icon" className="h-9 w-9" title="Jump to start"
                onClick={() => { seek(0, 1); seek(0, 2); }}>
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" title="Step back"
                onClick={() => step(-1, 30)}>
                <SkipBack className="w-4 h-4" />
              </Button>

              {/* Master Play/Pause — only visible when locked */}
              {locked && (
                <Button variant="default" size="icon" className="h-9 w-9"
                  title={isPlayingBoth ? 'Pause both' : 'Play both'}
                  onClick={isPlayingBoth ? pauseBoth : playBoth}
                  disabled={!hasAnyVideo}>
                  {isPlayingBoth ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
              )}

              <Button variant="ghost" size="icon" className="h-9 w-9" title="Step forward"
                onClick={() => step(1, 30)}>
                <SkipForward className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9" title="Jump to end"
                onClick={() => { if (duration1) seek(duration1, 1); if (duration2) seek(duration2, 2); }}>
                <ChevronsRight className="w-4 h-4" />
              </Button>

              <Separator orientation="vertical" className="h-6" />

              {/* Lock */}
              <Button
                variant={locked ? 'default' : 'outline'}
                size="sm" className="gap-1.5"
                onClick={() => setLocked(!locked)}
                title={locked ? 'Locked — play/step affect both' : 'Unlocked — each video is independent'}
              >
                {locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span className="text-xs">{locked ? 'Locked' : 'Unlocked'}</span>
              </Button>

              <Separator orientation="vertical" className="h-6" />

              {/* Speed */}
              <span className="text-xs text-slate-500">Speed:</span>
              {SPEEDS.map(s => (
                <Button key={s}
                  variant={playbackRate === s ? 'default' : 'outline'}
                  size="sm" onClick={() => setSpeed(s)}
                  className="px-2 text-xs h-8"
                >
                  {s}×
                </Button>
              ))}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
