/**
 * The app-wide API instance. Components reach data through the query hooks in
 * `@/services/queries`, which call this object; swapping `createLocalApi` for a network
 * client implementing `StintApi` is the only change needed to move to a server.
 */
import { createDemoDatabase, createEmptyDatabase } from '@/data/demo-seed';
import { LocalStore } from '@/services/storage/local-store';
import { createLocalApi } from './local-api';
import type { StintApi } from './types';

const seedDemoData = import.meta.env.VITE_SEED_DEMO_DATA !== 'false';
const latencyMs = Math.max(0, Number(import.meta.env.VITE_SIMULATED_LATENCY_MS ?? 0) || 0);

const store = new LocalStore(browserStorage(), {
  seed: () =>
    seedDemoData ? createDemoDatabase(new Date()) : createEmptyDatabase(navigator.language),
});

export const api: StintApi = createLocalApi(store, { latencyMs });

/** Calls `listener` whenever another browser tab changes the stored data. */
export function subscribeToExternalChanges(listener: () => void): () => void {
  return store.subscribe(listener);
}

/**
 * Some privacy settings make merely reading `window.localStorage` throw. Deferring that
 * failure to each storage call lets the app render and explain the problem through the
 * normal error states instead of failing to start.
 */
function browserStorage(): Storage {
  try {
    return window.localStorage;
  } catch (error) {
    const fail = (): never => {
      throw error;
    };
    return {
      get length() {
        return fail();
      },
      clear: fail,
      getItem: fail,
      key: fail,
      removeItem: fail,
      setItem: fail,
    };
  }
}

export { ApiError, errorMessage, isApiError, type ApiErrorCode } from './errors';
export { StorageCorruptedError } from '@/services/storage/local-store';
export type { BackupFile, EntryQuery, ImportSummary, StintApi, TimerStartResult } from './types';
