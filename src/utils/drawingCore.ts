// ===========================================
// Drawing Core Utilities
// ===========================================
// Pure utility functions for canvas drawing
// Converted from js/drawing-core.js to TypeScript

export interface Point {
  x: number;
  y: number;
}

export interface Shape {
  type: 'point' | 'line' | 'angle' | 'circle' | 'rect' | 'freehand';
  points: Point[];
  color: string;
  scope?: {
    type: 'global' | 'range';
    start?: number;
    end?: number;
  };
}

export interface DrawPointOptions {
  color: string;
  pending: boolean;
  hovered: boolean;
}

/**
 * Calculate angle between three points (p1-p2-p3)
 */
export function calculateAngle(p1: Point, p2: Point, p3: Point): number {
  const a = Math.hypot(p1.x - p2.x, p1.y - p2.y);
  const b = Math.hypot(p3.x - p2.x, p3.y - p2.y);
  const c = Math.hypot(p1.x - p3.x, p1.y - p3.y);
  if (a === 0 || b === 0) return 0;
  const cosValue = (a * a + b * b - c * c) / (2 * a * b);
  const clamped = Math.min(1, Math.max(-1, cosValue));
  return (Math.acos(clamped) * 180) / Math.PI;
}

/**
 * Get display angle based on mode (standard or acute)
 */
export function getDisplayAngle(p1: Point, p2: Point, p3: Point, mode: 'standard' | 'acute' = 'standard'): number {
  const angle = calculateAngle(p1, p2, p3);
  if (mode === 'acute') {
    return Math.min(angle, 180 - angle);
  }
  return angle;
}

/**
 * Calculate distance from point to line segment
 */
export function pointToSegmentDistance(x: number, y: number, p1: Point, p2: Point): number {
  const vx = p2.x - p1.x;
  const vy = p2.y - p1.y;
  const wx = x - p1.x;
  const wy = y - p1.y;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(x - p1.x, y - p1.y);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(x - p2.x, y - p2.y);
  const t = c1 / c2;
  const projX = p1.x + t * vx;
  const projY = p1.y + t * vy;
  return Math.hypot(x - projX, y - projY);
}

/**
 * Get line segments from a shape
 */
export function getShapeSegments(shape: Shape): [Point, Point][] {
  if (shape.type === 'line') {
    return [[shape.points[0], shape.points[1]]];
  }
  if (shape.type === 'angle') {
    return [
      [shape.points[1], shape.points[0]],
      [shape.points[1], shape.points[2]]
    ];
  }
  if (shape.type === 'freehand') {
    const segments: [Point, Point][] = [];
    for (let i = 1; i < shape.points.length; i++) {
      segments.push([shape.points[i - 1], shape.points[i]]);
    }
    return segments;
  }
  if (shape.type === 'rect') {
    const p1 = shape.points[0];
    const p2 = shape.points[1];
    const topLeft = { x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y) };
    const bottomRight = { x: Math.max(p1.x, p2.x), y: Math.max(p1.y, p2.y) };
    const topRight = { x: bottomRight.x, y: topLeft.y };
    const bottomLeft = { x: topLeft.x, y: bottomRight.y };
    return [
      [topLeft, topRight],
      [topRight, bottomRight],
      [bottomRight, bottomLeft],
      [bottomLeft, topLeft]
    ];
  }
  return [];
}

/**
 * Draw image to context, scaled to fit canvas
 */
export function drawImageToContext(ctx: CanvasRenderingContext2D, img: HTMLImageElement, canvas: HTMLCanvasElement): void {
  const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;
  ctx.drawImage(img, x, y, w, h);
}

/**
 * Draw point to context
 */
export function drawPointToContext(ctx: CanvasRenderingContext2D, point: Point, color: string): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#0b0b1d';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/**
 * Draw line segment
 */
export function drawLineSegment(ctx: CanvasRenderingContext2D, p1: Point, p2: Point, color: string, width: number = 3): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw line with points
 */
export function drawLineToContext(ctx: CanvasRenderingContext2D, p1: Point, p2: Point, color: string): void {
  drawLineSegment(ctx, p1, p2, color, 3);
  drawPointToContext(ctx, p1, color);
  drawPointToContext(ctx, p2, color);
}

/**
 * Draw angle label
 */
export function drawAngleLabel(ctx: CanvasRenderingContext2D, p2: Point, angle: number): void {
  ctx.save();
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#ffffff';
  const label = `${angle.toFixed(1)}°`;
  ctx.strokeText(label, p2.x + 8, p2.y - 8);
  ctx.fillText(label, p2.x + 8, p2.y - 8);
  ctx.restore();
}

/**
 * Draw angle with label
 */
export function drawAngleToContext(ctx: CanvasRenderingContext2D, p1: Point, p2: Point, p3: Point, color: string, angle: number): void {
  drawLineToContext(ctx, p2, p1, color);
  drawLineToContext(ctx, p2, p3, color);
  drawAngleLabel(ctx, p2, angle);
}

/**
 * Draw circle stroke
 */
