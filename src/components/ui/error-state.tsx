import { CircleAlert, RotateCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './button';

function defaultErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Something went wrong';
}

interface ErrorStateProps {
  title?: string;
  error: unknown;
  onRetry?: () => void;
  /** Turns the error into user-facing text; defaults to the Error's message. */
  formatError?: (error: unknown) => string;
  className?: string;
}

export function ErrorState({
  title = 'Couldn’t load this',
  error,
  onRetry,
  formatError = defaultErrorMessage,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft p-4 sm:flex-row sm:items-center',
        className,
      )}
    >
      <CircleAlert aria-hidden className="size-5 shrink-0 text-danger" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-danger">{title}</p>
        <p className="mt-0.5 text-sm break-words text-ink-2">{formatError(error)}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCw aria-hidden />
          Retry
        </Button>
      ) : null}
    </div>
  );
}
