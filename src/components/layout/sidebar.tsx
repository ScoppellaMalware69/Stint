import { Link } from 'react-router';
import { PrimaryNav } from './primary-nav';
import { RunningTimerWidget } from './running-timer-widget';
import { ThemeToggle } from './theme-toggle';
import { Wordmark } from './wordmark';

/** Desktop (≥ lg) sidebar: sticky, full height, timer pinned to the bottom. */
export function Sidebar() {
  return (
    <div className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-canvas lg:flex">
      <div className="px-5 pt-6 pb-5">
        <Link to="/" className="inline-flex rounded-md">
          <Wordmark />
        </Link>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4">
        <PrimaryNav />
        <ThemeToggle className="px-3" />
      </div>
      <div className="border-t border-line p-3">
        <RunningTimerWidget />
      </div>
    </div>
  );
}
