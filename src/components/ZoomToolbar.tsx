import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, Trash2, Move } from 'lucide-react';
import { Button } from './ui/button';

export interface ZoomToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom?: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  selectedTool?: string;
  onToolSelect?: (tool: string) => void;
  showResetVideo?: boolean;
  onResetVideo?: () => void;
  position?: 'absolute' | 'relative';
  className?: string;
}

export function ZoomToolbar({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  isFullscreen,
  onToggleFullscreen,
  selectedTool,
  onToolSelect,
  showResetVideo = false,
  onResetVideo,
  position = 'absolute',
  className = '',
}: ZoomToolbarProps): React.JSX.Element {
  const containerClass = position === 'absolute' 
    ? `absolute bottom-4 right-4 z-10 pointer-events-auto ${className}`
    : className;

  return (
    <div className={containerClass}>
      <div className="flex items-center gap-1 bg-white/90 backdrop-blur border border-slate-200 rounded-lg shadow-sm p-1">
        {selectedTool && onToolSelect && (
          <>
            <Button
              variant={selectedTool === 'select' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => onToolSelect('select')}
              className="h-8 w-8"
              title="Select"
            >
              <Move className="w-4 h-4" />
            </Button>
            <div className="w-px h-5 bg-slate-200 mx-1" />
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          className="h-8 w-8"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs text-slate-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomIn}
          className="h-8 w-8"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFullscreen}
          className="h-8 w-8"
          title={isFullscreen ? 'Exit full screen' : 'Full screen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>
        {showResetVideo && onResetVideo && (
          <>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <Button
              variant="ghost"
              size="icon"
              onClick={onResetVideo}
              className="h-8 w-8 text-rose-600 hover:text-rose-700"
              title="New"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
