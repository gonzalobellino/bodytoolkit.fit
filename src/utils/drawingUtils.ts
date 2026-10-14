// Shared utility functions for drawing tools
import type { Point } from '../types/drawing';

// Re-export Point type for consumers
export type { Point };

// Calculate angle between three points
export function calculateAngle(p1: Point, p2: Point, p3: Point): number {
  const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
  const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
  let angle = (angle2 - angle1) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  if (angle > 180) angle = 360 - angle;
  return Math.round(angle);
}

// 30% smaller than the previous 18px label.
const ANGLE_LABEL_FONT_PX = 12.6;

// Draw angle text with white fill and black stroke.
// `scale` is 1/zoom so the label stays the same size on screen.
export function drawAngleText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  scale: number = 1
): void {
  ctx.save();
  ctx.font = `bold ${ANGLE_LABEL_FONT_PX * scale}px sans-serif`;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.1 * scale;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * Angles a line makes with the horizontal. 0° is horizontal.
 * `near` is the smaller angle (0–90). `far` is the angle on the other side (180 − near).
 */
export function lineAnglesFromHorizontal(p1: Point, p2: Point): { near: number; far: number } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  if (Math.hypot(dx, dy) < 0.001) return { near: 0, far: 180 };
  const visual = Math.atan2(-dy, dx) * (180 / Math.PI);
  const undirected = ((visual % 180) + 180) % 180;
  const near = Math.round(Math.min(undirected, 180 - undirected));
  return { near, far: 180 - near };
}

function drawCenteredAngleLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  scale: number
): void {
  ctx.save();
  ctx.font = `bold ${ANGLE_LABEL_FONT_PX * scale}px sans-serif`;
  const width = ctx.measureText(text).width;
  ctx.restore();
  drawAngleText(ctx, text, x - width / 2, y + 4 * scale, scale);
}

/**
 * Measured angle at the vertex and the angle on the other side (they add to 180°).
 * Labels sit on opposite sides of the vertex. No arc.
 */
export function drawVertexAngleLabels(
  ctx: CanvasRenderingContext2D,
  p1: Point,
  vertex: Point,
  p2: Point,
  scale: number = 1
): void {
  const angle = calculateAngle(p1, vertex, p2);
  const other = 180 - angle;
  const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);
  const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);
  let diff = a2 - a1;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  const mid = a1 + diff / 2;
  const offset = 22 * scale;
  const dx = Math.cos(mid) * offset;
  const dy = Math.sin(mid) * offset;

  ctx.save();
  ctx.setLineDash([]);
  drawCenteredAngleLabel(ctx, `${angle}°`, vertex.x + dx, vertex.y + dy, scale);
  drawCenteredAngleLabel(ctx, `${other}°`, vertex.x - dx, vertex.y - dy, scale);
  ctx.restore();
}

/** Draw the two horizontal-reference angles, one on each side of the line. */
export function drawLineHorizontalAngles(
  ctx: CanvasRenderingContext2D,
  p1: Point,
  p2: Point,
  scale: number = 1
): void {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;

  const { near, far } = lineAnglesFromHorizontal(p1, p2);
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const nx = -dy / len;
  const ny = dx / len;

  // Bisector of the line and the nearer horizontal, in canvas space (y down).
  const vx = dx / len;
  const vy = -dy / len;
  const horizX = vx >= 0 ? 1 : -1;
  let bisX = vx + horizX;
  let bisY = -vy;
  const bisLen = Math.hypot(bisX, bisY);
  if (bisLen < 0.001) {
    bisX = 0;
    bisY = -1;
  } else {
    bisX /= bisLen;
    bisY /= bisLen;
  }

  const sign = bisX * nx + bisY * ny >= 0 ? 1 : -1;
  const offset = 18 * scale;
  const sideX = nx * sign * offset;
  const sideY = ny * sign * offset;

  ctx.save();
  ctx.setLineDash([]);
  drawCenteredAngleLabel(ctx, `${near}°`, midX + sideX, midY + sideY, scale);
  drawCenteredAngleLabel(ctx, `${far}°`, midX - sideX, midY - sideY, scale);
  ctx.restore();
}

