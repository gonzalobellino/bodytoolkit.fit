// Shared types for drawing tools across video analysis components

export type DrawingTool = 'select' | 'line' | 'angle' | 'circle' | 'freehand' | 'goniometer' | 'plumbline';

export type DrawingMode = 'global' | 'timebound';

export interface Point {
  x: number;
  y: number;
}

// Base interface for drawing elements (used by PhotoAnalysis - no timebound)
export interface BaseDrawingElement {
  id: string;
  type: DrawingTool;
  points: Point[];
  color: string;
  axisAngle?: number;
}

// Extended interface for VideoAnalysis (includes timebound mode)
export interface DrawingElement extends BaseDrawingElement {
  mode: DrawingMode;
  timeRange?: { start: number; end: number };
}

export interface Marker {
  id: string;
  time: number;
  color: string;
  label: string;
}

export const DRAWING_COLORS = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Cyan', value: '#06B6D4' },
] as const;

// Re-export for convenience (matches VideoAnalysis COLORS)
export const COLORS = DRAWING_COLORS;
