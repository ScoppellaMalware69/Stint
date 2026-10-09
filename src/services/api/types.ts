/**
 * The contract between the UI and the data layer.
 *
 * The UI only ever talks to an object implementing `StintApi`. Today that object is
 * backed by the browser's localStorage (see `local-api.ts`); a REST or GraphQL client
 * implementing the same interface could replace it without touching any component.
 * Every method is async, exactly as it would be over a network.
 */
import type {
  Client,
  ClientInput,
  DatabaseState,
  Invoice,
  InvoiceCreateInput,
  InvoiceDetailsInput,
  InvoiceStatus,
  Project,
  ProjectInput,
  RunningEntryPatch,
  Settings,
  TimeEntry,
  TimeEntryInput,
  TimerStartInput,
} from '@/domain/models';

/** Filters for listing time entries. All fields are optional and combined with AND. */
export interface EntryQuery {
  /** ISO timestamp. Only entries whose `start` is at or after this instant. */
  from?: string;
  /** ISO timestamp. Only entries whose `start` is strictly before this instant. */
  to?: string;
  /** Only entries for these projects. Use `null` inside the array for "no project". */
  projectIds?: (string | null)[];
  /** Only entries whose project belongs to this client. */
  clientId?: string;
  /** Only billable (`true`) or non-billable (`false`) entries. */
  billable?: boolean;
  /** Only invoiced (`true`) or not-yet-invoiced (`false`) entries. */
  invoiced?: boolean;
  /** Whether to include the running timer entry. Defaults to `true`. */
  includeRunning?: boolean;
  /** Case-insensitive substring match on the description. */
  search?: string;
}

export interface TimerStartResult {
  started: TimeEntry;
  /** The entry that was running before, if starting stopped it. */
  stopped: TimeEntry | null;
}

export interface BackupFile {
  app: 'stint';
  format: 1;
  exportedAt: string;
  data: DatabaseState;
}

export interface ImportSummary {
  clients: number;
  projects: number;
  entries: number;
  invoices: number;
}

export interface StintApi {
  settings: {
    get(): Promise<Settings>;
    update(patch: Partial<Settings>): Promise<Settings>;
  };
  clients: {
    /** All clients (archived included), sorted by name. */
    list(): Promise<Client[]>;
    get(id: string): Promise<Client>;
    create(input: ClientInput): Promise<Client>;
    update(id: string, input: ClientInput): Promise<Client>;
    setArchived(id: string, archived: boolean): Promise<Client>;
    /** Fails with CONFLICT while projects or invoices reference the client. */
    remove(id: string): Promise<void>;
  };
  projects: {
    /** All projects (archived included), sorted by name. */
    list(): Promise<Project[]>;
    get(id: string): Promise<Project>;
    create(input: ProjectInput): Promise<Project>;
    update(id: string, input: ProjectInput): Promise<Project>;
    setArchived(id: string, archived: boolean): Promise<Project>;
    /** Fails with CONFLICT while time entries reference the project. */
    remove(id: string): Promise<void>;
  };
  entries: {
    /** Matching entries sorted by `start`, newest first. */
    list(query?: EntryQuery): Promise<TimeEntry[]>;
    get(id: string): Promise<TimeEntry>;
    create(input: TimeEntryInput): Promise<TimeEntry>;
    /** Fails with LOCKED if the entry belongs to an invoice. */
    update(id: string, input: TimeEntryInput): Promise<TimeEntry>;
    /** Fails with LOCKED if invoiced. Returns the removed entry so the UI can offer undo. */
    remove(id: string): Promise<TimeEntry>;
    /** Re-inserts an entry returned by `remove` (undo). */
    restore(entry: TimeEntry): Promise<TimeEntry>;
    /** Copies an entry (same details and length), placed right after the original. */
    duplicate(id: string): Promise<TimeEntry>;
  };
  timer: {
    getRunning(): Promise<TimeEntry | null>;
    /** Starts a timer now. Any running timer is stopped first, atomically. */
    start(input: TimerStartInput): Promise<TimerStartResult>;
    /** Stops the running timer. Resolves to `null` if nothing was running. */
    stop(): Promise<TimeEntry | null>;
    /** Edits the running entry (description, project, billable, start time). */
    updateRunning(patch: RunningEntryPatch): Promise<TimeEntry>;
    /** Deletes the running entry without saving it. */
    discard(): Promise<void>;
  };
  invoices: {
    /** All invoices sorted by issue date, newest first. */
    list(): Promise<Invoice[]>;
    get(id: string): Promise<Invoice>;
    /** Creates a draft from invoiceable entries and marks those entries as invoiced. */
    create(input: InvoiceCreateInput): Promise<Invoice>;
    /** Drafts only. */
    updateDetails(id: string, input: InvoiceDetailsInput): Promise<Invoice>;
    /** Allowed: draft→sent, sent→paid, sent→draft, paid→sent. */
    setStatus(id: string, status: InvoiceStatus): Promise<Invoice>;
    /** Drafts only. Releases the entries so they can be invoiced again. */
    remove(id: string): Promise<void>;
    /** The number the next invoice issued on `issueDate` (YYYY-MM-DD) would get. */
    previewNumber(issueDate: string): Promise<string>;
  };
  data: {
    exportBackup(): Promise<BackupFile>;
    /** Validates an untrusted backup (schema + referential integrity), then replaces all data. */
    importBackup(file: unknown): Promise<ImportSummary>;
    /** Replaces all data with freshly generated demo data. */
    resetToDemo(): Promise<void>;
    /** Deletes every client, project, entry and invoice and restores default settings. */
    clearAll(): Promise<void>;
  };
}
