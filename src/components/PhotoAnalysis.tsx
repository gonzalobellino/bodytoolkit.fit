import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Download,
  Camera,
  Trash2,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Move,
  Minimize2,
  Maximize2,
  SwitchCamera,
} from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { DrawingToolbar } from './DrawingToolbar';
import { AnalysisHeader } from './AnalysisHeader';
import { getContainLayout } from '../utils/videoLayout';
import type { BaseDrawingElement, DrawingTool, Point } from '../types/drawing';
import { useFileDropzone } from '../hooks/useFileDropzone';
import { useFullscreen } from '../hooks/useFullscreen';
import { useExportShare } from '../hooks/useExportShare';
import { useEnsurePageScroll } from '../hooks/useEnsurePageScroll';
import {
  drawAngleText,
  drawSpot,
  drawLineHorizontalAngles,
  drawVertexAngleLabels,
  getAngleDifference,
  hexToRgba,
  invertHexColor,
  rotateHexChannels,
  getGoniometerRadius,
  normalizeAngle,
  getArcData,
  drawPieSlice,
  strokePieArc,
  drawPlumbLinePreview,
  drawPlumbLine,
} from '../utils/drawingUtils';

interface PhotoAnalysisProps {
  onBack: () => void;
}

export function PhotoAnalysis({ onBack }: PhotoAnalysisProps): React.JSX.Element {
  useEnsurePageScroll(true);
  // Image states
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Camera states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  
  // Drawing states
  const [selectedTool, setSelectedTool] = useState<DrawingTool>('select');
  const [selectedColor, setSelectedColor] = useState('#EF4444');
  const [showGrid, setShowGrid] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Zoom and rotation
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  
  // Mobile toolbar state
  const [toolbarExpanded, setToolbarExpanded] = useState(false);
  
  // Mutable drawing state (like original app)
  const drawingsRef = useRef<BaseDrawingElement[]>([]);
  const pendingPointsRef = useRef<Point[]>([]);
  const cursorRef = useRef<Point | null>(null);
  const dragPointRef = useRef<Point | null>(null);
  const dragShapeRef = useRef<BaseDrawingElement | null>(null);
  const selectedShapeRef = useRef<BaseDrawingElement | null>(null);
  const dragStartRef = useRef<Point | null>(null);
  const hoverPointRef = useRef<Point | null>(null);
  const hoverShapeRef = useRef<BaseDrawingElement | null>(null);
  const dragAxisRef = useRef<BaseDrawingElement | null>(null);
  const hoverAxisRef = useRef<BaseDrawingElement | null>(null);
  const freehandDrawingRef = useRef(false);
  const freehandShapeRef = useRef<BaseDrawingElement | null>(null);
  const ignoreClickUntilRef = useRef(0);
  const containerHeightRef = useRef<number | null>(null);
  const panStartRef = useRef<Point | null>(null);
  const panOriginRef = useRef<Point>({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastCanvasMetricsRef = useRef<{
    width: number;
    height: number;
    scale: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  
  // Force re-render trigger
  const [renderTrigger, setRenderTrigger] = useState(0);
  const forceRender = useCallback(() => setRenderTrigger(n => n + 1), []);
  
  // Calculate hasDrawings based on current drawings (updates with renderTrigger)
  const hasDrawings = useMemo(() => {
    return drawingsRef.current.length > 0;
  }, [renderTrigger]);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const belowCanvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const scheduleRenderRef = useRef<() => void>(() => {});

  // Fullscreen hook
  const { toggleFullscreen, exitFullscreen } = useFullscreen({
    elementRef: fullscreenRef,
    isFullscreen,
    setIsFullscreen,
  });

  // Export/Share hook
  const { handleExport, handleShare } = useExportShare({
    canvasRef,
    title: 'Photo Analysis',
    filenamePrefix: 'photo-analysis',
  });

  const hasAnyDrag = useCallback(
    () => [dragAxisRef.current, dragPointRef.current, dragShapeRef.current].some(Boolean),
    []
  );

  const hasDrawingActivity = useCallback(
    () =>
      [
        dragAxisRef.current,
        dragPointRef.current,
        dragShapeRef.current,
        freehandDrawingRef.current,
        pendingPointsRef.current.length > 0,
        isPanningRef.current,
      ].some(Boolean),
    [hasAnyDrag]
  );

  const getCanvasScreenPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  const getImageMetrics = useCallback((width: number, height: number) => {
    const img = imageRef.current;
    if (!img || width <= 0 || height <= 0) return null;
    const layout = getContainLayout(width, height, img.width, img.height);
    const scale = layout.drawWidth / img.width; // Calculate scale from layout
    return {
      width,
      height,
      scale,
      offsetX: layout.offsetX,
      offsetY: layout.offsetY,
      drawWidth: layout.drawWidth,
      drawHeight: layout.drawHeight,
    };
  }, []);

  // Get canvas point from event (accounts for pan/zoom/rotation)
  const getCanvasPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const screen = getCanvasScreenPoint(e);
    const center = { x: canvas.width / 2, y: canvas.height / 2 };
    const radians = (rotation * Math.PI) / 180;
    const dx = screen.x - (center.x + panOffset.x);
    const dy = screen.y - (center.y + panOffset.y);
    const cos = Math.cos(-radians);
    const sin = Math.sin(-radians);
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    return {
      x: (rx / zoom) + center.x,
      y: (ry / zoom) + center.y
    };
  }, [getCanvasScreenPoint, rotation, panOffset, zoom]);
  
  // Find nearest point (returns direct reference)
  const findNearestPoint = useCallback((x: number, y: number, radius: number = 20): Point | null => {
    const points: Point[] = [];
    drawingsRef.current.forEach(shape => {
      if (shape.type === 'freehand') return;
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
  }, [zoom]);

  const findShapeForPoint = useCallback((point: Point) => {
    for (const shape of drawingsRef.current) {
      const index = shape.points.indexOf(point);
      if (index !== -1) {
        return { shape, index };
      }
    }
    return null;
  }, []);
  
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

  // Find nearest shape (returns direct reference)
  const findNearestShape = useCallback((x: number, y: number, threshold: number = 12): BaseDrawingElement | null => {
    let nearest: BaseDrawingElement | null = null;
    let nearestDist = threshold / Math.max(zoom, 0.1);

    drawingsRef.current.forEach(shape => {
      // PlumbLine has only 1 point, check distance to vertical line
      if (shape.type === 'plumbline' && shape.points.length === 1) {
        const point = shape.points[0];
        const dist = Math.abs(x - point.x);
        if (dist <= nearestDist) {
          nearestDist = dist;
          nearest = shape;
        }
        return;
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
  }, [zoom]);

  const findGoniometerHandle = useCallback((x: number, y: number, radius: number = 12): BaseDrawingElement | null => {
    let nearest: BaseDrawingElement | null = null;
    let nearestDist = radius / Math.max(zoom, 0.1);

    drawingsRef.current.forEach(shape => {
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
  }, [zoom]);

  const applyViewTransform = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    ctx.translate(centerX + panOffset.x, centerY + panOffset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    ctx.translate(-centerX, -centerY);
  }, [panOffset, rotation, zoom]);

  // Render canvas
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
    ctx.save();
    applyViewTransform(ctx, canvas);
    
    // Draw image if loaded
    if (imageRef.current && imageLoaded) {
      const img = imageRef.current;
      const metrics = getImageMetrics(canvas.width, canvas.height);
      if (metrics && metrics.drawWidth && metrics.drawHeight) {
        ctx.drawImage(img, metrics.offsetX, metrics.offsetY, metrics.drawWidth, metrics.drawHeight);
        lastCanvasMetricsRef.current = metrics;
      }
    } else {
      lastCanvasMetricsRef.current = null;
    }
    
    // Draw grid
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
      
      pendingPointsRef.current.forEach((p) => {
        ctx.setLineDash([]);
        drawSpot(ctx, p, selectedColor, false);
        ctx.setLineDash([6, 4]);
      });
      
      const cursor = cursorRef.current;
      if (cursor) {
        if (selectedTool === 'line' && pendingPointsRef.current.length === 1) {
          ctx.beginPath();
          ctx.moveTo(pendingPointsRef.current[0].x, pendingPointsRef.current[0].y);
          ctx.lineTo(cursor.x, cursor.y);
          ctx.stroke();
          drawLineHorizontalAngles(ctx, pendingPointsRef.current[0], cursor);
        } else if (selectedTool === 'plumbline' && pendingPointsRef.current.length === 1) {
          drawPlumbLinePreview(ctx, pendingPointsRef.current[0], canvas);
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
        }
      }
      
      ctx.setLineDash([]);
    }
    ctx.restore();
  }, [showGrid, selectedColor, selectedTool, imageLoaded, getAngleDifference, getGoniometerRadius, applyViewTransform, getImageMetrics]);

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

  // Update canvas cursor
  const updateCanvasCursor = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    if (isPanningRef.current) {
      canvas.style.cursor = 'grabbing';
    } else if (hasAnyDrag()) {
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
  }, [hasAnyDrag, selectedTool, zoom]);

  // Pointer event handlers
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
        color: selectedColor
      };
      pendingPointsRef.current = [];
      cursorRef.current = point;
      scheduleRender();
    }
  }, [getCanvasPoint, getCanvasScreenPoint, findGoniometerHandle, findNearestPoint, findNearestShape, findShapeForPoint, selectedTool, selectedColor, zoom, panOffset, updateCanvasCursor, scheduleRender]);
  
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e);
    const screenPoint = getCanvasScreenPoint(e);
    
    const shouldBlockScroll = hasDrawingActivity();
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

    // Dragging a point - directly mutate!
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
    const hasHandleHover = hoverAxisRef.current ?? hoverPointRef.current;
    hoverShapeRef.current = hasHandleHover ? null : findNearestShape(point.x, point.y, 12);
    
    // Update cursor for preview
    if (pendingPointsRef.current.length > 0) {
      cursorRef.current = point;
      scheduleRender();
    }
    
    updateCanvasCursor();
    scheduleRender();
  }, [findGoniometerHandle, findNearestPoint, findNearestShape, getCanvasPoint, getCanvasScreenPoint, hasDrawingActivity, normalizeAngle, scheduleRender, updateCanvasCursor]);
  
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
      forceRender();
      scheduleRender();
      return;
    }

    // End point drag
    if (dragPointRef.current) {
      dragPointRef.current = null;
      updateCanvasCursor();
      forceRender();
      scheduleRender();
      return;
    }
    
    // End shape drag
    if (dragShapeRef.current) {
      dragShapeRef.current = null;
      dragStartRef.current = null;
      updateCanvasCursor();
      forceRender();
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
    
    // Handle tool clicks
    if (selectedTool === 'select' || selectedTool === 'freehand' || selectedTool === 'plumbline') {
      if (selectedTool === 'plumbline') {
        const point = getCanvasPoint(e);
        const nearestPoint = findNearestPoint(point.x, point.y, 20);
        if (nearestPoint) return;
        
        pendingPointsRef.current.push({ ...point });
        
        if (pendingPointsRef.current.length === 1) {
          const newDrawing: BaseDrawingElement = {
            id: Date.now().toString(),
            type: 'plumbline',
            points: [...pendingPointsRef.current],
            color: selectedColor
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
      const newDrawing: BaseDrawingElement = {
        id: Date.now().toString(),
        type: selectedTool,
        points: pendingPointsRef.current,
        color: selectedColor
      };
      if (selectedTool === 'goniometer') {
        newDrawing.axisAngle = 270;
      }
      drawingsRef.current.push(newDrawing);
      pendingPointsRef.current = [];
    }
    
    forceRender();
    scheduleRender();
  }, [selectedTool, selectedColor, getCanvasPoint, findNearestPoint, updateCanvasCursor, forceRender, scheduleRender]);
  
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

  // Load image
  const loadImage = (url: string): void => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageUrl(url);
      setImageLoaded(true);
      drawingsRef.current = [];
      pendingPointsRef.current = [];
      setZoom(1);
      setRotation(0);
      forceRender();
    };
    img.src = url;
  };

  // Handle file upload and drag/drop using shared hook
  const handleFileSelect = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    loadImage(url);
  }, []);

  const {
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileChange,
  } = useFileDropzone({
    accept: ['image/*'],
    onFileSelect: handleFileSelect,
    onDragActiveChange: setDragActive,
  });

  useEffect(() => {
    return () => {
      if (imageUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  useEffect(() => {
    if (zoom <= 1) {
      setPanOffset({ x: 0, y: 0 });
    }
  }, [zoom]);

  useEffect(() => {
    if (!imageUrl || cameraActive || !imageLoaded || isFullscreen) {
      setContainerHeight(null);
      containerHeightRef.current = null;
      return;
    }
    const update = (): void => {
      const container = containerRef.current;
      if (!container) return;
      if (hasDrawingActivity()) {
        return;
      }
      const rect = container.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const belowRect = belowCanvasRef.current?.getBoundingClientRect();
      const belowHeight = belowRect?.height ?? 0;
      const gap = belowHeight > 0 ? 16 : 0;
      const available = Math.max(240, viewportHeight - rect.top - 16 - belowHeight - gap);
      const nextHeight = Math.floor(available);
      const prevHeight = containerHeightRef.current;
      const panActive = zoom > 1 && (Math.abs(panOffset.x) + Math.abs(panOffset.y) > 1);
      const threshold = panActive ? 12 : 2;
      if (prevHeight !== null && Math.abs(nextHeight - prevHeight) < threshold) {
        return;
      }
      containerHeightRef.current = nextHeight;
      setContainerHeight(nextHeight);
    };
    update();
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [cameraActive, hasDrawingActivity, imageLoaded, imageUrl, panOffset, renderTrigger, zoom]);

  const resetImage = useCallback(() => {
    if (isFullscreen) {
      void exitFullscreen();
    }
    setImageUrl(null);
    setImageLoaded(false);
    drawingsRef.current = [];
    pendingPointsRef.current = [];
    imageRef.current = null;
  }, [exitFullscreen, isFullscreen]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      if (hasDrawingActivity()) {
        scheduleRender();
        return;
      }
      if (!imageRef.current || !imageLoaded) {
        scheduleRender();
        return;
      }
      const rect = container.getBoundingClientRect();
      const prev = lastCanvasMetricsRef.current;
      const next = getImageMetrics(rect.width, rect.height);
      if (prev && next) {
        const widthDelta = Math.abs(next.width - prev.width);
        const heightDelta = Math.abs(next.height - prev.height);
        const scaleDelta = Math.abs(next.scale - prev.scale);
        const offsetDelta = Math.max(Math.abs(next.offsetX - prev.offsetX), Math.abs(next.offsetY - prev.offsetY));
        if (widthDelta < 2 && heightDelta < 2 && scaleDelta < 0.002 && offsetDelta < 1) {
          scheduleRender();
          return;
        }
        const mapPoint = (p: Point): void => {
          const imgX = (p.x - prev.offsetX) / prev.scale;
          const imgY = (p.y - prev.offsetY) / prev.scale;
          p.x = imgX * next.scale + next.offsetX;
          p.y = imgY * next.scale + next.offsetY;
        };
        drawingsRef.current.forEach(shape => {
          shape.points.forEach(mapPoint);
        });
        pendingPointsRef.current.forEach(mapPoint);
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
  }, [getImageMetrics, hasDrawingActivity, imageLoaded, scheduleRender]);

  // When entering/exiting fullscreen: reset zoom/pan so content fits the new container
  useEffect(() => {
    setZoom(prev => (prev === 1 ? prev : 1));
    setPanOffset(prev => (prev.x === 0 && prev.y === 0 ? prev : { x: 0, y: 0 }));
    lastCanvasMetricsRef.current = null;
    scheduleRenderRef.current();
    const t1 = window.setTimeout(() => scheduleRenderRef.current(), 100);
    const t2 = window.setTimeout(() => scheduleRenderRef.current(), 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isFullscreen]);

  // Start camera
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = async (facing: 'environment' | 'user' = 'environment'): Promise<void> => {
    if (!window.isSecureContext) {
      alert('Camera requires HTTPS or localhost.');
      return;
    }
    
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Camera not supported in this browser.');
      return;
    }
    
    try {
      stopCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      streamRef.current = stream;
      setCameraFacing(facing);
      setCameraActive(true);
    } catch (error) {
      console.error('Camera error:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const flipCamera = (): void => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    startCamera(nextFacing).catch(() => {
      // If the new facing mode fails, try restoring the previous camera.
      void startCamera(cameraFacing);
    });
  };

  // Attach stream to the video element after React commits it.
  // This avoids a race when switching camera: changing `cameraFacing` remounts `<video />`.
  useEffect(() => {
    if (!cameraActive) return;
    const stream = streamRef.current;
    const video = videoRef.current;
    if (!stream || !video) return;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    video.muted = true;
    video.playsInline = true;
    video.play().catch(() => {});
  }, [cameraActive, cameraFacing]);

  
  // Capture photo from camera
  const capturePhoto = (): void => {
    const video = videoRef.current;
    if (!video?.videoWidth) {
      console.error('Video not ready');
      return;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    const url = canvas.toDataURL('image/png');
    
    // Stop camera first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setCameraActive(false);
    loadImage(url);
  };
  
  // Cancel camera
  const cancelCamera = (): void => {
    stopCameraStream();
    setCameraActive(false);
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

  const clearDrawings = useCallback(() => {
    drawingsRef.current = [];
    pendingPointsRef.current = [];
    forceRender();
    scheduleRender();
  }, [forceRender, scheduleRender]);

  const handleToolChange = useCallback((tool: DrawingTool) => {
    setSelectedTool(tool);
    pendingPointsRef.current = [];
    scheduleRender();
  }, [scheduleRender]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undoLastDrawing();
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
  }, [undoLastDrawing, forceRender, scheduleRender]);
  
  // Initial render and cleanup
  useEffect(() => {
    scheduleRender();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [scheduleRender]);
  
  // Re-render when relevant state changes
  useEffect(() => {
    scheduleRender();
  }, [showGrid, selectedColor, selectedTool, renderTrigger, zoom, rotation, panOffset, imageLoaded, scheduleRender]);

  const hasMedia = !!(imageUrl || cameraActive);
  const isDropzone = !hasMedia;
  const dropzoneActive = isDropzone;
  // On touch devices, pointer events won't reliably fire during scroll/gesture unless touch-action is disabled.
  // We only capture touch when interacting with the canvas (drawing, panning/zooming, fullscreen).
  const shouldCaptureTouch = !isDropzone && !cameraActive && (isFullscreen || selectedTool !== 'select' || zoom > 1);
  const dropzoneHandlers = dropzoneActive
    ? {
        onDragEnter: handleDragEnter,
        onDragLeave: handleDragLeave,
        onDragOver: handleDragOver,
        onDrop: handleDrop,
      }
    : undefined;
  const containerClassName = `rounded-xl overflow-hidden relative flex items-center justify-center ${
    shouldCaptureTouch ? 'touch-none overscroll-contain' : ''
  } ${
    isFullscreen
      ? 'flex-1 rounded-none min-h-0'
      : isDropzone
        ? `border-2 border-dashed min-h-[60vh] max-h-[90vh] touch-pan-y ${
            dragActive ? 'bg-blue-50/60 border-blue-400' : 'bg-white border-slate-300'
          }`
        : cameraActive
          ? 'bg-slate-900 min-h-[calc(100vh-8rem)]'
          : 'bg-slate-900 min-h-[calc(100vh-5rem)]'
  }`;
  // Layout: root → header | ( toolbar | canvas ). Only fullscreen fills viewport; otherwise scrollable page. Canvas = drop zone (no media) or image (with media), always has min-height so it’s visible.
  return (
    <div
      ref={fullscreenRef}
      className={`bg-slate-50 flex flex-col ${isFullscreen ? 'w-full h-full overflow-hidden' : 'min-h-screen'}`}
    >
      <AnalysisHeader
        title="Photo Analysis"
        subtitle="Static Posture Assessment"
        badgeText="Field Tools"
        badgeIcon={<ImageIcon className="w-3 h-3" />}
        onBack={onBack}
        isFullscreen={isFullscreen}
        maxWidth="wide"
      />

      <div
        className={`w-full max-w-[1800px] mx-auto p-2 sm:p-4 lg:p-6 flex flex-col min-w-0 ${isFullscreen ? 'flex-1 h-full min-h-0' : ''}`}
      >
        <div className={`flex gap-2 sm:gap-4 min-w-0 ${isFullscreen ? 'flex-1 min-h-0 overflow-hidden' : 'w-full'}`}>
          {/* Toolbar */}
          <DrawingToolbar
            selectedTool={selectedTool}
            selectedColor={selectedColor}
            showGrid={showGrid}
            toolbarExpanded={toolbarExpanded}
            disabled={!imageUrl || cameraActive}
            hasDrawings={hasDrawings}
            onToolChange={handleToolChange}
            onColorChange={setSelectedColor}
            onToggleGrid={() => setShowGrid(!showGrid)}
            onToolbarExpandToggle={() => setToolbarExpanded(!toolbarExpanded)}
            onUndo={undoLastDrawing}
            onClear={clearDrawings}
            className={`flex-shrink-0 ${isFullscreen ? 'max-h-full overflow-y-auto' : ''}`}
            extraSections={
              <>
                <Separator />
                {/* Rotate */}
                <div className={`flex flex-col gap-1 ${toolbarExpanded ? 'block' : 'hidden'} lg:block`}>
                  <p className="text-xs text-slate-500 px-2 mb-1">View</p>
                  <div className="flex gap-1 px-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setRotation(r => (r + 90) % 360)}
                      className="h-7 w-7"
                    >
                      <RotateCw className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </>
            }
            footerSections={
              <>
                <Separator />
                {/* Export/Share */}
                <div className="flex flex-col gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleExport} 
                    className={`gap-2 ${toolbarExpanded ? 'justify-start' : 'justify-center p-1'} lg:justify-start`} 
                    title="Export"
                  >
                    <Download className="w-4 h-4 flex-shrink-0" />
                    <span className={`text-xs ${toolbarExpanded ? 'inline' : 'hidden'} lg:inline`}>Export</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleShare} 
                    className={`gap-2 ${toolbarExpanded ? 'justify-start' : 'justify-center p-1'} lg:justify-start`} 
                    title="Share"
                  >
                    <Share2 className="w-4 h-4 flex-shrink-0" />
                    <span className={`text-xs ${toolbarExpanded ? 'inline' : 'hidden'} lg:inline`}>Share</span>
                  </Button>
                </div>
                <Separator />
                {/* New Image */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetImage}
                  className={`gap-2 ${toolbarExpanded ? 'justify-start' : 'justify-center p-1'} lg:justify-start`}
                  title="New"
                >
                  <Trash2 className="w-4 h-4 flex-shrink-0" />
                  <span className={`text-xs ${toolbarExpanded ? 'inline' : 'hidden'} lg:inline`}>New</span>
                </Button>
              </>
            }
          />

          {/* Main: toolbar | canvas (drop zone or image). flex-1 = remaining width. Do NOT add h-screen/fixed height to root when media loaded: it breaks page scroll. */}
          <div className={`min-w-0 flex-1 flex flex-col ${isFullscreen ? 'min-h-0' : ''}`}>
            <div className={`flex flex-col gap-4 ${isFullscreen ? 'flex-1 min-h-0 h-full' : ''}`}>
              <div
                ref={containerRef}
                {...dropzoneHandlers}
                className={containerClassName}
                style={
                  isFullscreen
                    ? { minHeight: 0, maxHeight: '100%' }
                    : containerHeight && imageUrl && !cameraActive
                      ? { height: `${containerHeight}px`, maxHeight: `${containerHeight}px` }
                      : undefined
                }
              >
                {isDropzone ? (
                  <div
                    className={`absolute inset-0 flex items-center justify-center text-center p-4 transition-colors pointer-events-none ${
                      dragActive ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <div className="w-full max-w-md pointer-events-auto">
                      <div className={`w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 lg:mb-6 transition-colors ${dragActive ? 'bg-blue-100' : 'bg-slate-100'}`}>
                        <ImageIcon className={`w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 ${dragActive ? 'text-blue-500' : 'text-slate-400'}`} />
                      </div>
                      <h3 className="text-slate-900 font-medium text-sm sm:text-base mb-1 sm:mb-2">
                        {dragActive ? 'Drop to upload' : 'Upload or Capture'}
                      </h3>
                      <p className="text-slate-500 text-xs sm:text-sm mb-4 sm:mb-6 lg:mb-8">
                        {dragActive ? 'Release to add the photo.' : 'Drag and drop, upload, or capture.'}
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
                          onClick={() => startCamera(cameraFacing)} 
                          variant="outline" 
                          className="gap-2"
                          size="sm"
                          title="Photos stay local - nothing is uploaded to any server"
                        >
                          <Camera className="w-4 h-4" />
                          Camera
                        </Button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                ) : cameraActive ? (
                  <>
                    <video
                      key={`camera-${cameraFacing}`}
                      ref={videoRef}
                      className="w-full h-full object-contain bg-black"
                      playsInline
                      muted
                      autoPlay
                      onLoadedMetadata={() => videoRef.current?.play().catch(() => {})}
                      style={{ zIndex: 1 }}
                    />
                    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 pointer-events-auto">
                      <button
                        onClick={cancelCamera}
                        className="h-10 px-4 rounded-full bg-white/90 text-slate-900 text-sm font-medium shadow-lg hover:bg-white transition-colors"
                        title="Cancel"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={flipCamera}
                        className="w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                        title="Switch front/back camera"
                      >
                        <SwitchCamera className="w-5 h-5" />
                      </button>
                      <button
                        onClick={capturePhoto}
                        className="w-12 h-12 rounded-full bg-white/20 backdrop-blur border-4 border-white hover:bg-white/30 flex items-center justify-center shadow-lg transition-colors"
                        title="Capture photo"
                      >
                        <div className="w-7 h-7 rounded-full bg-red-500" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <canvas
                      ref={canvasRef}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerLeave}
                      className={`w-full h-full ${shouldCaptureTouch ? 'touch-none' : 'touch-pan-y'}`}
                      style={{ cursor: 'crosshair' }}
                    />

                    <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 z-10 pointer-events-auto">
                      <div className="flex items-center gap-1 bg-white/90 backdrop-blur border border-slate-200 rounded-lg shadow-sm p-1">
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
                        <span className="text-xs text-slate-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
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
                        {imageUrl && !cameraActive && (
                          <>
                            <div className="w-px h-5 bg-slate-200 mx-1" />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={resetImage}
                              className="h-8 w-8 text-rose-600 hover:text-rose-700"
                              title="New"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Drawing instructions */}
                    {selectedTool !== 'select' && pendingPointsRef.current.length > 0 && (
                      <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded-lg text-xs backdrop-blur-sm">
                        {selectedTool === 'angle' && <span>Points: {pendingPointsRef.current.length}/3</span>}
                        {selectedTool === 'line' && <span>Points: {pendingPointsRef.current.length}/2</span>}
                        {selectedTool === 'circle' && <span>Points: {pendingPointsRef.current.length}/2</span>}
                      </div>
                    )}
                  </>
                )}

                {isFullscreen && (!imageUrl || cameraActive) && (
                  <div className="absolute top-4 right-4 z-10">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={exitFullscreen}
                      className="h-9 w-9 shadow"
                      title="Exit full screen"
                    >
                      <Minimize2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div ref={belowCanvasRef} className={`${isFullscreen ? 'hidden' : 'space-y-4'}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
