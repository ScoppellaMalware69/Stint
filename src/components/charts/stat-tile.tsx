import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface StatDelta {
  /** Signed change against a named period, e.g. "+12% vs last week". */
  label: string;
  direction: 'up' | 'down' | 'flat';
  /** Whether the change is good news; picks the colour, never the only signal. */
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface StatTileProps {
  label: string;
  value: ReactNode;
  delta?: StatDelta;
  footnote?: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}

const DIRECTION_ICONS: Record<StatDelta['direction'], LucideIcon> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
};

const SENTIMENT_CLASSES: Record<StatDelta['sentiment'], string> = {
  positive: 'bg-success-soft text-success',
  negative: 'bg-danger-soft text-danger',
  neutral: 'bg-sunken text-ink-3',
};

/** A single KPI: label, headline value, optional delta chip, footnote and action. */
export function StatTile({
  label,
  value,
  delta,
  footnote,
  action,
  icon: Icon,
  className,
}: StatTileProps) {
  const DeltaIcon = delta ? DIRECTION_ICONS[delta.direction] : null;
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col rounded-lg border border-line bg-surface p-4 lg:p-5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="flex min-w-0 items-center gap-1.5 text-sm text-ink-2">
          {Icon ? <Icon className="size-4 shrink-0 text-ink-3" aria-hidden="true" /> : null}
          <span className="truncate">{label}</span>
        </p>
        {action ? <div className="-my-1 shrink-0">{action}</div> : null}
      </div>
      <div className="mt-2 text-2xl font-semibold text-ink proportional-nums lg:text-3xl">
        {value}
      </div>
      {delta || footnote ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          {delta && DeltaIcon ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                SENTIMENT_CLASSES[delta.sentiment],
              )}
            >
              <DeltaIcon className="size-3.5 shrink-0" aria-hidden="true" />
              {delta.label}
            </span>
          ) : null}
          {footnote ? <div className="text-xs text-ink-3">{footnote}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
