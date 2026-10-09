import { Square } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useMatch } from 'react-router';
import { Button } from '@/components/ui/button';
import { ColorDot } from '@/components/ui/color-dot';
import type { Project, TimeEntry } from '@/domain/models';
import { DESKTOP_MEDIA_QUERY, useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/cn';
import { LiveClock } from './live-clock';
import { useRunningTimer, useTimerActions } from './use-running-timer';

/** Bar height (4rem) + hairline + 16px gap, so toasts sit just above the bar. */
const TOAST_OFFSET = 'calc(5rem + 1px + env(safe-area-inset-bottom, 0px))';

function NowTrackingBarContent({ entry, project }: { entry: TimeEntry; project: Project | null }) {
  const { stop, isStopping } = useTimerActions();
  const description = entry.description.trim();

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--toast-offset', TOAST_OFFSET);
    return () => {
      root.style.removeProperty('--toast-offset');
    };
  }, []);

  return (
    <>
      {/* Reserves room in the page flow so the fixed bar never covers the end of the page. */}
      <div aria-hidden className="h-[calc(4rem+env(safe-area-inset-bottom,0px))] shrink-0" />
      <section
        aria-label="Now tracking"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <span aria-hidden className="size-2.5 shrink-0 animate-live rounded-full bg-signal" />
          <Link to="/time" className="min-w-0 flex-1 rounded-md">
            <span className="sr-only">Now tracking: </span>
            <span
              className={cn(
                'block truncate text-sm font-medium',
                description ? 'text-ink' : 'text-ink-3',
              )}
            >
              {description || 'No description'}
            </span>
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-ink-2">
              {project ? <ColorDot color={project.color} size="sm" /> : null}
              <span className="truncate">{project ? project.name : 'No project'}</span>
            </span>
          </Link>
          <span className="font-mono text-base font-medium text-ink tabular-nums">
            <span className="sr-only">Elapsed time: </span>
            <LiveClock entry={entry} />
          </span>
          <Button
            variant="primary"
            loading={isStopping}
            onClick={() => void stop()}
            aria-label="Stop timer"
          >
            {isStopping ? null : <Square aria-hidden className="size-3.5 fill-current" />}
            Stop
          </Button>
        </div>
      </section>
    </>
  );
}

/** Below lg, a fixed bottom bar keeps a running timer in reach on every page except Time. */
export function NowTrackingBar() {
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
  const onTimePage = useMatch('/time') !== null;
  const { entry, project } = useRunningTimer();

  if (isDesktop || onTimePage || !entry) return null;
  return <NowTrackingBarContent entry={entry} project={project} />;
}
