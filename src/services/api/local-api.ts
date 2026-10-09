/**
 * `StintApi` backed by a `LocalStore`. This is the single place where business rules are
 * enforced, so the UI cannot put the data into an invalid state even if a form forgets a
 * check. Every method validates its input, works on the store atomically and returns a
 * private deep copy, exactly as a network API would.
 */
import { z } from 'zod';
import { createDemoDatabase, createEmptyDatabase } from '@/data/demo-seed';
import { createBillingContext, isInvoiceable, type BillingContext } from '@/domain/billing';
import { findIntegrityIssues } from '@/domain/integrity';
import { buildInvoiceLines, canTransition, nextInvoiceNumber } from '@/domain/invoices';
import {
  clientInputSchema,
  databaseSchema,
  dateKeySchema,
  idSchema,
  INVOICE_STATUSES,
  invoiceCreateInputSchema,
  invoiceDetailsInputSchema,
  projectInputSchema,
  runningEntryPatchSchema,
  settingsSchema,
  timeEntryInputSchema,
  timeEntrySchema,
  timerStartInputSchema,
  timestampSchema,
  type Client,
  type DatabaseState,
  type Invoice,
  type InvoiceParty,
  type Project,
  type TimeEntry,
} from '@/domain/models';
import { MAX_MANUAL_ENTRY_SECONDS } from '@/domain/time-entries';
import { createId } from '@/lib/id';
import type { LocalStore } from '@/services/storage/local-store';
import { ApiError } from './errors';
import type { BackupFile, ImportSummary, StintApi, TimerStartResult } from './types';

export interface LocalApiOptions {
  /** Artificial delay before every call resolves, to exercise loading states. */
  latencyMs?: number;
  /** Clock used for timestamps and "in the future" checks. */
  now?: () => Date;
}

/** Manual entries may end slightly after "now" so a form submitted on the minute is accepted. */
const FUTURE_TOLERANCE_MS = 60_000;
const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const BACKUP_FORMAT = 1;
const MAX_REPORTED_ISSUES = 3;

const settingsPatchSchema = settingsSchema.partial();
const invoiceStatusSchema = z.enum(INVOICE_STATUSES);
const entryQuerySchema = z.object({
  from: timestampSchema.optional(),
  to: timestampSchema.optional(),
  projectIds: z.array(idSchema.nullable()).optional(),
  clientId: idSchema.optional(),
  billable: z.boolean().optional(),
  invoiced: z.boolean().optional(),
  includeRunning: z.boolean().optional(),
  search: z.string().max(200).optional(),
});

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

