import React, { ReactNode } from 'react';
import {
  Move,
  Minus,
  Circle,
  Pencil,
  Compass,
  Grid3x3,
  Undo,
  RotateCcw,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { DRAWING_COLORS } from '../types/drawing';
import type { DrawingTool } from '../types/drawing';
import { PlumbLineButton } from './PlumbLineButton';

export interface DrawingToolbarProps {
  // State
  selectedTool: DrawingTool;
  selectedColor: string;
  showGrid: boolean;
  toolbarExpanded: boolean;
  disabled?: boolean;
  hasDrawings?: boolean;
  
  // Handlers
  onToolChange: (tool: DrawingTool) => void;
  onColorChange: (color: string) => void;
  onToggleGrid: () => void;
  onToolbarExpandToggle: () => void;
  onUndo: () => void;
  onClear: () => void;
  
  // Optional: extra sections to render after tools
  extraSections?: ReactNode;
  
  // Optional: extra sections to render at the end
  footerSections?: ReactNode;
  
  // Custom class for positioning
  className?: string;
}

// Angle icon SVG
const AngleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M20 20L4 20L4 4" strokeWidth="2" strokeLinecap="round" />
    <path d="M4 20L16 8" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export function DrawingToolbar({
  selectedTool,
  selectedColor,
  showGrid,
  toolbarExpanded,
  disabled = false,
  hasDrawings = false,
  onToolChange,
  onColorChange,
  onToggleGrid,
  onToolbarExpandToggle,
  onUndo,
  onClear,
  extraSections,
  footerSections,
  className = '',
}: DrawingToolbarProps) {
  const baseClass = `bg-white rounded-xl border border-slate-200 p-2 flex flex-col gap-2 sticky top-16 sm:top-20 transition-all duration-200`;
  const sizeClass = toolbarExpanded ? 'w-[140px]' : 'w-12';
  const disabledClass = disabled ? 'opacity-60 pointer-events-none' : '';
  
  const buttonClass = `gap-2 ${toolbarExpanded ? 'justify-start' : 'justify-center p-1'} lg:justify-start`;
  const labelClass = `text-xs ${toolbarExpanded ? 'inline' : 'hidden'} lg:inline`;
  const sectionLabelClass = `text-xs text-slate-500 px-2 mb-1 ${toolbarExpanded ? 'block' : 'hidden'} lg:block`;

  return (
    <div className={`${baseClass} ${sizeClass} lg:w-[140px] ${disabledClass} ${className}`}>
      {/* Toggle button - only on mobile/tablet */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToolbarExpandToggle}
        className="lg:hidden p-1 h-8 w-full justify-center"
        title={toolbarExpanded ? 'Collapse toolbar' : 'Expand toolbar'}
      >
        {toolbarExpanded ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
      </Button>
      
      {/* Tools */}
      <div className="flex flex-col gap-1">
        <p className={sectionLabelClass}>Tools</p>
        
        <Button
          variant={selectedTool === 'select' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onToolChange('select')}
          className={buttonClass}
          title="Select"
        >
          <Move className="w-4 h-4 flex-shrink-0" />
          <span className={labelClass}>Select</span>
        </Button>
        
        <Button
          variant={selectedTool === 'line' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onToolChange('line')}
          className={buttonClass}
          title="Line"
        >
          <Minus className="w-4 h-4 flex-shrink-0" />
          <span className={labelClass}>Line</span>
        </Button>
        
        <Button
          variant={selectedTool === 'angle' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onToolChange('angle')}
          className={buttonClass}
          title="Angle"
        >
          <AngleIcon className="w-4 h-4 flex-shrink-0" />
          <span className={labelClass}>Angle</span>
        </Button>
        
        <Button
          variant={selectedTool === 'goniometer' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onToolChange('goniometer')}
          className={buttonClass}
          title="Goniometer"
        >
          <Compass className="w-4 h-4 flex-shrink-0" />
          <span className={labelClass}>Goniometer</span>
        </Button>
        
        <Button
          variant={selectedTool === 'circle' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onToolChange('circle')}
          className={buttonClass}
          title="Circle"
        >
          <Circle className="w-4 h-4 flex-shrink-0" />
          <span className={labelClass}>Circle</span>
        </Button>
        
        <Button
          variant={selectedTool === 'freehand' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onToolChange('freehand')}
          className={buttonClass}
          title="Freehand"
        >
          <Pencil className="w-4 h-4 flex-shrink-0" />
          <span className={labelClass}>Freehand</span>
        </Button>
        
        <PlumbLineButton
          selectedTool={selectedTool}
          onToolChange={onToolChange}
          toolbarExpanded={toolbarExpanded}
          buttonClass={buttonClass}
          labelClass={labelClass}
        />
      </div>

      <Separator />

      {/* Colors */}
      <div className={`flex flex-col gap-1 ${toolbarExpanded ? 'block' : 'hidden'} lg:block`}>
        <p className="text-xs text-slate-500 px-2 mb-1">Colors</p>
        <div className="grid grid-cols-4 gap-1 px-1">
          {DRAWING_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => onColorChange(color.value)}
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
        <p className={sectionLabelClass}>Actions</p>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          className={buttonClass}
          title="Undo"
          disabled={!hasDrawings}
        >
          <Undo className="w-4 h-4 flex-shrink-0" />
          <span className={labelClass}>Undo</span>
        </Button>
        
        <Button
          variant={showGrid ? 'default' : 'ghost'}
          size="sm"
          onClick={onToggleGrid}
          className={buttonClass}
          title="Grid"
        >
          <Grid3x3 className="w-4 h-4 flex-shrink-0" />
          <span className={labelClass}>Grid</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className={buttonClass}
          title="Clear"
        >
          <RotateCcw className="w-4 h-4 flex-shrink-0" />
          <span className={labelClass}>Clear</span>
        </Button>
      </div>

      {/* Extra sections (e.g., View/Rotate) */}
      {extraSections}

      {/* Footer sections (e.g., Export/Share, New) */}
      {footerSections}
    </div>
  );
}
