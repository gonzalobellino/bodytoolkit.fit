import React from 'react';
import { Move, Hand, X as XIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';

export interface KeypointToolbarProps {
  selectedKeypoint: number | null;
  keypointDragMode: boolean;
  onDragModeChange: (enabled: boolean) => void;
  trailEnabled: boolean;
  trailColor: string;
  onTrailToggle: () => void;
  onTrailColorChange: (color: string) => void;
  showCenterOfMass: boolean;
  showBalancePoint: boolean;
  onCenterOfMassChange: (enabled: boolean) => void;
  onBalancePointChange: (enabled: boolean) => void;
  onClose: () => void;
  onResetKeypoint?: () => void;
}

const TRAIL_COLORS = ['#ffff00', '#00ff00', '#ff00ff', '#00ffff', '#ff0000', '#0000ff'];

export function KeypointToolbar({
  selectedKeypoint,
  keypointDragMode,
  onDragModeChange,
  trailEnabled,
  trailColor,
  onTrailToggle,
  onTrailColorChange,
  showCenterOfMass,
  showBalancePoint,
  onCenterOfMassChange,
  onBalancePointChange,
  onClose,
  onResetKeypoint,
}: KeypointToolbarProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-1 bg-white/90 backdrop-blur border border-slate-200 rounded-lg shadow-sm p-1" data-keypoint-toolbar>
        {/* Mode selection buttons */}
        <Button
          variant={!keypointDragMode ? 'default' : 'ghost'}
          size="icon"
          onClick={() => onDragModeChange(false)}
          className="h-8 w-8"
          title="Select mode"
        >
          <Move className="w-4 h-4" />
        </Button>
        <Button
          variant={keypointDragMode ? 'default' : 'ghost'}
          size="icon"
          onClick={() => onDragModeChange(true)}
          className="h-8 w-8"
          title="Drag mode"
        >
          <Hand className="w-4 h-4" />
        </Button>
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Trail toggle */}
        <div className="flex items-center gap-1.5 px-1">
          <Label htmlFor={`trail-${selectedKeypoint}`} className="text-xs text-slate-600 cursor-pointer whitespace-nowrap leading-none">
            Trail
          </Label>
          <Switch
            id={`trail-${selectedKeypoint}`}
            checked={trailEnabled}
            onCheckedChange={onTrailToggle}
            className="cursor-pointer"
          />
        </div>

        {/* Color picker (if trail enabled) */}
        {trailEnabled && (
          <>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <div className="flex items-center gap-1 px-1">
              {TRAIL_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => onTrailColorChange(color)}
                  className={`w-4 h-4 rounded border ${
                    trailColor === color ? 'border-slate-800' : 'border-slate-300'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </>
        )}

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* COM and BOS toggles */}
        <div className="flex items-center gap-1.5 px-1">
          <Label htmlFor={`com-${selectedKeypoint}`} className="text-xs text-slate-600 cursor-pointer whitespace-nowrap leading-none">
            COM
          </Label>
          <Switch
            id={`com-${selectedKeypoint}`}
            checked={showCenterOfMass}
            onCheckedChange={onCenterOfMassChange}
            className="cursor-pointer"
          />
        </div>
        <div className="flex items-center gap-1.5 px-1">
          <Label htmlFor={`bos-${selectedKeypoint}`} className="text-xs text-slate-600 cursor-pointer whitespace-nowrap leading-none">
            BOS
          </Label>
          <Switch
            id={`bos-${selectedKeypoint}`}
            checked={showBalancePoint}
            onCheckedChange={onBalancePointChange}
            className="cursor-pointer"
          />
        </div>

        {onResetKeypoint && (
          <>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetKeypoint}
              className="h-7 px-2 text-xs"
              title="Reset Keypoint"
            >
              Reset
            </Button>
          </>
        )}

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
          title="Close"
        >
          <XIcon className="w-4 h-4" />
        </Button>
    </div>
  );
}
