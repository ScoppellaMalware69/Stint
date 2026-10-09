import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface HeroFigureProps {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  /** Supporting visual below the caption, e.g. a `Meter`. */
  children?: ReactNode;
  className?: string;
}

/** The one headline number a view leads with: same sans as the UI, proportional figures. */
export function HeroFigure({ label, value, caption, children, className }: HeroFigureProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-sm font-medium text-ink-2">{label}</p>
      <div className="mt-1 text-hero font-semibold text-ink proportional-nums">{value}</div>
      {caption ? <div className="mt-2 text-sm text-ink-2">{caption}</div> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
