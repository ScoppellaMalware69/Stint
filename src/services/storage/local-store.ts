/**
 * Persists the whole database as one JSON document in a `Storage` area (localStorage in
 * the app). Every write is all-or-nothing: the mutator works on a private copy, the
 * result is validated against the schema, and only a valid state is saved and cached.
 */
import { z } from 'zod';
import { databaseSchema, type DatabaseState } from '@/domain/models';
import { ApiError } from '@/services/api/errors';

export const DEFAULT_STORAGE_KEY = 'stint:db';

/** The stored data exists but is not valid JSON or does not match the schema. */
export class StorageCorruptedError extends Error {
  override name = 'StorageCorruptedError';

  constructor(options?: ErrorOptions) {
    super(
      'The data saved in this browser is damaged and could not be loaded. Import a backup or reset the data to continue.',
      options,
    );
  }
}

export interface LocalStoreOptions {
  /** Storage key holding the database. Defaults to `stint:db`. */
  key?: string;
  /** Creates the initial database when nothing has been stored yet. */
  seed: () => DatabaseState;
}

export class LocalStore {
  readonly key: string;
  readonly #storage: Storage;
  readonly #seed: () => DatabaseState;
  readonly #listeners = new Set<() => void>();
  #cache: DatabaseState | null = null;
  /**
   * The exact string the cache was read from or written as. Comparing it with the
   * stored string detects writes made elsewhere (another tab, devtools, a cleared
   * storage area) without paying for JSON parsing and validation on every read.
   */
  #cacheRaw: string | null = null;

  constructor(storage: Storage, options: LocalStoreOptions) {
    this.#storage = storage;
    this.key = options.key ?? DEFAULT_STORAGE_KEY;
    this.#seed = options.seed;
  }

  /** The current database. Treat it as read-only: it is the shared cached copy. */
  read(): DatabaseState {
    const raw = this.#getRaw();
    if (this.#cache !== null && raw === this.#cacheRaw) return this.#cache;

    if (raw === null) {
      const seeded = validate(this.#seed());
      this.#commit(seeded);
      return seeded;
    }

    this.#cache = parseStored(raw);
    this.#cacheRaw = raw;
    return this.#cache;
  }

  /**
   * Applies `mutator` to a private copy of the database, validates the result and
   * persists it. If the mutator throws or the result is invalid, nothing changes.
   */
  transact<T>(mutator: (draft: DatabaseState) => T): T {
    const draft = structuredClone(this.read());
    const result = mutator(draft);
    this.#commit(validate(draft));
    return result;
  }

  /** Replaces the whole database (imports, resets). */
  replace(state: DatabaseState): void {
    this.#commit(validate(state));
  }

  /** Calls `listener` when another tab changes the stored data. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    this.#listeners.add(listener);
    if (this.#listeners.size === 1) window.addEventListener('storage', this.#handleStorageEvent);
    return () => {
      if (!this.#listeners.delete(listener)) return;
      if (this.#listeners.size === 0) {
        window.removeEventListener('storage', this.#handleStorageEvent);
      }
    };
  }

  readonly #handleStorageEvent = (event: StorageEvent): void => {
    // A null key means the other tab cleared the whole storage area.
    if (event.key !== null && event.key !== this.key) return;
    if (event.storageArea !== null && event.storageArea !== this.#storage) return;
    this.#cache = null;
    this.#cacheRaw = null;
    for (const listener of [...this.#listeners]) listener();
  };

  #commit(state: DatabaseState): void {
    const raw = JSON.stringify(state);
    try {
      this.#storage.setItem(this.key, raw);
    } catch (error) {
      if (isQuotaExceededError(error)) {
        throw new ApiError(
          'STORAGE',
          'Browser storage is full. Export a backup, then delete old entries or invoices to free up space.',
          undefined,
          { cause: error },
        );
      }
      throw storageUnavailableError(error);
    }
    this.#cache = state;
    this.#cacheRaw = raw;
  }

  #getRaw(): string | null {
    try {
      return this.#storage.getItem(this.key);
    } catch (error) {
      throw storageUnavailableError(error);
    }
  }
}

function parseStored(raw: string): DatabaseState {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new StorageCorruptedError({ cause: error });
  }
  const result = databaseSchema.safeParse(json);
  if (!result.success) throw new StorageCorruptedError({ cause: result.error });
  return result.data;
}

/**
 * Inputs are validated before they reach the store, so a failure here means a change
 * would break the data as a whole (for example an amount above the supported maximum).
 */
function validate(state: DatabaseState): DatabaseState {
  const result = databaseSchema.safeParse(state);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const detail = issue ? ` (${z.core.toDotPath(issue.path)}: ${issue.message})` : '';
  throw new ApiError(
    'VALIDATION',
    `This change would leave your data in an invalid state, so it was not saved${detail}.`,
    undefined,
    { cause: result.error },
  );
}

function isQuotaExceededError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { name, code } = error as { name?: unknown; code?: unknown };
  // Legacy code 22 covers older WebKit; Firefox used its own name before standardising.
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || code === 22;
}

function storageUnavailableError(cause: unknown): ApiError {
  return new ApiError(
    'STORAGE',
    "Stint can't access this browser's storage. Allow site data for this page, then reload.",
    undefined,
    { cause },
  );
}
