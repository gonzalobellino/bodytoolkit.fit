import React from 'react';
import { Button } from './ui/button';
import { Ruler } from 'lucide-react';
import type { DrawingTool } from '../types/drawing';

export interface PlumbLineButtonProps {
  selectedTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  toolbarExpanded: boolean;
  buttonClass: string;
  labelClass: string;
}

export function PlumbLineButton({
  selectedTool,
  onToolChange,
  toolbarExpanded,
  buttonClass,
  labelClass,
}: PlumbLineButtonProps) {
  return (
    <Button
      variant={selectedTool === 'plumbline' ? 'default' : 'ghost'}
      size="sm"
      onClick={() => onToolChange('plumbline')}
      className={buttonClass}
      title="Plumb Line"
    >
      <Ruler className="w-4 h-4 flex-shrink-0" />
      <span className={labelClass}>Plumb Line</span>
    </Button>
  );
}
