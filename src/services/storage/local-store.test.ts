import { describe, expect, it, vi } from 'vitest';
import { createEmptyDatabase } from '@/data/demo-seed';
import type { DatabaseState } from '@/domain/models';
import { ApiError } from '@/services/api/errors';
import { DEFAULT_STORAGE_KEY, LocalStore, StorageCorruptedError } from './local-store';
import { createMemoryStorage } from './memory-storage';

const KEY = 'stint:test';

function setup(initial: Record<string, string> = {}) {
  const storage = createMemoryStorage(initial);
  const seed = vi.fn(() => createEmptyDatabase('en-GB'));
  const store = new LocalStore(storage, { key: KEY, seed });
  return { storage, seed, store };
}

function stored(storage: Storage): DatabaseState {
  return JSON.parse(storage.getItem(KEY) ?? 'null') as DatabaseState;
}

function withOwner(name: string): DatabaseState {
  const db = createEmptyDatabase('en-GB');
  db.settings.ownerName = name;
  return db;
}

describe('LocalStore', () => {
  it('uses the stint:db key by default', () => {
    const store = new LocalStore(createMemoryStorage(), { seed: () => createEmptyDatabase() });
    expect(store.key).toBe(DEFAULT_STORAGE_KEY);
    expect(DEFAULT_STORAGE_KEY).toBe('stint:db');
  });

  it('seeds and persists the initial state when nothing is stored', () => {
    const { storage, seed, store } = setup();

    const first = store.read();

    expect(seed).toHaveBeenCalledTimes(1);
    expect(stored(storage)).toEqual(first);
    expect(store.read()).toBe(first);
    expect(seed).toHaveBeenCalledTimes(1);
  });

  it('loads valid stored data without seeding', () => {
    const { seed, store } = setup({ [KEY]: JSON.stringify(withOwner('Ada')) });

    expect(store.read().settings.ownerName).toBe('Ada');
    expect(seed).not.toHaveBeenCalled();
  });

  it('throws StorageCorruptedError for data that is not JSON', () => {
    const { store } = setup({ [KEY]: '{not json' });
    expect(() => store.read()).toThrow(StorageCorruptedError);
  });

  it('throws StorageCorruptedError for data that does not match the schema', () => {
    const { store } = setup({ [KEY]: JSON.stringify({ version: 1, clients: 'nope' }) });
    expect(() => store.read()).toThrow(StorageCorruptedError);
  });

  it('persists a transaction and returns the mutator result', () => {
    const { storage, store } = setup();

    const result = store.transact((draft) => {
      draft.settings.ownerName = 'Grace';
      return 42;
    });

    expect(result).toBe(42);
    expect(store.read().settings.ownerName).toBe('Grace');
    expect(stored(storage).settings.ownerName).toBe('Grace');
  });

  it('changes nothing when the mutator throws', () => {
    const { storage, store } = setup();
    const before = store.read();

    expect(() =>
      store.transact((draft) => {
        draft.settings.ownerName = 'Half-written';
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect(store.read()).toBe(before);
    expect(stored(storage).settings.ownerName).toBe('');
  });

  it('rejects a transaction that would break the schema', () => {
    const { storage, store } = setup();
    store.read();

    expect(() =>
      store.transact((draft) => {
        draft.settings.weeklyTargetHours = -5;
      }),
    ).toThrow(expect.objectContaining({ code: 'VALIDATION' }) as Error);
    expect(stored(storage).settings.weeklyTargetHours).toBe(35);
  });

  it('works on a private copy, never on the cached state', () => {
    const { store } = setup();
    const before = store.read();

    store.transact((draft) => {
      expect(draft).not.toBe(before);
      draft.settings.ownerName = 'Copy';
    });

    expect(before.settings.ownerName).toBe('');
  });

  it('replaces the whole database', () => {
    const { storage, store } = setup();
    store.read();

    store.replace(withOwner('Replaced'));

    expect(store.read().settings.ownerName).toBe('Replaced');
    expect(stored(storage).settings.ownerName).toBe('Replaced');
  });

  it('reports a full storage quota as an ApiError STORAGE and keeps the old state', () => {
    const { storage, store } = setup();
    const before = store.read();
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });

    let caught: unknown;
    try {
      store.transact((draft) => {
        draft.settings.ownerName = 'Too big';
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect(caught).toMatchObject({ code: 'STORAGE' });
    expect((caught as ApiError).message).toContain('full');
    expect(store.read()).toBe(before);
  });

  it('reports storage that cannot be accessed as an ApiError STORAGE', () => {
    const { storage, store } = setup();
    vi.spyOn(storage, 'getItem').mockImplementation(() => {
      throw new DOMException('Access denied', 'SecurityError');
    });

    expect(() => store.read()).toThrow(expect.objectContaining({ code: 'STORAGE' }) as Error);
  });

  it('picks up data written by another tab even before the storage event arrives', () => {
    const { storage, store } = setup();
    store.read();

    storage.setItem(KEY, JSON.stringify(withOwner('Other tab')));

    expect(store.read().settings.ownerName).toBe('Other tab');
  });

  it('notifies subscribers about storage events for its key only', () => {
    const { store } = setup();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }));
    expect(listener).not.toHaveBeenCalled();

    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    expect(listener).toHaveBeenCalledTimes(1);

    // A null key means the other tab cleared all storage.
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('reads fresh data after a storage event', () => {
    const { storage, store } = setup();
    store.read();
    const listener = vi.fn(() => store.read().settings.ownerName);
    store.subscribe(listener);

    storage.setItem(KEY, JSON.stringify(withOwner('Synced')));
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }));

    expect(listener).toHaveReturnedWith('Synced');
  });
});
