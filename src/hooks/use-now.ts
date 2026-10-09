import { useSyncExternalStore } from 'react';

interface Ticker {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => number;
}

/** One ticker per interval, shared by every component, so all live clocks tick together. */
const tickers = new Map<number, Ticker>();

function createTicker(intervalMs: number): Ticker {
  const listeners = new Set<() => void>();
  let now = Date.now();
  let intervalId: number | undefined;

  const tick = () => {
    now = Date.now();
    for (const listener of listeners) listener();
  };

  // Browsers throttle timers in hidden tabs; catch up as soon as the tab is visible again.
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') tick();
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) {
        // The snapshot went stale while nobody was listening. React compares snapshots
        // right after subscribing and re-renders if this changed the value.
        now = Date.now();
        intervalId = window.setInterval(tick, intervalMs);
        document.addEventListener('visibilitychange', onVisibilityChange);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          window.clearInterval(intervalId);
          intervalId = undefined;
          document.removeEventListener('visibilitychange', onVisibilityChange);
        }
      };
    },
    getSnapshot: () => now,
  };
}

function getTicker(intervalMs: number): Ticker {
  let ticker = tickers.get(intervalMs);
  if (!ticker) {
    ticker = createTicker(intervalMs);
    tickers.set(intervalMs, ticker);
  }
  return ticker;
}

/**
 * The current time in epoch milliseconds, refreshed every `intervalMs`.
 * Use it in small leaf components (live clocks) so only they re-render on each tick.
 */
export function useNow(intervalMs = 1000): number {
  const ticker = getTicker(intervalMs);
  return useSyncExternalStore(ticker.subscribe, ticker.getSnapshot, ticker.getSnapshot);
}
