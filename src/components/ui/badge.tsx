import type { LucideIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'signal' | 'outline';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-sunken text-ink-2',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  signal: 'bg-signal-soft text-signal',
  outline: 'border border-line-strong text-ink-2',
};

type BadgeProps = ComponentProps<'span'> & {
  tone?: BadgeTone;
  /** Status badges pair the colour with an icon so colour is never the only signal. */
  icon?: LucideIcon;
};

export function Badge({ tone = 'neutral', icon: Icon, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
      {...props}
    >
      {Icon ? <Icon aria-hidden className="size-3.5 shrink-0" /> : null}
      {children}
    </span>
  );
}