export function drawCircleStroke(ctx: CanvasRenderingContext2D, center: Point, edge: Point, color: string, width: number = 3): void {
  const radius = Math.hypot(edge.x - center.x, edge.y - center.y);
  ctx.save();
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw circle with points
 */
export function drawCircleToContext(ctx: CanvasRenderingContext2D, center: Point, edge: Point, color: string): void {
  drawCircleStroke(ctx, center, edge, color, 3);
  drawPointToContext(ctx, center, color);
  drawPointToContext(ctx, edge, color);
}

/**
 * Draw freehand line
 */
export function drawFreehandToContext(ctx: CanvasRenderingContext2D, points: Point[], color: string): void {
  if (!points || points.length < 2) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw rectangle stroke
 */
export function drawRectStroke(ctx: CanvasRenderingContext2D, p1: Point, p2: Point, color: string, width: number = 3): void {
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);
  const w = Math.abs(p1.x - p2.x);
  const h = Math.abs(p1.y - p2.y);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

/**
 * Draw rectangle with points
 */
export function drawRectToContext(ctx: CanvasRenderingContext2D, p1: Point, p2: Point, color: string): void {
  drawRectStroke(ctx, p1, p2, color, 3);
  drawPointToContext(ctx, p1, color);
  drawPointToContext(ctx, p2, color);
}

/**
 * Draw shapes to context with visibility and angle mode
 */
export function drawShapesToContext(
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  time: number | null,
  isVisible: (shape: Shape, time: number | null) => boolean,
  getAngleMode: () => 'standard' | 'acute'
): void {
  shapes.forEach(shape => {
    if (isVisible && !isVisible(shape, time)) return;
    if (shape.type === 'point') {
      drawPointToContext(ctx, shape.points[0], shape.color);
    } else if (shape.type === 'line') {
      drawLineToContext(ctx, shape.points[0], shape.points[1], shape.color);
    } else if (shape.type === 'angle') {
      const angle = getDisplayAngle(shape.points[0], shape.points[1], shape.points[2], getAngleMode());
      drawAngleToContext(ctx, shape.points[0], shape.points[1], shape.points[2], shape.color, angle);
    } else if (shape.type === 'circle') {
      drawCircleToContext(ctx, shape.points[0], shape.points[1], shape.color);
    } else if (shape.type === 'freehand') {
      drawFreehandToContext(ctx, shape.points, shape.color);
    } else if (shape.type === 'rect') {
      drawRectToContext(ctx, shape.points[0], shape.points[1], shape.color);
    }
  });
}

/**
 * Draw point with options
 */
export function drawPoint(ctx: CanvasRenderingContext2D, point: Point, options: DrawPointOptions): void {
  const { color, pending, hovered } = options;
  const outerRadius = hovered ? 8 : 7;
  const innerRadius = hovered ? 4 : 3;
  ctx.save();
  ctx.beginPath();
  ctx.arc(point.x, point.y, outerRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#0b0b1d';
  ctx.strokeStyle = pending ? 'rgba(255,255,255,0.6)' : color;
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(point.x, point.y, innerRadius, 0, Math.PI * 2);
  ctx.fillStyle = pending ? 'rgba(255,255,255,0.6)' : color;
  ctx.fill();
  ctx.restore();
}

/**
 * Draw line
 */
export function drawLine(ctx: CanvasRenderingContext2D, p1: Point, p2: Point, color: string): void {
  drawLineSegment(ctx, p1, p2, color, 3);
  drawPoint(ctx, p1, { color, pending: false, hovered: false });
  drawPoint(ctx, p2, { color, pending: false, hovered: false });
}

/**
 * Draw circle
 */
export function drawCircle(ctx: CanvasRenderingContext2D, center: Point, edge: Point, color: string): void {
  drawCircleStroke(ctx, center, edge, color, 3);
  drawPoint(ctx, center, { color, pending: false, hovered: false });
  drawPoint(ctx, edge, { color, pending: false, hovered: false });
}

/**
 * Draw rectangle
 */
export function drawRect(ctx: CanvasRenderingContext2D, p1: Point, p2: Point, color: string): void {
  drawRectStroke(ctx, p1, p2, color, 3);
  drawPoint(ctx, p1, { color, pending: false, hovered: false });
  drawPoint(ctx, p2, { color, pending: false, hovered: false });
}

/**
 * Draw freehand
 */
export function drawFreehand(ctx: CanvasRenderingContext2D, points: Point[], color: string): void {
  drawFreehandToContext(ctx, points, color);
}

/**
 * Draw angle
 */
export function drawAngle(ctx: CanvasRenderingContext2D, p1: Point, p2: Point, p3: Point, color: string, angle: number): void {
  drawLine(ctx, p2, p1, color);
  drawLine(ctx, p2, p3, color);
  drawAngleLabel(ctx, p2, angle);
}

/**
 * Draw line preview (dashed)
 */
export function drawLinePreview(ctx: CanvasRenderingContext2D, p1: Point, p2: Point, color: string): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.globalAlpha = 0.6;
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw angle preview
 */
export function drawAnglePreview(ctx: CanvasRenderingContext2D, p2: Point, angle: number): void {
  drawAngleLabel(ctx, p2, angle);
}

/**
 * Draw circle preview (dashed)
 */
export function drawCirclePreview(ctx: CanvasRenderingContext2D, center: Point, edge: Point, color: string): void {
  const radius = Math.hypot(edge.x - center.x, edge.y - center.y);
  ctx.save();
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.globalAlpha = 0.6;
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw rectangle preview (dashed)
 */
export function drawRectPreview(ctx: CanvasRenderingContext2D, p1: Point, p2: Point, color: string): void {
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);
  const w = Math.abs(p1.x - p2.x);
  const h = Math.abs(p1.y - p2.y);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.globalAlpha = 0.6;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

/**
 * Draw grid overlay (thirds + center cross)
 */
export function drawGrid(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  const w = canvas.width;
  const h = canvas.height;
  
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  
  // Vertical lines (thirds)
  for (let i = 1; i <= 2; i++) {
    const x = (w / 3) * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  
  // Horizontal lines (thirds)
  for (let i = 1; i <= 2; i++) {
    const y = (h / 3) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  
  // Center cross
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
  
  ctx.restore();
}