export function createLocalApi(store: LocalStore, options: LocalApiOptions = {}): StintApi {
  const { latencyMs = 0, now = () => new Date() } = options;

  /** Runs an operation after the simulated latency and hands back a private copy of its result. */
  async function run<T>(operation: () => T): Promise<T> {
    if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs));
    return structuredClone(operation());
  }

  return {
    settings: {
      get: () => run(() => store.read().settings),
      update: (patch) =>
        run(() => {
          const data = withoutUndefined(parseInput(settingsPatchSchema, patch));
          return store.transact((db) => {
            db.settings = { ...db.settings, ...data };
            return db.settings;
          });
        }),
    },

    clients: {
      list: () => run(() => [...store.read().clients].sort(byName)),
      get: (id) => run(() => findClient(store.read(), id)),
      create: (input) =>
        run(() => {
          const data = parseInput(clientInputSchema, input);
          const stamp = now().toISOString();
          return store.transact((db) => {
            const client: Client = {
              id: createId(),
              ...data,
              archived: false,
              createdAt: stamp,
              updatedAt: stamp,
            };
            db.clients.push(client);
            return client;
          });
        }),
      update: (id, input) =>
        run(() => {
          const data = parseInput(clientInputSchema, input);
          const stamp = now().toISOString();
          return store.transact((db) => {
            const client = findClient(db, id);
            Object.assign(client, data, { updatedAt: stamp });
            return client;
          });
        }),
      setArchived: (id, archived) =>
        run(() => {
          assertBoolean(archived, 'archived');
          const stamp = now().toISOString();
          return store.transact((db) => {
            const client = findClient(db, id);
            client.archived = archived;
            client.updatedAt = stamp;
            return client;
          });
        }),
      remove: (id) =>
        run(() => {
          store.transact((db) => {
            findClient(db, id);
            if (db.projects.some((project) => project.clientId === id)) {
              throw new ApiError(
                'CONFLICT',
                'This client still has projects. Archive the client instead, or delete its projects first.',
              );
            }
            if (db.invoices.some((invoice) => invoice.clientId === id)) {
              throw new ApiError(
                'CONFLICT',
                "This client has invoices, so it can't be deleted. Archive it instead.",
              );
            }
            db.clients = db.clients.filter((client) => client.id !== id);
          });
        }),
    },

    projects: {
      list: () => run(() => [...store.read().projects].sort(byName)),
      get: (id) => run(() => findProject(store.read(), id)),
      create: (input) =>
        run(() => {
          const data = parseInput(projectInputSchema, input);
          const stamp = now().toISOString();
          return store.transact((db) => {
            assertClientExists(db, data.clientId);
            const project: Project = {
              id: createId(),
              ...data,
              // Time on a project without a client can never be billed.
              billableByDefault: data.clientId !== null && data.billableByDefault,
              archived: false,
              createdAt: stamp,
              updatedAt: stamp,
            };
            db.projects.push(project);
            return project;
          });
        }),
      update: (id, input) =>
        run(() => {
          const data = parseInput(projectInputSchema, input);
          const stamp = now().toISOString();
          return store.transact((db) => {
            const project = findProject(db, id);
            assertClientExists(db, data.clientId);
            Object.assign(project, data, {
              billableByDefault: data.clientId !== null && data.billableByDefault,
              updatedAt: stamp,
            });
            return project;
          });
        }),
      setArchived: (id, archived) =>
        run(() => {
          assertBoolean(archived, 'archived');
          const stamp = now().toISOString();
          return store.transact((db) => {
            const project = findProject(db, id);
            project.archived = archived;
            project.updatedAt = stamp;
            return project;
          });
        }),
      remove: (id) =>
        run(() => {
          store.transact((db) => {
            findProject(db, id);
            if (db.entries.some((entry) => entry.projectId === id)) {
              throw new ApiError(
                'CONFLICT',
                "This project has time entries, so it can't be deleted. Archive it instead to hide it from pickers.",
              );
            }
            db.projects = db.projects.filter((project) => project.id !== id);
          });
        }),
    },

    entries: {
      list: (query = {}) =>
        run(() => {
          const filters = parseInput(entryQuerySchema, query);
          const db = store.read();
          const from = filters.from === undefined ? null : Date.parse(filters.from);
          const to = filters.to === undefined ? null : Date.parse(filters.to);
          const projectIds = filters.projectIds === undefined ? null : new Set(filters.projectIds);
          const clientProjectIds =
            filters.clientId === undefined
              ? null
              : new Set(
                  db.projects
                    .filter((project) => project.clientId === filters.clientId)
                    .map((project) => project.id),
                );
          const search = filters.search?.toLocaleLowerCase() ?? '';

          return db.entries
            .filter((entry) => {
              const start = Date.parse(entry.start);
              if (from !== null && start < from) return false;
              if (to !== null && start >= to) return false;
              if (projectIds !== null && !projectIds.has(entry.projectId)) return false;
              if (
                clientProjectIds !== null &&
                (entry.projectId === null || !clientProjectIds.has(entry.projectId))
              ) {
                return false;
              }
              if (filters.billable !== undefined && entry.billable !== filters.billable) {
                return false;
              }
              if (
                filters.invoiced !== undefined &&
                (entry.invoiceId !== null) !== filters.invoiced
              ) {
                return false;
              }
              if (filters.includeRunning === false && entry.end === null) return false;
              return search === '' || entry.description.toLocaleLowerCase().includes(search);
            })
            .sort(byStartDescending);
        }),
      get: (id) => run(() => findEntry(store.read(), id)),
      create: (input) =>
        run(() => {
          const data = parseInput(timeEntryInputSchema, input);
          const current = now();
          const start = Date.parse(data.start);
          const end = Date.parse(data.end);
          assertManualTimes(start, end, current.getTime(), true);
          const stamp = current.toISOString();
          return store.transact((db) => {
            assertProjectExists(db, data.projectId);
            const entry: TimeEntry = {
              id: createId(),
              description: data.description,
              projectId: data.projectId,
              start: toIso(start),
              end: toIso(end),
              billable: resolveBillable(db, data.projectId, data.billable),
              invoiceId: null,
              createdAt: stamp,
              updatedAt: stamp,
            };
            db.entries.push(entry);
            return entry;
          });
        }),
      update: (id, input) =>
        run(() => {
          const data = parseInput(timeEntryInputSchema, input);
          const current = now();
          const start = Date.parse(data.start);
          const end = Date.parse(data.end);
          return store.transact((db) => {
            const entry = findEntry(db, id);
            assertNotInvoiced(db, entry);
            // Length and "future" limits apply to new times only, so an existing long timer
            // entry can still get a new description without first fixing its times.
            const timesChanged =
              entry.end === null ||
              start !== Date.parse(entry.start) ||
              end !== Date.parse(entry.end);
            assertManualTimes(start, end, current.getTime(), timesChanged);
            assertProjectExists(db, data.projectId);
            Object.assign(entry, {
              description: data.description,
              projectId: data.projectId,
              start: toIso(start),
              end: toIso(end),
              billable: resolveBillable(db, data.projectId, data.billable),
              updatedAt: current.toISOString(),
            });
            return entry;
          });
        }),
      remove: (id) =>
        run(() =>
          store.transact((db) => {
            const entry = findEntry(db, id);
            assertNotInvoiced(db, entry);
            db.entries = db.entries.filter((candidate) => candidate.id !== id);
            return entry;
          }),
        ),
      restore: (entry) =>
        run(() => {
          const parsed = timeEntrySchema.safeParse(entry);
          if (!parsed.success) throw fromZodError(parsed.error);
          const data = parsed.data;
          if (data.end !== null && Date.parse(data.end) <= Date.parse(data.start)) {
            throw fieldError('end', 'End time must be after the start time.');
          }
          const stamp = now().toISOString();
          return store.transact((db) => {
            if (db.entries.some((candidate) => candidate.id === data.id)) {
              throw new ApiError('CONFLICT', 'This entry already exists, so it was not restored.');
            }
            if (data.projectId !== null && !db.projects.some((p) => p.id === data.projectId)) {
              throw new ApiError(
                'CONFLICT',
                "This entry can't be restored because its project has been deleted.",
              );
            }
            if (data.end === null && db.entries.some((candidate) => candidate.end === null)) {
              throw new ApiError(
                'CONFLICT',
                'Another timer is running. Stop it before restoring this one.',
              );
            }
            const restored: TimeEntry = {
              ...data,
              billable: resolveBillable(db, data.projectId, data.billable),
              // Removal is only possible for entries that were not invoiced.
              invoiceId: null,
              updatedAt: stamp,
            };
            db.entries.push(restored);
            return restored;
          });
        }),
      duplicate: (id) =>
        run(() => {
          const stamp = now().toISOString();
          return store.transact((db) => {
            const source = findEntry(db, id);
            if (source.end === null) {
              throw new ApiError('CONFLICT', 'Stop the timer before duplicating this entry.');
            }
            const start = Date.parse(source.start);
            const end = Date.parse(source.end);
            const copy: TimeEntry = {
              id: createId(),
              description: source.description,
              projectId: source.projectId,
              start: toIso(end),
              end: toIso(end + (end - start)),
              billable: resolveBillable(db, source.projectId, source.billable),
              invoiceId: null,
              createdAt: stamp,
              updatedAt: stamp,
            };
            db.entries.push(copy);
            return copy;
          });
        }),
    },

    timer: {
      getRunning: () => run(() => findRunning(store.read()) ?? null),
      start: (input) =>
        run(() => {
          const data = parseInput(timerStartInputSchema, input);
          const current = now();
          const at = truncateToSecond(current);
          const stamp = current.toISOString();
          return store.transact((db): TimerStartResult => {
            assertProjectExists(db, data.projectId);
            let stopped: TimeEntry | null = null;
            for (const entry of db.entries) {
              if (entry.end !== null) continue;
              stopEntry(entry, at, stamp);
              stopped ??= entry;
            }
            const started: TimeEntry = {
              id: createId(),
              description: data.description,
              projectId: data.projectId,
              start: toIso(at),
              end: null,
              billable: resolveBillable(db, data.projectId, data.billable),
              invoiceId: null,
              createdAt: stamp,
              updatedAt: stamp,
            };
            db.entries.push(started);
            return { started, stopped };
          });
        }),
      stop: () =>
        run(() => {
          if (findRunning(store.read()) === undefined) return null;
          const current = now();
          return store.transact((db) => {
            const running = findRunning(db);
            if (running === undefined) return null;
            stopEntry(running, truncateToSecond(current), current.toISOString());
            return running;
          });
        }),
      updateRunning: (patch) =>
        run(() => {
          const data = parseInput(runningEntryPatchSchema, patch);
          const current = now();
          return store.transact((db) => {
            const running = findRunning(db);
            if (running === undefined) throw new ApiError('NOT_FOUND', 'No timer is running.');
            if (data.start !== undefined) {
              const start = Date.parse(data.start);
              if (start > current.getTime()) {
                throw fieldError('start', "Start time can't be in the future.");
              }
              running.start = toIso(start);
            }
            if (data.projectId !== undefined) {
              assertProjectExists(db, data.projectId);
              running.projectId = data.projectId;
            }
            if (data.description !== undefined) running.description = data.description;
            running.billable = resolveBillable(
              db,
              running.projectId,
              data.billable ?? running.billable,
            );
            running.updatedAt = current.toISOString();
            return running;
          });
        }),
      discard: () =>
        run(() => {
          if (findRunning(store.read()) === undefined) return;
          store.transact((db) => {
            db.entries = db.entries.filter((entry) => entry.end !== null);
          });
        }),
    },

    invoices: {
      list: () => run(() => [...store.read().invoices].sort(byIssueDateDescending)),
      get: (id) => run(() => findInvoice(store.read(), id)),
      create: (input) =>
        run(() => {
          const data = parseInput(invoiceCreateInputSchema, input);
          assertDueAfterIssue(data.issueDate, data.dueDate);
          if (data.periodStart !== null && data.periodEnd !== null) {
            if (data.periodEnd < data.periodStart) {
              throw fieldError('periodEnd', "The period can't end before it starts.");
            }
          }
          const stamp = now().toISOString();
          return store.transact((db) => {
            const client = db.clients.find((candidate) => candidate.id === data.clientId);
            if (client === undefined) {
              throw fieldError('clientId', 'The selected client no longer exists.');
            }
            const billing = createBillingContext(db.settings, db.projects, db.clients);
            const entries = selectInvoiceEntries(db, billing, client, data.entryIds);
            const invoiceId = createId();
            const lines = buildInvoiceLines(entries, billing).map((line) => ({
              ...line,
              id: createId(),
            }));
            if (lines.length === 0) {
              throw fieldError('entryIds', 'Select at least one billable time entry.');
            }
            const { settings } = db;
            const invoice: Invoice = {
              id: invoiceId,
              number: nextInvoiceNumber(
                db.invoices,
                settings.invoicePrefix,
                yearOfDateKey(data.issueDate),
              ),
              clientId: client.id,
              status: 'draft',
              issueDate: data.issueDate,
              dueDate: data.dueDate,
              periodStart: data.periodStart,
              periodEnd: data.periodEnd,
              currency: settings.currency,
              from: businessParty(db),
              billTo: clientParty(client),
              lines,
              taxRateBps: data.taxRateBps,
              rounding: {
                incrementMinutes: settings.roundingIncrementMinutes,
                mode: settings.roundingMode,
              },
              notes: data.notes,
              sentAt: null,
              paidAt: null,
              createdAt: stamp,
              updatedAt: stamp,
            };
            db.invoices.push(invoice);
            const invoicedIds = new Set(lines.flatMap((line) => line.entryIds));
            for (const entry of db.entries) {
              if (!invoicedIds.has(entry.id)) continue;
              entry.invoiceId = invoiceId;
              entry.updatedAt = stamp;
            }
            return invoice;
          });
        }),
      updateDetails: (id, input) =>
        run(() => {
          const data = parseInput(invoiceDetailsInputSchema, input);
          assertDueAfterIssue(data.issueDate, data.dueDate);
          const stamp = now().toISOString();
          return store.transact((db) => {
            const invoice = findInvoice(db, id);
            assertDraft(invoice, 'edited');
            Object.assign(invoice, data, { updatedAt: stamp });
            return invoice;
          });
        }),
      setStatus: (id, status) =>
        run(() => {
          const parsed = invoiceStatusSchema.safeParse(status);
          if (!parsed.success) throw fieldError('status', 'Choose a valid invoice status.');
          const target = parsed.data;
          const stamp = now().toISOString();
          return store.transact((db) => {
            const invoice = findInvoice(db, id);
            if (invoice.status === target) return invoice;
            if (!canTransition(invoice.status, target)) {
              throw new ApiError(
                'CONFLICT',
                `A ${invoice.status} invoice can't be marked as ${target}.`,
              );
            }
            switch (target) {
              case 'sent':
                // Moving back from paid keeps the original sending date.
                if (invoice.status === 'draft' || invoice.sentAt === null) invoice.sentAt = stamp;
                invoice.paidAt = null;
                break;
              case 'paid':
                invoice.sentAt ??= stamp;
                invoice.paidAt = stamp;
                break;
              case 'draft':
                invoice.sentAt = null;
                invoice.paidAt = null;
                break;
            }
            invoice.status = target;
            invoice.updatedAt = stamp;
            return invoice;
          });
        }),
      remove: (id) =>
        run(() => {
          const stamp = now().toISOString();
          store.transact((db) => {
            const invoice = findInvoice(db, id);
            assertDraft(invoice, 'deleted');
            db.invoices = db.invoices.filter((candidate) => candidate.id !== id);
            for (const entry of db.entries) {
              if (entry.invoiceId !== id) continue;
              entry.invoiceId = null;
              entry.updatedAt = stamp;
            }
          });
        }),
      previewNumber: (issueDate) =>
        run(() => {
          const parsed = dateKeySchema.safeParse(issueDate);
          if (!parsed.success) throw fieldError('issueDate', 'Enter a valid issue date.');
          const db = store.read();
          return nextInvoiceNumber(
            db.invoices,
            db.settings.invoicePrefix,
            yearOfDateKey(parsed.data),
          );
        }),
    },

    data: {
      exportBackup: () =>
        run((): BackupFile => ({
          app: 'stint',
          format: BACKUP_FORMAT,
          exportedAt: now().toISOString(),
          data: store.read(),
        })),
      importBackup: (file) =>
        run((): ImportSummary => {
          const data = parseBackup(file);
          store.replace(data);
          return {
            clients: data.clients.length,
            projects: data.projects.length,
            entries: data.entries.length,
            invoices: data.invoices.length,
          };
        }),
      resetToDemo: () =>
        run(() => {
          store.replace(createDemoDatabase(now()));
        }),
      clearAll: () =>
        run(() => {
          store.replace(createEmptyDatabase(browserLocale()));
        }),
    },
  };
}

