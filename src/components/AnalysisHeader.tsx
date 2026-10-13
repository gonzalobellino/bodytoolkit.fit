import React, { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

export interface AnalysisHeaderProps {
  title: string;
  subtitle: string;
  badgeText: string;
  badgeIcon: ReactNode;
  onBack: () => void;
  isFullscreen?: boolean;
  maxWidth?: 'default' | 'wide';
  rightContent?: ReactNode;
}

export function AnalysisHeader({
  title,
  subtitle,
  badgeText,
  badgeIcon,
  onBack,
  isFullscreen = false,
  maxWidth = 'default',
  rightContent,
}: AnalysisHeaderProps) {
  const maxWidthClass = maxWidth === 'wide' ? 'max-w-[1800px]' : 'max-w-7xl';
  
  if (isFullscreen) return null;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className={`${maxWidthClass} mx-auto px-4 sm:px-6 lg:px-8`}>
        <div className="flex items-center justify-between h-14 min-w-0">
          <div className="flex items-center gap-4 min-w-0">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="min-w-0">
              <h1 className="text-slate-900 font-medium text-sm truncate">{title}</h1>
              <p className="text-xs text-slate-500 truncate">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {rightContent}
            <Badge variant="outline" className="gap-1">
              {badgeIcon}
              <span className="hidden sm:inline">{badgeText}</span>
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
}
