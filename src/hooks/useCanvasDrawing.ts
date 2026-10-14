import { useState, useRef, useCallback, useEffect } from 'react';
import type { Point, Shape } from '../utils/drawingCore';
import {
  getDisplayAngle,
  pointToSegmentDistance,
  getShapeSegments,
  drawImageToContext,
  drawPoint,
  drawLine,
  drawCircle,
  drawRect,
  drawFreehand,
  drawAngle,
  drawLinePreview,
  drawAnglePreview,
  drawCirclePreview,
  drawRectPreview,
  drawGrid,
} from '../utils/drawingCore';

export type DrawingTool = 'point' | 'line' | 'angle' | 'circle' | 'rect' | 'freehand';
export type AngleMode = 'standard' | 'acute';

interface UseCanvasDrawingOptions {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  currentTime?: number | null;
  gridEnabled?: boolean;
  angleMode?: AngleMode;
  color?: string;
  scopeMode?: 'global' | 'range';
  scopeStart?: number | null;
  scopeEnd?: number | null;
}

export function useCanvasDrawing({
  canvasRef,
  imageRef,
  videoRef,
  currentTime = null,
  gridEnabled = false,
  angleMode = 'standard',
  color = '#ff4d4d',
  scopeMode = 'global',
  scopeStart = null,
  scopeEnd = null,
}: UseCanvasDrawingOptions): {
  tool: DrawingTool;
  setTool: React.Dispatch<React.SetStateAction<DrawingTool>>;
  shapes: Shape[];
  pendingPoints: Point[];
  cursor: Point | null;
  dragPoint: Point | null;
  dragShape: Shape | null;
  hoverPoint: Point | null;
  hoverShape: Shape | null;
  freehandDrawing: boolean;
  handleCanvasClick: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  handleCanvasMove: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  handleCanvasLeave: () => void;
  handlePointerDown: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerUp: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  handleContextMenu: (event: React.MouseEvent<HTMLCanvasElement>) => void;
  undoShape: () => void;
  clearShapes: () => void;
  renderCanvas: () => void;
} {
  const [tool, setTool] = useState<DrawingTool>('point');
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [pendingPoints, setPendingPoints] = useState<Point[]>([]);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [dragPoint, setDragPoint] = useState<Point | null>(null);
  const [dragShape, setDragShape] = useState<Shape | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);
  const [hoverShape, setHoverShape] = useState<Shape | null>(null);
  const [freehandDrawing, setFreehandDrawing] = useState(false);
  const [freehandShape, setFreehandShape] = useState<Shape | null>(null);
  const ignoreClickUntilRef = useRef(0);

  const getCanvasPoint = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    return {
      x: (event.clientX - rect.left) / scaleX,
      y: (event.clientY - rect.top) / scaleY
    };
  }, [canvasRef]);

  const findNearestPoint = useCallback((x: number, y: number, radius: number = 10): Point | null => {
    const points: Point[] = [];
    shapes.forEach(shape => {
      if (shape.type === 'freehand') return;
      if (shape.points) {
        shape.points.forEach(pt => points.push(pt));
      }
    });
    pendingPoints.forEach(pt => points.push(pt));
    
    let nearest: Point | null = null;
    let nearestDist = radius;
    points.forEach(pt => {
      const dist = Math.hypot(pt.x - x, pt.y - y);
      if (dist <= nearestDist) {
        nearestDist = dist;
        nearest = pt;
      }
    });
    return nearest;
  }, [shapes, pendingPoints]);

  const isShapeVisible = useCallback((shape: Shape, time: number | null): boolean => {
    if (!shape.scope || shape.scope.type === 'global') return true;
    if (time === null) return true;
    return time >= (shape.scope.start ?? 0) && time <= (shape.scope.end ?? 0);
  }, []);

  const findNearestShape = useCallback((x: number, y: number, threshold: number = 8): Shape | null => {
    let nearest: Shape | null = null;
    let nearestDist = threshold;

    shapes.forEach(shape => {
      if (!isShapeVisible(shape, currentTime)) return;
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
      
      const segments = getShapeSegments(shape);
      segments.forEach(([p1, p2]) => {
        const dist = pointToSegmentDistance(x, y, p1, p2);
        if (dist <= nearestDist) {
          nearestDist = dist;
          nearest = shape;
        }
      });
    });

    return nearest;
  }, [shapes, currentTime]);

  const buildScope = useCallback((): Shape['scope'] => {
    if (scopeMode !== 'range') {
      return { type: 'global' };
    }
    const time = currentTime ?? 0;
    let start = scopeStart ?? time;
    let end = scopeEnd ?? time;
    const fallback = 1.5; // defaultRangeSeconds
    
    if (scopeStart === null && scopeEnd === null) {
      end = start + fallback;
    } else if (scopeStart !== null && scopeEnd === null) {
      end = start + fallback;
    } else if (scopeStart === null && scopeEnd !== null) {
      start = end - fallback;
    }
    if (start < 0) start = 0;
    return {
      type: 'range',
      start: Math.min(start, end),
      end: Math.max(start, end)
    };
  }, [scopeMode, currentTime, scopeStart, scopeEnd]);

  const createShape = useCallback((type: DrawingTool, points: Point[]): Shape => {
    return {
      type,
      points,
      color,
      scope: buildScope()
    };
  }, [color, buildScope]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image or video frame
    const image = imageRef.current;
    const video = videoRef?.current;
    if (image) {
      drawImageToContext(ctx, image, canvas);
    } else if (video && (video.srcObject ?? video.src) && video.readyState >= 2) {
      // Scale video to fit canvas while maintaining aspect ratio
      const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
      const w = video.videoWidth * scale;
      const h = video.videoHeight * scale;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;
      ctx.drawImage(video, x, y, w, h);
    }

    // Draw grid if enabled
    if (gridEnabled) {
      drawGrid(ctx, canvas);
    }

    // Draw shapes
    const visibleTime = currentTime;
    shapes.forEach(shape => {
      if (!isShapeVisible(shape, visibleTime)) return;
      
      if (shape.type === 'point') {
        drawPoint(ctx, shape.points[0], {
          color: shape.color,
          pending: false,
          hovered: hoverPoint === shape.points[0]
        });
      } else if (shape.type === 'line') {
        drawLine(ctx, shape.points[0], shape.points[1], shape.color);
      } else if (shape.type === 'angle') {
        const angle = getDisplayAngle(shape.points[0], shape.points[1], shape.points[2], angleMode);
        drawAngle(ctx, shape.points[0], shape.points[1], shape.points[2], shape.color, angle);
      } else if (shape.type === 'circle') {
        drawCircle(ctx, shape.points[0], shape.points[1], shape.color);
      } else if (shape.type === 'rect') {
        drawRect(ctx, shape.points[0], shape.points[1], shape.color);
      } else if (shape.type === 'freehand') {
        drawFreehand(ctx, shape.points, shape.color);
      }
    });

    // Draw freehand in progress
    if (freehandDrawing && freehandShape) {
      drawFreehand(ctx, freehandShape.points, freehandShape.color);
    }

    // Draw pending points
    if (pendingPoints.length > 0) {
      pendingPoints.forEach(point => {
        drawPoint(ctx, point, {
          color,
          pending: true,
          hovered: hoverPoint === point
        });
      });
    }

    // Draw preview
    if (!dragPoint && cursor && pendingPoints.length > 0) {
      if (tool === 'line' && pendingPoints.length === 1) {
        drawLinePreview(ctx, pendingPoints[0], cursor, color);
      } else if (tool === 'angle') {
        if (pendingPoints.length === 1) {
          drawLinePreview(ctx, pendingPoints[0], cursor, color);
        } else if (pendingPoints.length === 2) {
          drawLinePreview(ctx, pendingPoints[0], pendingPoints[1], color);
          drawLinePreview(ctx, pendingPoints[1], cursor, color);
          const angle = getDisplayAngle(pendingPoints[0], pendingPoints[1], cursor, angleMode);
          drawAnglePreview(ctx, pendingPoints[1], angle);
        }
      } else if (tool === 'circle' && pendingPoints.length === 1) {
        drawCirclePreview(ctx, pendingPoints[0], cursor, color);
      } else if (tool === 'rect' && pendingPoints.length === 1) {
        drawRectPreview(ctx, pendingPoints[0], cursor, color);
      }
    }
  }, [
    canvasRef,
    imageRef,
    videoRef,
    shapes,
    pendingPoints,
    cursor,
    dragPoint,
    freehandDrawing,
    freehandShape,
    hoverPoint,
    tool,
    color,
    angleMode,
    gridEnabled,
    currentTime,
    isShapeVisible
  ]);

  // Render on changes
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (Date.now() < ignoreClickUntilRef.current) return;
    if (dragPoint) return;
    if (tool === 'freehand') return;

    const point = getCanvasPoint(event);

    if (tool === 'point') {
      setShapes(prev => [...prev, createShape('point', [point])]);
    } else if (tool === 'line') {
      setPendingPoints(prev => {
        const updated = [...prev, point];
        if (updated.length === 2) {
          setShapes(prevShapes => [...prevShapes, createShape('line', updated)]);
          return [];
        }
        return updated;
      });
    } else if (tool === 'angle') {
      setPendingPoints(prev => {
        const updated = [...prev, point];
        if (updated.length === 3) {
          setShapes(prevShapes => [...prevShapes, createShape('angle', updated)]);
          return [];
        }
        return updated;
      });
    } else if (tool === 'circle' || tool === 'rect') {
      setPendingPoints(prev => {
        const updated = [...prev, point];
        if (updated.length === 2) {
          setShapes(prevShapes => [...prevShapes, createShape(tool, updated)]);
          return [];
        }
        return updated;
      });
    }
  }, [tool, dragPoint, getCanvasPoint, createShape]);

  const handleCanvasMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(event);
    setCursor(point);

    const nearestPoint = findNearestPoint(point.x, point.y, 10);
    setHoverPoint(nearestPoint);
    
    if (!nearestPoint) {
      const nearestShape = findNearestShape(point.x, point.y, 8);
      setHoverShape(nearestShape);
    } else {
      setHoverShape(null);
    }
  }, [getCanvasPoint, findNearestPoint, findNearestShape]);

  const handleCanvasLeave = useCallback(() => {
    setCursor(null);
    setHoverPoint(null);
    setHoverShape(null);
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);
    
    const point = getCanvasPoint(event);
    const nearestPoint = findNearestPoint(point.x, point.y, 10);
    
    if (nearestPoint) {
      setDragPoint(nearestPoint);
      setPendingPoints([]);
      setFreehandDrawing(false);
      setFreehandShape(null);
      setCursor(null);
      ignoreClickUntilRef.current = Date.now() + 200;
      return;
    }

    const nearestShape = findNearestShape(point.x, point.y, 8);
    if (nearestShape) {
      setDragShape(nearestShape);
      setDragStart(point);
      setPendingPoints([]);
      setFreehandDrawing(false);
      setFreehandShape(null);
      setCursor(null);
      ignoreClickUntilRef.current = Date.now() + 200;
      return;
    }

    if (tool === 'freehand') {
      event.preventDefault();
      canvas.setPointerCapture?.(event.pointerId);
      setFreehandDrawing(true);
      setFreehandShape(createShape('freehand', [point]));
      setPendingPoints([]);
      setCursor(point);
    }
  }, [tool, getCanvasPoint, findNearestPoint, findNearestShape, createShape, canvasRef]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(event);
    const shouldBlockScroll =
      dragPoint !== null ||
      dragShape !== null ||
      freehandDrawing ||
      pendingPoints.length > 0;
    if (shouldBlockScroll) {
      event.preventDefault();
    }

    if (dragPoint) {
      dragPoint.x = point.x;
      dragPoint.y = point.y;
      setCursor(null);
      return;
    }

    if (dragShape && dragStart) {
      const dx = point.x - dragStart.x;
      const dy = point.y - dragStart.y;
      dragShape.points.forEach(pt => {
        pt.x += dx;
        pt.y += dy;
      });
      setDragStart(point);
      setCursor(null);
      return;
    }

    if (freehandDrawing && freehandShape) {
      const points = freehandShape.points;
      const last = points[points.length - 1];
      if (!last || Math.hypot(point.x - last.x, point.y - last.y) > 2) {
        points.push(point);
      }
      return;
    }

    if (pendingPoints.length > 0) {
      setCursor(point);
    } else {
      setCursor(point);
    }
  }, [dragPoint, dragShape, dragStart, freehandDrawing, freehandShape, pendingPoints.length, getCanvasPoint]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    canvas?.releasePointerCapture?.(event.pointerId);
    
    if (dragPoint) {
      setDragPoint(null);
      setCursor(null);
      ignoreClickUntilRef.current = Date.now() + 200;
      return;
    }

    if (dragShape) {
      setDragShape(null);
      setDragStart(null);
      setCursor(null);
      ignoreClickUntilRef.current = Date.now() + 200;
      return;
    }

    if (freehandDrawing) {
      if (freehandShape && freehandShape.points.length > 1) {
        setShapes(prev => [...prev, freehandShape]);
      }
      setFreehandDrawing(false);
      setFreehandShape(null);
      setCursor(null);
      ignoreClickUntilRef.current = Date.now() + 200;
    }
  }, [dragPoint, dragShape, freehandDrawing, freehandShape, canvasRef]);

  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    setPendingPoints([]);
    setCursor(null);
    setDragPoint(null);
    setDragShape(null);
    setDragStart(null);
    setFreehandDrawing(false);
    setFreehandShape(null);
  }, []);

  const undoShape = useCallback(() => {
    setShapes(prev => prev.slice(0, -1));
    setPendingPoints([]);
  }, []);

  const clearShapes = useCallback(() => {
    setShapes([]);
    setPendingPoints([]);
    setCursor(null);
    setHoverPoint(null);
    setHoverShape(null);
    setDragShape(null);
    setDragStart(null);
    setFreehandDrawing(false);
    setFreehandShape(null);
  }, []);

  return {
    tool,
    setTool,
    shapes,
    pendingPoints,
    cursor,
    dragPoint,
    dragShape,
    hoverPoint,
    hoverShape,
    freehandDrawing,
    handleCanvasClick,
    handleCanvasMove,
    handleCanvasLeave,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleContextMenu,
    undoShape,
    clearShapes,
    renderCanvas,
  };
}