/* ---------- Validation ---------- */

type FieldErrors = Record<string, string[]>;

function validationError(message: string, fieldErrors?: FieldErrors): ApiError {
  return new ApiError('VALIDATION', message, fieldErrors);
}

function fieldError(field: string, message: string): ApiError {
  return validationError(message, { [field]: [message] });
}

function fromZodError(error: z.ZodError): ApiError {
  const flattened: Partial<Record<string, string[]>> = z.flattenError(error).fieldErrors;
  const fieldErrors: FieldErrors = {};
  for (const [field, messages] of Object.entries(flattened)) {
    if (messages !== undefined && messages.length > 0) fieldErrors[field] = messages;
  }
  return validationError(error.issues[0]?.message ?? 'Check the highlighted fields.', fieldErrors);
}

/** Validates an input object after normalising it the way forms submit values. */
function parseInput<Schema extends z.ZodObject>(schema: Schema, input: unknown): z.output<Schema> {
  const result = schema.safeParse(normalizeInput(schema, input));
  if (!result.success) throw fromZodError(result.error);
  return result.data;
}

/** Trims text values and turns blank text into `null` for fields that accept `null`. */
function normalizeInput(schema: z.ZodObject, input: unknown): unknown {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return input;
  const shape = schema.shape as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).map(([key, value]) => {
      if (typeof value !== 'string') return [key, value];
      const text = value.trim();
      const field = shape[key];
      const blankToNull =
        text === '' && field instanceof z.ZodType && field.safeParse(null).success;
      return [key, blankToNull ? null : text];
    }),
  );
}

function withoutUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  ) as Partial<T>;
}

function assertBoolean(value: unknown, field: string): asserts value is boolean {
  if (typeof value !== 'boolean') throw fieldError(field, 'Expected true or false.');
}

function assertManualTimes(start: number, end: number, nowMs: number, checkLimits: boolean): void {
  const errors: FieldErrors = {};
  const add = (field: 'start' | 'end', message: string) => {
    (errors[field] ??= []).push(message);
  };
  if (end <= start) {
    add('end', 'End time must be after the start time.');
  } else if (checkLimits && end - start > MAX_MANUAL_ENTRY_SECONDS * 1000) {
    add('end', "An entry can't be longer than 24 hours.");
  }
  if (checkLimits) {
    const latest = nowMs + FUTURE_TOLERANCE_MS;
    if (start > latest) add('start', "Start time can't be in the future.");
    if (end > latest && errors.end === undefined) add('end', "End time can't be in the future.");
  }
  const first = errors.end?.[0] ?? errors.start?.[0];
  if (first !== undefined) throw validationError(first, errors);
}

function assertDueAfterIssue(issueDate: string, dueDate: string): void {
  if (dueDate < issueDate)
    throw fieldError('dueDate', "The due date can't be before the issue date.");
}

/* ---------- Lookups and rules ---------- */

