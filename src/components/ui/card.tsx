import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'section' | 'article' | 'aside' | 'li';
};

export function Card({ as: Component = 'div', className, ...props }: CardProps) {
  return (
    <Component
      className={cn('min-w-0 rounded-lg border border-line bg-surface', className)}
      {...props}
    />
  );
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Controls aligned to the end of the header (buttons, menus, toggles). */
  action?: ReactNode;
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

export function CardHeader({
  title,
  description,
  action,
  headingLevel = 2,
  className,
}: CardHeaderProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      data-slot="card-header"
      className={cn(
        'flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pt-4 sm:px-5 sm:pt-5',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <Heading className="text-base font-semibold text-ink">{title}</Heading>
        {description ? <p className="mt-0.5 text-sm text-ink-2">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      // Tighter top padding right after a header so the title sits close to its content.
      className={cn(
        'p-4 sm:p-5 [[data-slot=card-header]+&]:pt-3 sm:[[data-slot=card-header]+&]:pt-4',
        className,
      )}
      {...props}
    />
  );
}
