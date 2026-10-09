import { useEffect, useRef, type RefObject } from 'react';
import { Outlet, ScrollRestoration, useLocation, useNavigation } from 'react-router';
import type { TimeEntry } from '@/domain/models';
import { entryDurationSeconds } from '@/domain/time-entries';
import { useLiveDocumentTitle } from '@/hooks/use-document-title';
import { useNow } from '@/hooks/use-now';
import { formatClock } from '@/lib/duration';
import { MobileNav } from './mobile-nav';
import { NowTrackingBar } from './now-tracking-bar';
import { ShellContext } from './shell-context';
import { Sidebar } from './sidebar';
import { timerLabel, useRunningTimer } from './use-running-timer';

/**
 * Moves focus to the new page's heading (or <main>) after client-side navigation, so
 * keyboard and screen reader users start at the new content. Not on the initial load.
 * Scrolling is left to <ScrollRestoration>, which also restores positions on back/forward.
 */
function useFocusPageOnNavigation(mainRef: RefObject<HTMLElement | null>) {
  const { pathname } = useLocation();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;

    const main = mainRef.current;
    if (!main) return;
    const heading = main.querySelector('h1');
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    } else {
      main.focus({ preventScroll: true });
    }
  }, [pathname, mainRef]);
}

function LiveTitle({ entry, label }: { entry: TimeEntry; label: string }) {
  const now = useNow();
  useLiveDocumentTitle(`● ${formatClock(entryDurationSeconds(entry, now))} · ${label}`);
  return null;
}

/** While a timer runs the tab title shows it; the page title returns when it stops. */
function RunningTimerTitle() {
  const { entry, project } = useRunningTimer();
  return entry ? <LiveTitle entry={entry} label={timerLabel(entry, project)} /> : null;
}

/** Slim bar while a lazy page loads; delayed so quick navigations don't flash. */
function NavigationProgress() {
  const navigation = useNavigation();
  if (navigation.state !== 'loading') return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-70 h-0.5 animate-[sheet-in_8s_cubic-bezier(0.1,0.7,0.2,1)_150ms_both] bg-ink"
    />
  );
}

export function AppShell() {
  const mainRef = useRef<HTMLElement>(null);
  const navigation = useNavigation();
  useFocusPageOnNavigation(mainRef);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <a
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus();
        }}
        className="fixed top-3 left-3 z-70 -translate-y-24 rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-ink-inverse transition-transform duration-150 focus:translate-y-0"
      >
        Skip to content
      </a>
      <NavigationProgress />
      <Sidebar />
      <div className="flex min-w-0 flex-col">
        <MobileNav />
        <main
          id="main"
          ref={mainRef}
          tabIndex={-1}
          aria-busy={navigation.state === 'loading' || undefined}
          className="flex-1 focus-visible:-outline-offset-2"
        >
          <ShellContext value={true}>
            <Outlet />
          </ShellContext>
        </main>
        <NowTrackingBar />
      </div>
      <RunningTimerTitle />
      <ScrollRestoration />
    </div>
  );
}
