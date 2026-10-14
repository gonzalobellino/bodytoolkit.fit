import { useState, useRef, useCallback } from 'react';

// Types
export interface Point {
  x: number;
  y: number;
}

export type DrawingTool = 'select' | 'line' | 'angle' | 'circle' | 'freehand' | 'goniometer';

export interface BaseDrawingElement {
  id: string;
  type: DrawingTool;
  points: Point[];
  color: string;
  axisAngle?: number;
}

export interface TimeboundDrawingElement extends BaseDrawingElement {
  mode: 'global' | 'timebound';
  timeRange?: { start: number; end: number };
}

export interface UseDrawingStateOptions {
  initialTool?: DrawingTool;
  initialColor?: string;
}

export interface DrawingState {
  // UI State
  selectedTool: DrawingTool;
  setSelectedTool: (tool: DrawingTool) => void;
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  toolbarExpanded: boolean;
  setToolbarExpanded: (expanded: boolean) => void;
  
  // View State
  zoom: number;
  setZoom: (zoom: number) => void;
  panOffset: Point;
  setPanOffset: (offset: Point) => void;
  isFullscreen: boolean;
  setIsFullscreen: (fullscreen: boolean) => void;
  dragActive: boolean;
  setDragActive: (active: boolean) => void;
  
  // Render trigger
  renderTrigger: number;
  forceRender: () => void;
  scheduleRender: () => void;
  
  // Mutable Refs (for performance - avoid re-renders during drawing)
  drawingsRef: React.MutableRefObject<BaseDrawingElement[]>;
  pendingPointsRef: React.MutableRefObject<Point[]>;
  cursorRef: React.MutableRefObject<Point | null>;
  dragPointRef: React.MutableRefObject<Point | null>;
  dragShapeRef: React.MutableRefObject<BaseDrawingElement | null>;
  dragStartRef: React.MutableRefObject<Point | null>;
  hoverPointRef: React.MutableRefObject<Point | null>;
  hoverShapeRef: React.MutableRefObject<BaseDrawingElement | null>;
  dragAxisRef: React.MutableRefObject<BaseDrawingElement | null>;
  hoverAxisRef: React.MutableRefObject<BaseDrawingElement | null>;
  dragCounterRef: React.MutableRefObject<number>;
  freehandDrawingRef: React.MutableRefObject<boolean>;
  freehandShapeRef: React.MutableRefObject<BaseDrawingElement | null>;
  ignoreClickUntilRef: React.MutableRefObject<number>;
  panStartRef: React.MutableRefObject<Point | null>;
  panOriginRef: React.MutableRefObject<Point>;
  isPanningRef: React.MutableRefObject<boolean>;
  animationFrameRef: React.MutableRefObject<number | null>;
  
  // DOM Refs
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  fullscreenRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  
  // Utility functions
  clearDrawings: () => void;
  undoLastDrawing: () => void;
  hasDrawingActivity: () => boolean;
}

export function useDrawingState(options: UseDrawingStateOptions = {}): DrawingState {
  const {
    initialTool = 'select',
    initialColor = '#EF4444',
  } = options;
  
  // UI State
  const [selectedTool, setSelectedTool] = useState<DrawingTool>(initialTool);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [showGrid, setShowGrid] = useState(false);
  const [toolbarExpanded, setToolbarExpanded] = useState(false);
  
  // View State
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Render trigger
  const [renderTrigger, setRenderTrigger] = useState(0);
  const forceRender = useCallback(() => setRenderTrigger(n => n + 1), []);
  
  // Animation frame ref for scheduling renders
  const animationFrameRef = useRef<number | null>(null);
  
  const scheduleRender = useCallback(() => {
    if (animationFrameRef.current !== null) return;
    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null;
      forceRender();
    });
  }, [forceRender]);
  
  // Mutable Refs (for performance)
  const drawingsRef = useRef<BaseDrawingElement[]>([]);
  const pendingPointsRef = useRef<Point[]>([]);
  const cursorRef = useRef<Point | null>(null);
  const dragPointRef = useRef<Point | null>(null);
  const dragShapeRef = useRef<BaseDrawingElement | null>(null);
  const dragStartRef = useRef<Point | null>(null);
  const hoverPointRef = useRef<Point | null>(null);
  const hoverShapeRef = useRef<BaseDrawingElement | null>(null);
  const dragAxisRef = useRef<BaseDrawingElement | null>(null);
  const hoverAxisRef = useRef<BaseDrawingElement | null>(null);
  const dragCounterRef = useRef(0);
  const freehandDrawingRef = useRef(false);
  const freehandShapeRef = useRef<BaseDrawingElement | null>(null);
  const ignoreClickUntilRef = useRef(0);
  const panStartRef = useRef<Point | null>(null);
  const panOriginRef = useRef<Point>({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  
  // DOM Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Utility functions
  const clearDrawings = useCallback(() => {
    drawingsRef.current = [];
    pendingPointsRef.current = [];
    cursorRef.current = null;
    freehandDrawingRef.current = false;
    freehandShapeRef.current = null;
    forceRender();
  }, [forceRender]);
  
  const undoLastDrawing = useCallback(() => {
    if (drawingsRef.current.length > 0) {
      drawingsRef.current.pop();
      forceRender();
    }
  }, [forceRender]);
  
  const hasDrawingActivity = useCallback(() => {
    return (
      isPanningRef.current ||
      dragPointRef.current !== null ||
      dragShapeRef.current !== null ||
      dragAxisRef.current !== null ||
      freehandDrawingRef.current ||
      pendingPointsRef.current.length > 0
    );
  }, []);
  
  return {
    // UI State
    selectedTool,
    setSelectedTool,
    selectedColor,
    setSelectedColor,
    showGrid,
    setShowGrid,
    toolbarExpanded,
    setToolbarExpanded,
    
    // View State
    zoom,
    setZoom,
    panOffset,
    setPanOffset,
    isFullscreen,
    setIsFullscreen,
    dragActive,
    setDragActive,
    
    // Render trigger
    renderTrigger,
    forceRender,
    scheduleRender,
    
    // Mutable Refs
    drawingsRef,
    pendingPointsRef,
    cursorRef,
    dragPointRef,
    dragShapeRef,
    dragStartRef,
    hoverPointRef,
    hoverShapeRef,
    dragAxisRef,
    hoverAxisRef,
    dragCounterRef,
    freehandDrawingRef,
    freehandShapeRef,
    ignoreClickUntilRef,
    panStartRef,
    panOriginRef,
    isPanningRef,
    animationFrameRef,
    
    // DOM Refs
    canvasRef,
    containerRef,
    fullscreenRef,
    fileInputRef,
    
    // Utility functions
    clearDrawings,
    undoLastDrawing,
    hasDrawingActivity,
  };
}
