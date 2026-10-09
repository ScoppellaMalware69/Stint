import { Menu, Play, Square, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { OVERLAY_CLASSES } from '@/components/ui/styles';
import { DESKTOP_MEDIA_QUERY, useMediaQuery } from '@/hooks/use-media-query';
import { LiveClock } from './live-clock';
import { PrimaryNav } from './primary-nav';
import { ThemeToggle } from './theme-toggle';
import { useRunningTimer, useTimerActions } from './use-running-timer';
import { Wordmark } from './wordmark';

/** Compact timer control for the top bar: live clock chip + Stop, or Start. */
function TopBarTimerControl() {
  const { entry, isPending, isError } = useRunningTimer();
  const { start, stop, isStarting, isStopping } = useTimerActions();

  if (isPending || isError) return null;

  if (!entry) {
    return (
      <Button variant="secondary" loading={isStarting} onClick={() => void start()}>
        {isStarting ? null : <Play aria-hidden className="size-3.5 fill-current" />}
        Start
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        to="/time"
        className="inline-flex h-10 items-center gap-2 rounded-full bg-signal-soft px-3 font-mono text-sm font-medium text-ink tabular-nums"
      >
        <span aria-hidden className="size-2 shrink-0 animate-live rounded-full bg-signal" />
        <span className="sr-only">Timer running, open timer: </span>
        <LiveClock entry={entry} />
      </Link>
      <IconButton
        label="Stop timer"
        icon={Square}
        loading={isStopping}
        onClick={() => void stop()}
      />
    </div>
  );
}

/**
 * Below lg: sticky top bar with the menu button, wordmark and timer control.
 * The menu opens a left drawer (a modal dialog) that closes when the location changes.
 */
export function MobileNav() {
  const location = useLocation();
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
  // The drawer is open for the location it was opened at, so any navigation
  // (links, back/forward) closes it without an effect.
  const [openAtKey, setOpenAtKey] = useState<string | null>(null);
  const openedAtPathname = useRef<string | null>(null);
  const open = !isDesktop && openAtKey === location.key;

  const close = () => setOpenAtKey(null);

  return (
    <header className="sticky top-0 z-30 box-content flex h-14 items-center gap-1 border-b border-line bg-canvas/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur-none sm:px-4 lg:hidden">
      <Dialog.Root
        open={open}
        onOpenChange={(next) => {
          if (next) openedAtPathname.current = location.pathname;
          setOpenAtKey(next ? location.key : null);
        }}
      >
        <Dialog.Trigger asChild>
          <IconButton label="Open navigation" icon={Menu} />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className={OVERLAY_CLASSES} />
          <Dialog.Content
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              // On a new page the shell focuses its heading; don't pull focus back to the menu button.
              if (openedAtPathname.current !== location.pathname) event.preventDefault();
            }}
            className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,85vw)] flex-col border-r border-line bg-surface text-ink shadow-pop data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in"
          >
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <div className="box-content flex h-14 shrink-0 items-center justify-between border-b border-line pt-[env(safe-area-inset-top)] pr-2 pl-4">
              <Link to="/" onClick={close} className="inline-flex rounded-md">
                <Wordmark />
              </Link>
              <Dialog.Close asChild>
                <IconButton label="Close navigation" icon={X} showTooltip={false} />
              </Dialog.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
              <PrimaryNav onNavigate={close} />
            </div>
            <div className="border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <ThemeToggle />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Link to="/" className="inline-flex rounded-md px-1">
        <Wordmark />
      </Link>

      <div className="ml-auto">
        <TopBarTimerControl />
      </div>
    </header>
  );
}