function notFound(what: string): ApiError {
  return new ApiError('NOT_FOUND', `${what} not found. It may have been deleted.`);
}

function findClient(db: DatabaseState, id: string): Client {
  const client = db.clients.find((candidate) => candidate.id === id);
  if (client === undefined) throw notFound('Client');
  return client;
}

function findProject(db: DatabaseState, id: string): Project {
  const project = db.projects.find((candidate) => candidate.id === id);
  if (project === undefined) throw notFound('Project');
  return project;
}

function findEntry(db: DatabaseState, id: string): TimeEntry {
  const entry = db.entries.find((candidate) => candidate.id === id);
  if (entry === undefined) throw notFound('Time entry');
  return entry;
}

function findInvoice(db: DatabaseState, id: string): Invoice {
  const invoice = db.invoices.find((candidate) => candidate.id === id);
  if (invoice === undefined) throw notFound('Invoice');
  return invoice;
}

function findRunning(db: DatabaseState): TimeEntry | undefined {
  return db.entries.find((entry) => entry.end === null);
}

function assertClientExists(db: DatabaseState, clientId: string | null): void {
  if (clientId !== null && !db.clients.some((client) => client.id === clientId)) {
    throw fieldError('clientId', 'The selected client no longer exists.');
  }
}

function assertProjectExists(db: DatabaseState, projectId: string | null): void {
  if (projectId !== null && !db.projects.some((project) => project.id === projectId)) {
    throw fieldError('projectId', 'The selected project no longer exists.');
  }
}

