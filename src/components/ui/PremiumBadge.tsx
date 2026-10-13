import React from 'react';
import { Crown } from 'lucide-react';
import { Badge } from './badge';
import { cn } from './utils';

interface PremiumBadgeProps {
  className?: string;
  variant?: 'default' | 'small' | 'icon-only';
}

export function PremiumBadge({ className, variant = 'default' }: PremiumBadgeProps) {
  if (variant === 'icon-only') {
    return (
      <Crown className={cn('w-3.5 h-3.5 text-yellow-500', className)} />
    );
  }
  
  if (variant === 'small') {
    return (
      <Badge className={cn('bg-yellow-400 text-yellow-900 flex items-center gap-1', className)}>
        <Crown className="w-3 h-3" />
        <span className="text-xs">Premium</span>
      </Badge>
    );
  }

  return (
    <Badge className={cn('bg-yellow-400 text-yellow-900 flex items-center gap-1.5 px-2.5 py-1', className)}>
      <Crown className="w-3.5 h-3.5" />
      <span className="text-sm font-medium">Premium</span>
    </Badge>
  );
}