// Filled endpoint dot. `scale` is 1/zoom so the dot stays the same size on screen.
export function drawSpot(
  ctx: CanvasRenderingContext2D,
  p: Point,
  color: string,
  isHighlighted: boolean = false,
  scale: number = 1
): void {
  ctx.beginPath();
  ctx.arc(p.x, p.y, (isHighlighted ? 6 : 4) * scale, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

// Convert degrees to radians
export function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Normalize angle to 0-360 range
export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

// Get angle difference between two angles
export function getAngleDifference(baseAngle: number, targetAngle: number): number {
  let diff = normalizeAngle(targetAngle - baseAngle);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

// Convert hex color to rgba string
export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '').trim();
  if (!normalized) return `rgba(0, 0, 0, ${alpha})`;
  const full = normalized.length === 3
    ? normalized.split('').map(ch => ch + ch).join('')
    : normalized.padEnd(6, '0').slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Invert hex color
export function invertHexColor(hex: string): string {
  const normalized = hex.replace('#', '').trim();
  const full = normalized.length === 3
    ? normalized.split('').map(ch => ch + ch).join('')
    : normalized.padEnd(6, '0').slice(0, 6);
  const r = 255 - parseInt(full.slice(0, 2), 16);
  const g = 255 - parseInt(full.slice(2, 4), 16);
  const b = 255 - parseInt(full.slice(4, 6), 16);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Rotate hex color channels (R->G->B->R)
export function rotateHexChannels(hex: string): string {
  const normalized = hex.replace('#', '').trim();
  const full = normalized.length === 3
    ? normalized.split('').map(ch => ch + ch).join('')
    : normalized.padEnd(6, '0').slice(0, 6);
  const r = full.slice(0, 2);
  const g = full.slice(2, 4);
  const b = full.slice(4, 6);
  return `#${g}${b}${r}`;
}

// Get arc data for goniometer
export interface ArcData {
  startRad: number;
  endRad: number;
  midRad: number;
  anticlockwise: boolean;
  arcAngle: number;
}

export function getArcData(startDeg: number, endDeg: number): ArcData {
  const start = normalizeAngle(startDeg);
  const end = normalizeAngle(endDeg);
  let delta = normalizeAngle(end - start);
  let anticlockwise = false;
  if (delta > 180) {
    anticlockwise = true;
    delta = 360 - delta;
  }
  const mid = normalizeAngle(start + (anticlockwise ? -delta / 2 : delta / 2));
  return {
    startRad: toRadians(start),
    endRad: toRadians(end),
    midRad: toRadians(mid),
    anticlockwise,
    arcAngle: delta,
  };
}

// Get goniometer radius
export function getGoniometerRadius(pivot: Point, p1: Point, p2: Point): number {
  const d1 = Math.hypot(p1.x - pivot.x, p1.y - pivot.y);
  const d2 = Math.hypot(p2.x - pivot.x, p2.y - pivot.y);
  const maxDist = Math.max(d1, d2, 40);
  return maxDist + 20;
}

// Point to segment distance
export function pointToSegmentDistance(px: number, py: number, p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(px - p1.x, py - p1.y);
  
  let t = ((px - p1.x) * dx + (py - p1.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  
  const nearestX = p1.x + t * dx;
  const nearestY = p1.y + t * dy;
  return Math.hypot(px - nearestX, py - nearestY);
}

// Draw a filled pie slice for goniometer
export function drawPieSlice(
  ctx: CanvasRenderingContext2D,
  pivot: Point,
  radius: number,
  startDeg: number,
  endDeg: number,
  fillStyle: string
): ArcData {
  const arc = getArcData(startDeg, endDeg);
  if (arc.arcAngle < 0.5) return arc;
  ctx.save();
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.moveTo(pivot.x, pivot.y);
  ctx.arc(pivot.x, pivot.y, radius, arc.startRad, arc.endRad, arc.anticlockwise);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  return arc;
}

// Draw arc stroke for goniometer
export function strokePieArc(
  ctx: CanvasRenderingContext2D,
  pivot: Point,
  radius: number,
  arc: ArcData,
  strokeStyle: string,
  lineWidth: number = 2
): void {
  if (arc.arcAngle < 0.5) return;
  ctx.save();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(pivot.x, pivot.y, radius, arc.startRad, arc.endRad, arc.anticlockwise);
  ctx.stroke();
  ctx.restore();
}

// Draw plumb line preview (vertical line from point to canvas edges)
export function drawPlumbLinePreview(
  ctx: CanvasRenderingContext2D,
  point: Point,
  canvas: HTMLCanvasElement
): void {
  ctx.beginPath();
  ctx.moveTo(point.x, 0);
  ctx.lineTo(point.x, canvas.height);
  ctx.stroke();
}

// Draw plumb line (vertical line from point to canvas edges)
export function drawPlumbLine(
  ctx: CanvasRenderingContext2D,
  point: Point,
  canvas: HTMLCanvasElement
): void {
  ctx.beginPath();
  ctx.moveTo(point.x, 0);
  ctx.lineTo(point.x, canvas.height);
  ctx.stroke();
}
