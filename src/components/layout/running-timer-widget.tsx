import { Play, Square } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { ColorDot } from '@/components/ui/color-dot';
import { Skeleton } from '@/components/ui/skeleton';
import type { Project, TimeEntry } from '@/domain/models';
import { cn } from '@/lib/cn';
import { LiveClock } from './live-clock';
import { useRunningTimer, useTimerActions } from './use-running-timer';

function WidgetCard({ children, busy }: { children: ReactNode; busy?: boolean }) {
  return (
    <section
      aria-label="Timer"
      aria-busy={busy || undefined}
      className="rounded-lg border border-line bg-surface p-3"
    >
      {children}
    </section>
  );
}

function RunningState({ entry, project }: { entry: TimeEntry; project: Project | null }) {
  const { stop, isStopping } = useTimerActions();
  const description = entry.description.trim();

  return (
    <WidgetCard>
      <p className="flex items-center gap-2 text-xs font-medium text-signal">
        <span aria-hidden className="size-2 shrink-0 animate-live rounded-full bg-signal" />
        Tracking
      </p>
      <p
        className={cn('mt-2 truncate text-sm font-medium', description ? 'text-ink' : 'text-ink-3')}
      >
        {description || 'No description'}
      </p>
      <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-ink-2">
        {project ? (
          <>
            <ColorDot color={project.color} size="sm" />
            <span className="truncate">{project.name}</span>
          </>
        ) : (
          <span className="text-ink-3">No project</span>
        )}
      </p>
      <p className="mt-3 font-mono text-2xl leading-none font-medium text-ink tabular-nums">
        <span className="sr-only">Elapsed time: </span>
        <LiveClock entry={entry} />
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <Button
          variant="primary"
          size="sm"
          loading={isStopping}
          onClick={() => void stop()}
          aria-label="Stop timer"
        >
          {isStopping ? null : <Square aria-hidden className="size-3.5 fill-current" />}
          Stop
        </Button>
        <Link
          to="/time"
          className="rounded-sm text-sm text-ink-2 underline-offset-4 transition-colors duration-150 hover:text-ink hover:underline"
        >
          Open timer
        </Link>
      </div>
    </WidgetCard>
  );
}

function IdleState() {
  const { start, isStarting } = useTimerActions();
  return (
    <WidgetCard>
      <p className="text-sm font-medium text-ink">No timer running</p>
      <Button
        variant="secondary"
        size="sm"
        className="mt-3 w-full"
        loading={isStarting}
        onClick={() => void start()}
      >
        {isStarting ? null : <Play aria-hidden className="size-3.5 fill-current" />}
        Start timer
      </Button>
      <p className="mt-2 text-xs text-ink-3">Starts right away. Add details while it runs.</p>
    </WidgetCard>
  );
}

/** Sidebar card showing the live timer, or a one-click start when idle. */
export function RunningTimerWidget() {
  const { entry, project, isPending, isError, refetch } = useRunningTimer();

  if (isPending) {
    return (
      <WidgetCard busy>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-8 w-full" />
        <span className="sr-only">Loading timer</span>
      </WidgetCard>
    );
  }

  if (isError) {
    return (
      <WidgetCard>
        <p className="text-sm text-ink-2">The timer couldn&apos;t be loaded.</p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3 w-full"
          onClick={() => void refetch()}
        >
          Try again
        </Button>
      </WidgetCard>
    );
  }

  return entry ? <RunningState entry={entry} project={project} /> : <IdleState />;
}
