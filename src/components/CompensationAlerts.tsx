import React from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { Badge } from './ui/badge';
import type { CompensationAlert, CompensationType } from '../hooks/useCompensationDetection';

interface CompensationAlertsProps {
  currentCompensations: CompensationAlert[];
  onDismiss?: () => void;
  compact?: boolean;
}

const SEVERITY_STYLES = {
  severe: {
    bg: 'bg-red-50 border-red-200',
    icon: 'text-red-500',
    badge: 'bg-red-100 text-red-700 border-red-200',
  },
  moderate: {
    bg: 'bg-orange-50 border-orange-200',
    icon: 'text-orange-500',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  mild: {
    bg: 'bg-yellow-50 border-yellow-200',
    icon: 'text-yellow-600',
    badge: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
};

const COMPENSATION_ICONS: Record<CompensationType, React.ReactNode> = {
  knee_valgus: <AlertTriangle className="w-4 h-4" />,
  trunk_forward_lean: <AlertCircle className="w-4 h-4" />,
  hip_shift: <AlertCircle className="w-4 h-4" />,
  shoulder_elevation: <Info className="w-4 h-4" />,
  cervical_protraction: <AlertTriangle className="w-4 h-4" />,
  lateral_trunk_lean: <AlertCircle className="w-4 h-4" />,
};

export function CompensationAlerts({ 
  currentCompensations, 
  onDismiss,
  compact = false 
}: CompensationAlertsProps): React.JSX.Element | null {
  if (currentCompensations.length === 0) return null;

  // Group by type and take highest severity for each
  const grouped = currentCompensations.reduce((acc, comp) => {
    const existing = acc.get(comp.type);
    if (!existing || 
        (comp.severity === 'severe') ||
        (comp.severity === 'moderate' && existing.severity === 'mild')) {
      acc.set(comp.type, comp);
    }
    return acc;
  }, new Map<CompensationType, CompensationAlert>());

  const alerts = Array.from(grouped.values());

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {alerts.map((alert) => {
          const styles = SEVERITY_STYLES[alert.severity];
          return (
            <Badge
              key={alert.type}
              variant="outline"
              className={`${styles.badge} text-xs py-0.5`}
            >
              {COMPENSATION_ICONS[alert.type]}
              <span className="ml-1">{alert.message.split('(')[0].trim()}</span>
            </Badge>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const styles = SEVERITY_STYLES[alert.severity];
        return (
          <div
            key={`${alert.type}-${alert.side}`}
            className={`flex items-center justify-between p-3 rounded-lg border ${styles.bg}`}
          >
            <div className="flex items-center gap-3">
              <div className={styles.icon}>
                {COMPENSATION_ICONS[alert.type]}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {alert.message}
                </p>
                <p className="text-xs text-slate-500">
                  {alert.side !== 'bilateral' ? `${alert.side} side` : 'Both sides'}
                  {alert.value !== undefined && ` • ${typeof alert.value === 'number' ? alert.value.toFixed(1) : alert.value}`}
                </p>
              </div>
            </div>
            <Badge 
              variant="outline" 
              className={`text-xs ${styles.badge}`}
            >
              {alert.severity}
            </Badge>
          </div>
        );
      })}
      {onDismiss && (
        <button 
          onClick={onDismiss}
          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <X className="w-3 h-3" />
          Clear alerts
        </button>
      )}
    </div>
  );
}

// Floating alert component for overlay on video
export function CompensationAlertOverlay({ 
  currentCompensations 
}: { 
  currentCompensations: CompensationAlert[] 
}): React.JSX.Element | null {
  if (currentCompensations.length === 0) return null;

  // Only show severe and moderate alerts
  const significantAlerts = currentCompensations.filter(
    c => c.severity === 'severe' || c.severity === 'moderate'
  );

  if (significantAlerts.length === 0) return null;

  // Group by type
  const grouped = significantAlerts.reduce((acc, comp) => {
    if (!acc.has(comp.type)) {
      acc.set(comp.type, comp);
    }
    return acc;
  }, new Map<CompensationType, CompensationAlert>());

  const alerts = Array.from(grouped.values());

  return (
    <div className="absolute top-4 right-4 z-30 flex flex-col gap-2 max-w-xs pointer-events-none">
      {alerts.slice(0, 3).map((alert) => {
        const styles = SEVERITY_STYLES[alert.severity];
        return (
          <div
            key={alert.type}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border shadow-lg backdrop-blur-sm ${styles.bg} animate-in slide-in-from-right duration-200`}
          >
            <div className={styles.icon}>
              {COMPENSATION_ICONS[alert.type]}
            </div>
            <span className="text-sm font-medium text-slate-900">
              {alert.message.split('(')[0].trim()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
