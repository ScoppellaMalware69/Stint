import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Smaller variant for use inside cards. */
  compact?: boolean;
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  headingLevel = 2,
  className,
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        compact ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-14',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-sunken text-ink-2',
          compact ? 'size-10' : 'size-12',
        )}
      >
        <Icon aria-hidden className="size-5" />
      </div>
      <Heading className={cn('font-display text-ink', compact ? 'text-xl' : 'text-2xl')}>
        {title}
      </Heading>
      {description ? <p className="max-w-md text-sm text-ink-2">{description}</p> : null}
      {action ? <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
