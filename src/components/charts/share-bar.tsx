import { cn } from '@/lib/cn';

export interface ShareBarProps {
  /** Share of the whole, 0–1 (clamped). */
  ratio: number;
  className?: string;
}

/** Decorative single-hue share bar; the value it shows must also be present as text. */
export function ShareBar({ ratio, className }: ShareBarProps) {
  const percent = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) * 100 : 0;
  return (
    <div
      aria-hidden="true"
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-sunken', className)}
    >
      <div className="h-full rounded-full bg-data-blue" style={{ width: `${percent}%` }} />
    </div>
  );
}