/** Only time on a project that has a client can be billed. */
function resolveBillable(db: DatabaseState, projectId: string | null, requested: boolean): boolean {
  if (!requested || projectId === null) return false;
  const project = db.projects.find((candidate) => candidate.id === projectId);
  return project !== undefined && project.clientId !== null;
}

function assertNotInvoiced(db: DatabaseState, entry: TimeEntry): void {
  if (entry.invoiceId === null) return;
  const invoice = db.invoices.find((candidate) => candidate.id === entry.invoiceId);
  if (invoice === undefined) {
    throw new ApiError('LOCKED', "This entry is on an invoice, so it can't be changed.");
  }
  throw new ApiError(
    'LOCKED',
    invoice.status === 'draft'
      ? `This entry is on draft invoice ${invoice.number}. Delete the draft to change it.`
      : `This entry is on invoice ${invoice.number}, so it can't be changed.`,
  );
}

function assertDraft(invoice: Invoice, action: 'edited' | 'deleted'): void {
  if (invoice.status === 'draft') return;
  throw new ApiError(
    'LOCKED',
    `Invoice ${invoice.number} has been ${invoice.status}, so it can't be ${action}. Only drafts can be ${action}.`,
  );
}

function stopEntry(entry: TimeEntry, at: Date, stamp: string): void {
  // A timer stopped within its first second still gets a positive length.
  const end = Math.max(at.getTime(), Date.parse(entry.start) + 1000);
  entry.end = toIso(end);
  entry.updatedAt = stamp;
}

