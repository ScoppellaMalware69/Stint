import { OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { BudgetLevel } from '@/domain/budget';
import { cn } from '@/lib/cn';

export interface MeterProps {
  value: number;
  max: number;
  /** Accessible name, e.g. "Budget used". */
  label: string;
  /** Spoken value, e.g. "32h of 40h (80%)". */
  valueText: string;
  level?: BudgetLevel;
  /** Shows the icon + text status below the bar for warning/over levels. */
  showStatus?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/** The track is a lighter step of the fill's own ramp so the state reads across the bar. */
const LEVEL_CLASSES: Record<BudgetLevel, { track: string; fill: string }> = {
  ok: { track: 'bg-meter-track', fill: 'bg-data-blue' },
  warning: { track: 'bg-meter-track-warning', fill: 'bg-status-warning' },
  over: { track: 'bg-meter-track-critical', fill: 'bg-status-critical' },
};

const STATUS: Record<
  Exclude<BudgetLevel, 'ok'>,
  { icon: LucideIcon; label: string; iconClass: string; textClass: string }
> = {
  warning: {
    icon: TriangleAlert,
    label: 'Near budget',
    iconClass: 'text-status-warning',
    textClass: 'text-warning',
  },
  over: {
    icon: OctagonAlert,
    label: 'Over budget',
    iconClass: 'text-status-critical',
    textClass: 'text-danger',
  },
};

const finiteOrZero = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

/** Ratio-against-a-limit bar. Overflow fills the whole track in the critical colour. */
export function Meter({
  value,
  max,
  label,
  valueText,
  level = 'ok',
  showStatus = true,
  size = 'md',
  className,
}: MeterProps) {
  const safeMax = finiteOrZero(max);
  const safeValue = finiteOrZero(value);
  const ratio = safeMax > 0 ? safeValue / safeMax : 0;
  const fillPercent = Math.min(1, ratio) * 100;
  const classes = LEVEL_CLASSES[level];
  const status = level === 'ok' ? null : STATUS[level];

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        // ARIA requires now ≤ max; the overflow itself is conveyed by valueText.
        aria-valuenow={Math.min(safeValue, safeMax)}
        aria-valuetext={valueText}
        className={cn(
          'w-full overflow-hidden rounded-full',
          size === 'sm' ? 'h-1.5' : 'h-2',
          classes.track,
        )}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-300', classes.fill)}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
      {showStatus && status ? (
        <p className={cn('flex items-center gap-1.5 text-xs font-medium', status.textClass)}>
          <status.icon className={cn('size-3.5 shrink-0', status.iconClass)} aria-hidden="true" />
          {status.label}
        </p>
      ) : null}
    </div>
  );
}