function selectInvoiceEntries(
  db: DatabaseState,
  billing: BillingContext,
  client: Client,
  entryIds: readonly string[],
): TimeEntry[] {
  const clientProjectIds = new Set(
    db.projects.filter((project) => project.clientId === client.id).map((project) => project.id),
  );
  const selected: TimeEntry[] = [];
  for (const id of new Set(entryIds)) {
    const entry = db.entries.find((candidate) => candidate.id === id);
    if (entry === undefined) {
      throw fieldError(
        'entryIds',
        'Some selected entries no longer exist. Refresh the page and try again.',
      );
    }
    if (entry.projectId === null || !clientProjectIds.has(entry.projectId)) {
      throw fieldError('entryIds', `Some selected entries don't belong to ${client.name}.`);
    }
    if (entry.invoiceId !== null) {
      throw new ApiError(
        'CONFLICT',
        'Some selected entries have already been invoiced. Refresh the page and try again.',
      );
    }
    if (!isInvoiceable(entry, billing)) {
      throw fieldError('entryIds', 'Only stopped, billable entries can be invoiced.');
    }
    selected.push(entry);
  }
  return selected;
}

function businessParty(db: DatabaseState): InvoiceParty {
  const { settings } = db;
  return {
    name: settings.businessName.trim() || settings.ownerName.trim(),
    email: settings.businessEmail,
    address: settings.businessAddress,
    taxId: settings.taxId,
  };
}

function clientParty(client: Client): InvoiceParty {
  return { name: client.name, email: client.email, address: client.address, taxId: null };
}

/* ---------- Backups ---------- */

function parseBackup(file: unknown): DatabaseState {
  const notABackup = "This file isn't a Stint backup.";
  if (typeof file !== 'object' || file === null || Array.isArray(file)) {
    throw validationError(notABackup);
  }
  let size: number;
  try {
    size = new TextEncoder().encode(JSON.stringify(file)).length;
  } catch {
    throw validationError(notABackup);
  }
  if (size > MAX_BACKUP_BYTES) {
    throw validationError('This backup is larger than 5 MB, which is more than Stint can store.');
  }

  const { app, format, data } = file as Partial<Record<keyof BackupFile, unknown>>;
  if (app !== 'stint') throw validationError(notABackup);
  if (format !== BACKUP_FORMAT) {
    throw validationError(
      typeof format === 'number' && format > BACKUP_FORMAT
        ? 'This backup was made by a newer version of Stint and cannot be imported.'
        : 'This backup format is not supported.',
    );
  }

  const parsed = databaseSchema.safeParse(data);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) =>
      issue.path.length > 0 ? `${z.core.toDotPath(issue.path)}: ${issue.message}` : issue.message,
    );
    throw validationError(`The backup contains invalid data: ${summarize(details)}`);
  }
  const issues = findIntegrityIssues(parsed.data);
  if (issues.length > 0) {
    throw validationError(`The backup is inconsistent: ${summarize(issues)}`);
  }
  return parsed.data;
}

function summarize(problems: readonly string[]): string {
  const shown = problems.slice(0, MAX_REPORTED_ISSUES).join('; ');
  const hidden = problems.length - MAX_REPORTED_ISSUES;
  return hidden > 0 ? `${shown} (and ${hidden} more).` : `${shown}.`;
}

/* ---------- Small helpers ---------- */

function byName(a: { id: string; name: string }, b: { id: string; name: string }): number {
  return collator.compare(a.name, b.name) || collator.compare(a.id, b.id);
}

function byStartDescending(a: TimeEntry, b: TimeEntry): number {
  return Date.parse(b.start) - Date.parse(a.start) || collator.compare(b.id, a.id);
}

function byIssueDateDescending(a: Invoice, b: Invoice): number {
  return (
    collator.compare(b.issueDate, a.issueDate) ||
    collator.compare(b.number, a.number) ||
    Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

function toIso(instant: number | Date): string {
  return new Date(instant).toISOString();
}

function truncateToSecond(date: Date): Date {
  return new Date(Math.floor(date.getTime() / 1000) * 1000);
}

function yearOfDateKey(dateKey: string): number {
  return Number(dateKey.slice(0, 4));
}

function browserLocale(): string | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.language;
}
