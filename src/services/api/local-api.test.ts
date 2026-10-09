import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmptyDatabase } from '@/data/demo-seed';
import type { DatabaseState, ProjectInput, TimeEntryInput } from '@/domain/models';
import { LocalStore } from '@/services/storage/local-store';
import { createMemoryStorage } from '@/services/storage/memory-storage';
import { ApiError, type ApiErrorCode } from './errors';
import { createLocalApi } from './local-api';
import type { BackupFile, StintApi } from './types';

const NOW = new Date('2026-10-09T12:00:00.000Z');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** An ISO timestamp `minutes` away from NOW (negative = in the past). */
const at = (minutes: number) => new Date(NOW.getTime() + minutes * MINUTE).toISOString();

function setup(seed: () => DatabaseState = () => createEmptyDatabase('en-GB')) {
  const storage = createMemoryStorage();
  const store = new LocalStore(storage, { seed });
  let current = NOW;
  const api = createLocalApi(store, { now: () => current });
  return {
    api,
    store,
    setNow: (date: Date) => {
      current = date;
    },
  };
}

async function expectApiError(
  promise: Promise<unknown>,
  code: ApiErrorCode,
  field?: string,
): Promise<ApiError> {
  const error = await promise.then(
    () => {
      throw new Error(`Expected an ApiError ${code}, but the call succeeded`);
    },
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ApiError);
  const apiError = error as ApiError;
  expect(apiError.code).toBe(code);
  if (field !== undefined) expect(apiError.fieldErrors?.[field]?.length).toBeGreaterThan(0);
  return apiError;
}

function projectInput(overrides: Partial<ProjectInput> = {}): ProjectInput {
  return {
    name: 'Website',
    clientId: null,
    color: 'blue',
    hourlyRateCents: null,
    budgetHours: null,
    billableByDefault: true,
    notes: null,
    ...overrides,
  };
}

function entryInput(overrides: Partial<TimeEntryInput> = {}): TimeEntryInput {
  return {
    description: 'Design review',
    projectId: null,
    start: at(-120),
    end: at(-60),
    billable: true,
    ...overrides,
  };
}

/** A client with a billable project, a second client, and an internal project. */
async function createFixtures(api: StintApi) {
  const client = await api.clients.create({
    name: 'Acme Corp',
    email: 'billing@acme.example',
    address: '1 Main Street',
    hourlyRateCents: 10_000,
  });
  const otherClient = await api.clients.create({
    name: 'Globex',
    email: null,
    address: null,
    hourlyRateCents: null,
  });
  const project = await api.projects.create(projectInput({ name: 'Site', clientId: client.id }));
  const otherProject = await api.projects.create(
    projectInput({ name: 'Globex app', clientId: otherClient.id, color: 'orange' }),
  );
  const internal = await api.projects.create(
    projectInput({ name: 'Admin', color: 'green', billableByDefault: false }),
  );
  return { client, otherClient, project, otherProject, internal };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('settings', () => {
  it('returns and updates settings, normalising text', async () => {
    const { api } = setup();

    const updated = await api.settings.update({
      ownerName: '  Alex  ',
      businessEmail: '   ',
      invoicePrefix: 'MS-',
    });

    expect(updated).toMatchObject({ ownerName: 'Alex', businessEmail: null, invoicePrefix: 'MS-' });
    expect(await api.settings.get()).toEqual(updated);
  });

  it('rejects invalid settings with field errors', async () => {
    const { api } = setup();
    await expectApiError(
      api.settings.update({ businessEmail: 'not-an-email' }),
      'VALIDATION',
      'businessEmail',
    );
    await expectApiError(
      api.settings.update({ weeklyTargetHours: 0 }),
      'VALIDATION',
      'weeklyTargetHours',
    );
  });
});

describe('clients', () => {
  it('creates clients with trimmed text and blank optional fields as null', async () => {
    const { api } = setup();

    const client = await api.clients.create({
      name: '  Acme  ',
      email: '',
      address: '  ',
      hourlyRateCents: null,
    });

    expect(client).toMatchObject({ name: 'Acme', email: null, address: null, archived: false });
    expect(client.createdAt).toBe(NOW.toISOString());
    expect(await api.clients.get(client.id)).toEqual(client);
  });

  it('reports invalid input as VALIDATION with field errors', async () => {
    const { api } = setup();
    const error = await expectApiError(
      api.clients.create({ name: ' ', email: 'nope', address: null, hourlyRateCents: null }),
      'VALIDATION',
    );
    expect(Object.keys(error.fieldErrors ?? {})).toEqual(expect.arrayContaining(['name', 'email']));
  });

  it('lists clients sorted by name, ignoring case', async () => {
    const { api } = setup();
    for (const name of ['beta', 'Alpha', 'Gamma']) {
      await api.clients.create({ name, email: null, address: null, hourlyRateCents: null });
    }
    expect((await api.clients.list()).map((client) => client.name)).toEqual([
      'Alpha',
      'beta',
      'Gamma',
    ]);
  });

  it('updates, archives and stamps updatedAt', async () => {
    const { api, setNow } = setup();
    const client = await api.clients.create({
      name: 'Acme',
      email: null,
      address: null,
      hourlyRateCents: null,
    });
    setNow(new Date(NOW.getTime() + HOUR));

    const updated = await api.clients.update(client.id, {
      name: 'Acme Ltd',
      email: null,
      address: null,
      hourlyRateCents: 9000,
    });
    const archived = await api.clients.setArchived(client.id, true);

    expect(updated).toMatchObject({ name: 'Acme Ltd', hourlyRateCents: 9000 });
    expect(updated.createdAt).toBe(client.createdAt);
    expect(updated.updatedAt).toBe(at(60));
    expect(archived.archived).toBe(true);
  });

  it('fails with NOT_FOUND for unknown ids', async () => {
    const { api } = setup();
    await expectApiError(api.clients.get('missing'), 'NOT_FOUND');
    await expectApiError(api.clients.remove('missing'), 'NOT_FOUND');
  });

  it('refuses to delete a client that still has projects', async () => {
    const { api } = setup();
    const { client } = await createFixtures(api);
    await expectApiError(api.clients.remove(client.id), 'CONFLICT');
  });

  it('refuses to delete a client that has invoices', async () => {
    const { api } = setup();
    const { client, otherClient, project } = await createFixtures(api);
    const entry = await api.entries.create(entryInput({ projectId: project.id }));
    await api.invoices.create({
      clientId: client.id,
      entryIds: [entry.id],
      issueDate: '2026-10-09',
      dueDate: '2026-11-08',
      taxRateBps: 0,
      notes: null,
      periodStart: null,
      periodEnd: null,
    });
    // Move the project away so only the invoice still references the client.
    await api.projects.update(project.id, projectInput({ name: 'Site', clientId: otherClient.id }));

    const error = await expectApiError(api.clients.remove(client.id), 'CONFLICT');
    expect(error.message).toMatch(/invoices/);
  });

  it('deletes a client without projects or invoices', async () => {
    const { api } = setup();
    const client = await api.clients.create({
      name: 'Short-lived',
      email: null,
      address: null,
      hourlyRateCents: null,
    });
    await api.clients.remove(client.id);
    expect(await api.clients.list()).toEqual([]);
  });
});

describe('projects', () => {
  it('requires an existing client', async () => {
    const { api } = setup();
    await expectApiError(
      api.projects.create(projectInput({ clientId: 'missing' })),
      'VALIDATION',
      'clientId',
    );
  });

  it('never marks a project without a client as billable by default', async () => {
    const { api } = setup();
    const project = await api.projects.create(projectInput({ billableByDefault: true }));
    expect(project.billableByDefault).toBe(false);
  });

  it('treats a blank client id and blank notes as null', async () => {
    const { api } = setup();
    const project = await api.projects.create({
      ...projectInput(),
      clientId: '',
      notes: '   ',
    });
    expect(project).toMatchObject({ clientId: null, notes: null });
  });

  it('refuses to delete a project with time entries, but archives it', async () => {
    const { api } = setup();
    const { project } = await createFixtures(api);
    await api.entries.create(entryInput({ projectId: project.id }));

    await expectApiError(api.projects.remove(project.id), 'CONFLICT');
    expect((await api.projects.setArchived(project.id, true)).archived).toBe(true);
  });

  it('deletes a project without entries', async () => {
    const { api } = setup();
    const project = await api.projects.create(projectInput());
    await api.projects.remove(project.id);
    await expectApiError(api.projects.get(project.id), 'NOT_FOUND');
  });
});

describe('entries', () => {
  it('creates an entry with normalised text and UTC timestamps', async () => {
    const { api } = setup();

    const entry = await api.entries.create(
      entryInput({
        description: '  Wireframes  ',
        projectId: '',
        start: '2026-10-09T10:00:00+02:00',
        end: '2026-10-09T11:30:00+02:00',
      }),
    );

    expect(entry).toMatchObject({
      description: 'Wireframes',
      projectId: null,
      start: '2026-10-09T08:00:00.000Z',
      end: '2026-10-09T09:30:00.000Z',
      invoiceId: null,
    });
  });

  it('requires the end to be after the start', async () => {
    const { api } = setup();
    await expectApiError(api.entries.create(entryInput({ end: at(-120) })), 'VALIDATION', 'end');
  });

  it('limits manual entries to 24 hours', async () => {
    const { api } = setup();
    await expectApiError(
      api.entries.create(entryInput({ start: at(-24 * 60 - 61), end: at(-60) })),
      'VALIDATION',
      'end',
    );
    await expect(
      api.entries.create(entryInput({ start: at(-24 * 60 - 60), end: at(-60) })),
    ).resolves.toBeDefined();
  });

  it('rejects times in the future beyond a one-minute tolerance', async () => {
    const { api } = setup();
    await expectApiError(api.entries.create(entryInput({ end: at(2) })), 'VALIDATION', 'end');
    await expectApiError(
      api.entries.create(entryInput({ start: at(5), end: at(10) })),
      'VALIDATION',
      'start',
    );
    await expect(api.entries.create(entryInput({ end: at(1) }))).resolves.toBeDefined();
  });

  it('requires the project to exist', async () => {
    const { api } = setup();
    await expectApiError(
      api.entries.create(entryInput({ projectId: 'missing' })),
      'VALIDATION',
      'projectId',
    );
  });

  it('forces billable off unless the project has a client', async () => {
    const { api } = setup();
    const { project, internal } = await createFixtures(api);

    const noProject = await api.entries.create(entryInput({ billable: true }));
    const internalEntry = await api.entries.create(
      entryInput({ projectId: internal.id, billable: true }),
    );
    const clientEntry = await api.entries.create(
      entryInput({ projectId: project.id, billable: true }),
    );

    expect(noProject.billable).toBe(false);
    expect(internalEntry.billable).toBe(false);
    expect(clientEntry.billable).toBe(true);
  });

  it('updates an entry and stamps updatedAt', async () => {
    const { api, setNow } = setup();
    const entry = await api.entries.create(entryInput());
    setNow(new Date(NOW.getTime() + 5 * MINUTE));

    const updated = await api.entries.update(
      entry.id,
      entryInput({ description: 'Changed', start: at(-90) }),
    );

    expect(updated).toMatchObject({ description: 'Changed', start: at(-90) });
    expect(updated.createdAt).toBe(entry.createdAt);
    expect(updated.updatedAt).toBe(at(5));
  });

  it('lets a long timer entry be renamed without fixing its times first', async () => {
    const { api, setNow } = setup();
    setNow(new Date(NOW.getTime() - 26 * HOUR));
    await api.timer.start({ description: 'Forgot to stop', projectId: null, billable: false });
    setNow(NOW);
    const stopped = await api.timer.stop();
    if (stopped?.end == null) throw new Error('Expected a stopped entry');

    const renamed = await api.entries.update(
      stopped.id,
      entryInput({ description: 'Renamed', start: stopped.start, end: stopped.end }),
    );
    expect(renamed.description).toBe('Renamed');

    await expectApiError(
      api.entries.update(stopped.id, entryInput({ start: stopped.start, end: at(-1) })),
      'VALIDATION',
      'end',
    );
  });

  it('removes and restores an entry (undo)', async () => {
    const { api } = setup();
    const entry = await api.entries.create(entryInput());

    const removed = await api.entries.remove(entry.id);
    expect(await api.entries.list()).toEqual([]);

    const restored = await api.entries.restore(removed);
    expect(restored).toMatchObject({ id: entry.id, start: entry.start, end: entry.end });
    expect(await api.entries.list()).toHaveLength(1);

    await expectApiError(api.entries.restore(removed), 'CONFLICT');
  });

  it('duplicates an entry right after the original with the same length', async () => {
    const { api } = setup();
    const { project } = await createFixtures(api);
    const entry = await api.entries.create(
      entryInput({ projectId: project.id, start: at(-180), end: at(-135) }),
    );

    const copy = await api.entries.duplicate(entry.id);

    expect(copy.id).not.toBe(entry.id);
    expect(copy).toMatchObject({
      description: entry.description,
      projectId: project.id,
      billable: true,
      start: entry.end,
      end: at(-90),
      invoiceId: null,
    });
  });

  it('cannot duplicate the running timer', async () => {
    const { api } = setup();
    const { started } = await api.timer.start({
      description: '',
      projectId: null,
      billable: false,
    });
    await expectApiError(api.entries.duplicate(started.id), 'CONFLICT');
  });

  describe('list', () => {
    async function seedEntries(api: StintApi) {
      const fixtures = await createFixtures(api);
      const a = await api.entries.create(
        entryInput({
          description: 'Homepage layout',
          projectId: fixtures.project.id,
          start: at(-600),
          end: at(-540),
        }),
      );
      const b = await api.entries.create(
        entryInput({
          description: 'Globex call',
          projectId: fixtures.otherProject.id,
          start: at(-300),
          end: at(-240),
          billable: false,
        }),
      );
      const c = await api.entries.create(
        entryInput({ description: 'Bookkeeping', projectId: null, start: at(-200), end: at(-180) }),
      );
      const { started } = await api.timer.start({
        description: 'Live work',
        projectId: fixtures.project.id,
        billable: true,
      });
      return { ...fixtures, a, b, c, running: started };
    }

    it('returns entries newest first', async () => {
      const { api } = setup();
      const { a, b, c, running } = await seedEntries(api);
      expect((await api.entries.list()).map((entry) => entry.id)).toEqual([
        running.id,
        c.id,
        b.id,
        a.id,
      ]);
    });

    it('filters by time range (from inclusive, to exclusive)', async () => {
      const { api } = setup();
      const { b, c } = await seedEntries(api);
      const result = await api.entries.list({ from: at(-300), to: at(-100) });
      expect(result.map((entry) => entry.id)).toEqual([c.id, b.id]);
      expect(await api.entries.list({ from: at(-299), to: at(-200) })).toEqual([]);
    });

    it('filters by projects, including "no project"', async () => {
      const { api } = setup();
      const { project, a, c, running } = await seedEntries(api);
      const result = await api.entries.list({ projectIds: [project.id, null] });
      expect(result.map((entry) => entry.id)).toEqual([running.id, c.id, a.id]);
    });

    it('filters by client, billable, invoiced, running and search text', async () => {
      const { api } = setup();
      const { client, a, b, c, running } = await seedEntries(api);

      expect((await api.entries.list({ clientId: client.id })).map((e) => e.id)).toEqual([
        running.id,
        a.id,
      ]);
      expect((await api.entries.list({ billable: false })).map((e) => e.id)).toEqual([c.id, b.id]);
      expect(await api.entries.list({ invoiced: true })).toEqual([]);
      expect(await api.entries.list({ invoiced: false })).toHaveLength(4);
      expect((await api.entries.list({ includeRunning: false })).map((e) => e.id)).not.toContain(
        running.id,
      );
      expect((await api.entries.list({ search: '  HOMEPAGE ' })).map((e) => e.id)).toEqual([a.id]);
    });

    it('rejects malformed filters', async () => {
      const { api } = setup();
      await expectApiError(api.entries.list({ from: 'yesterday' }), 'VALIDATION', 'from');
    });
  });
});

describe('timer', () => {
  it('starts a timer and reports it as running', async () => {
    const { api } = setup();
    const { started, stopped } = await api.timer.start({
      description: ' Planning ',
      projectId: null,
      billable: true,
    });

    expect(stopped).toBeNull();
    expect(started).toMatchObject({ description: 'Planning', end: null, billable: false });
    expect(started.start).toBe(NOW.toISOString());
    expect(await api.timer.getRunning()).toEqual(started);
  });

  it('stops the running timer atomically when another starts', async () => {
    const { api, setNow } = setup();
    const first = await api.timer.start({ description: 'First', projectId: null, billable: false });
    setNow(new Date(NOW.getTime() + 30 * MINUTE));

    const { started, stopped } = await api.timer.start({
      description: 'Second',
      projectId: null,
      billable: false,
    });

    expect(stopped).toMatchObject({ id: first.started.id, end: at(30) });
    expect(started.start).toBe(at(30));
    const running = (await api.entries.list()).filter((entry) => entry.end === null);
    expect(running.map((entry) => entry.id)).toEqual([started.id]);
  });

  it('stops the timer, and resolves to null when nothing runs', async () => {
    const { api, setNow } = setup();
    await api.timer.start({ description: '', projectId: null, billable: false });
    setNow(new Date(NOW.getTime() + 45 * MINUTE));

    const stopped = await api.timer.stop();

    expect(stopped?.end).toBe(at(45));
    expect(await api.timer.getRunning()).toBeNull();
    expect(await api.timer.stop()).toBeNull();
  });

  it('gives a timer stopped within a second a positive length', async () => {
    const { api } = setup();
    const { started } = await api.timer.start({
      description: '',
      projectId: null,
      billable: false,
    });
    const stopped = await api.timer.stop();
    expect(Date.parse(stopped?.end ?? '') - Date.parse(started.start)).toBe(1000);
  });

  it('edits the running entry', async () => {
    const { api } = setup();
    const { project } = await createFixtures(api);
    await api.timer.start({ description: 'Draft', projectId: null, billable: false });

    const updated = await api.timer.updateRunning({
      description: '  Final  ',
      projectId: project.id,
      billable: true,
      start: at(-30),
    });

    expect(updated).toMatchObject({
      description: 'Final',
      projectId: project.id,
      billable: true,
      start: at(-30),
      end: null,
    });
  });

  it('rejects a running start time in the future', async () => {
    const { api } = setup();
    await api.timer.start({ description: '', projectId: null, billable: false });
    await expectApiError(api.timer.updateRunning({ start: at(5) }), 'VALIDATION', 'start');
  });

  it('fails with NOT_FOUND when editing without a running timer', async () => {
    const { api } = setup();
    await expectApiError(api.timer.updateRunning({ description: 'x' }), 'NOT_FOUND');
  });

  it('discards the running entry', async () => {
    const { api } = setup();
    await api.timer.start({ description: 'Oops', projectId: null, billable: false });
    await api.timer.discard();
    expect(await api.timer.getRunning()).toBeNull();
    expect(await api.entries.list()).toEqual([]);
    await expect(api.timer.discard()).resolves.toBeUndefined();
  });
});

describe('invoices', () => {
  async function invoiceSetup() {
    const context = setup();
    const { api } = context;
    await api.settings.update({
      businessName: 'Moreau Studio',
      ownerName: 'Alex Moreau',
      businessEmail: 'alex@studio.example',
      roundingIncrementMinutes: 15,
      roundingMode: 'up',
    });
    const fixtures = await createFixtures(api);
    const first = await api.entries.create(
      entryInput({ projectId: fixtures.project.id, start: at(-300), end: at(-240) }),
    );
    const second = await api.entries.create(
      entryInput({ projectId: fixtures.project.id, start: at(-200), end: at(-178) }),
    );
    const createInvoice = (entryIds = [first.id, second.id]) =>
      api.invoices.create({
        clientId: fixtures.client.id,
        entryIds,
        issueDate: '2026-10-09',
        dueDate: '2026-11-08',
        taxRateBps: 2200,
        notes: '   ',
        periodStart: '2026-10-01',
        periodEnd: '2026-10-09',
      });
    return { ...context, ...fixtures, first, second, createInvoice };
  }

  it('creates a numbered draft with snapshots and locks its entries', async () => {
    const { api, client, project, first, second, createInvoice } = await invoiceSetup();

    const invoice = await createInvoice();

    expect(invoice).toMatchObject({
      number: 'INV-2026-001',
      clientId: client.id,
      status: 'draft',
      currency: 'EUR',
      taxRateBps: 2200,
      notes: null,
      periodStart: '2026-10-01',
      periodEnd: '2026-10-09',
      rounding: { incrementMinutes: 15, mode: 'up' },
      from: { name: 'Moreau Studio', email: 'alex@studio.example' },
      billTo: { name: 'Acme Corp', email: 'billing@acme.example', address: '1 Main Street' },
      sentAt: null,
      paidAt: null,
    });
    // 60 min + 22 min (rounded up to 30) = 90 billed minutes at the client's €100/h.
    expect(invoice.lines).toEqual([
      expect.objectContaining({
        projectId: project.id,
        description: 'Site',
        trackedSeconds: 82 * 60,
        billedSeconds: 90 * 60,
        rateCents: 10_000,
        amountCents: 15_000,
        entryIds: [first.id, second.id],
      }),
    ]);
    const entries = await api.entries.list();
    expect(entries.every((entry) => entry.invoiceId === invoice.id)).toBe(true);
    expect(await api.invoices.get(invoice.id)).toEqual(invoice);
  });

  it('keeps its snapshots when the client or settings change later', async () => {
    const { api, client, createInvoice } = await invoiceSetup();
    const invoice = await createInvoice();

    await api.clients.update(client.id, {
      name: 'Acme Renamed',
      email: null,
      address: null,
      hourlyRateCents: 1,
    });
    await api.settings.update({ businessName: 'New name', roundingIncrementMinutes: 0 });

    expect(await api.invoices.get(invoice.id)).toEqual(invoice);
  });

  it('numbers invoices per prefix and year', async () => {
    const { api, createInvoice } = await invoiceSetup();
    expect(await api.invoices.previewNumber('2026-12-01')).toBe('INV-2026-001');
    await createInvoice();
    expect(await api.invoices.previewNumber('2026-12-01')).toBe('INV-2026-002');
    expect(await api.invoices.previewNumber('2027-01-05')).toBe('INV-2027-001');
    await expectApiError(api.invoices.previewNumber('2026-02-31'), 'VALIDATION', 'issueDate');
  });

  it('refuses to invoice entries of another client', async () => {
    const { api, otherProject, first, createInvoice } = await invoiceSetup();
    const foreign = await api.entries.create(entryInput({ projectId: otherProject.id }));
    await expectApiError(createInvoice([first.id, foreign.id]), 'VALIDATION', 'entryIds');
  });

  it('refuses missing, non-billable and running entries', async () => {
    const { api, project, createInvoice } = await invoiceSetup();
    await expectApiError(createInvoice(['missing']), 'VALIDATION', 'entryIds');

    const nonBillable = await api.entries.create(
      entryInput({ projectId: project.id, billable: false }),
    );
    await expectApiError(createInvoice([nonBillable.id]), 'VALIDATION', 'entryIds');

    const { started } = await api.timer.start({
      description: '',
      projectId: project.id,
      billable: true,
    });
    await expectApiError(createInvoice([started.id]), 'VALIDATION', 'entryIds');
    await expectApiError(createInvoice([]), 'VALIDATION', 'entryIds');
  });

  it('refuses entries that are already invoiced', async () => {
    const { first, createInvoice } = await invoiceSetup();
    await createInvoice();
    await expectApiError(createInvoice([first.id]), 'CONFLICT');
  });

  it('requires an existing client and a due date on or after the issue date', async () => {
    const { api, first } = await invoiceSetup();
    const base = {
      entryIds: [first.id],
      issueDate: '2026-10-09',
      dueDate: '2026-11-08',
      taxRateBps: 0,
      notes: null,
      periodStart: null,
      periodEnd: null,
    };
    await expectApiError(
      api.invoices.create({ ...base, clientId: 'missing' }),
      'VALIDATION',
      'clientId',
    );
    const { client } = await invoiceSetup();
    await expectApiError(
      api.invoices.create({ ...base, clientId: client.id, dueDate: '2026-10-01' }),
      'VALIDATION',
      'dueDate',
    );
  });

  it('locks invoiced entries against edits and deletion', async () => {
    const { api, first, createInvoice } = await invoiceSetup();
    const invoice = await createInvoice();

    const error = await expectApiError(api.entries.update(first.id, entryInput()), 'LOCKED');
    expect(error.message).toContain(invoice.number);
    await expectApiError(api.entries.remove(first.id), 'LOCKED');
  });

  it('moves through the allowed status transitions', async () => {
    const { api, setNow, createInvoice } = await invoiceSetup();
    const invoice = await createInvoice();

    await expectApiError(api.invoices.setStatus(invoice.id, 'paid'), 'CONFLICT');

    setNow(new Date(NOW.getTime() + HOUR));
    const sent = await api.invoices.setStatus(invoice.id, 'sent');
    expect(sent).toMatchObject({ status: 'sent', sentAt: at(60), paidAt: null });

    setNow(new Date(NOW.getTime() + 2 * HOUR));
    const paid = await api.invoices.setStatus(invoice.id, 'paid');
    expect(paid).toMatchObject({ status: 'paid', sentAt: at(60), paidAt: at(120) });
    await expectApiError(api.invoices.setStatus(invoice.id, 'draft'), 'CONFLICT');

    const reopened = await api.invoices.setStatus(invoice.id, 'sent');
    expect(reopened).toMatchObject({ status: 'sent', sentAt: at(60), paidAt: null });

    const backToDraft = await api.invoices.setStatus(invoice.id, 'draft');
    expect(backToDraft).toMatchObject({ status: 'draft', sentAt: null, paidAt: null });

    expect(await api.invoices.setStatus(invoice.id, 'draft')).toEqual(backToDraft);
  });

  it('edits and deletes drafts only', async () => {
    const { api, createInvoice } = await invoiceSetup();
    const invoice = await createInvoice();
    const details = {
      issueDate: '2026-10-10',
      dueDate: '2026-11-09',
      taxRateBps: 1000,
      notes: ' Thanks! ',
    };

    const edited = await api.invoices.updateDetails(invoice.id, details);
    expect(edited).toMatchObject({ ...details, notes: 'Thanks!' });

    await api.invoices.setStatus(invoice.id, 'sent');
    await expectApiError(api.invoices.updateDetails(invoice.id, details), 'LOCKED');
    await expectApiError(api.invoices.remove(invoice.id), 'LOCKED');
  });

  it('releases the entries when a draft is deleted', async () => {
    const { api, first, createInvoice } = await invoiceSetup();
    const invoice = await createInvoice();

    await api.invoices.remove(invoice.id);

    expect(await api.invoices.list()).toEqual([]);
    expect((await api.entries.list()).every((entry) => entry.invoiceId === null)).toBe(true);
    await expect(api.entries.update(first.id, entryInput())).resolves.toBeDefined();
  });

  it('lists invoices by issue date, newest first', async () => {
    const { api, client, project } = await invoiceSetup();
    const make = async (issueDate: string, minutes: number) => {
      const entry = await api.entries.create(
        entryInput({ projectId: project.id, start: at(minutes - 30), end: at(minutes) }),
      );
      return api.invoices.create({
        clientId: client.id,
        entryIds: [entry.id],
        issueDate,
        dueDate: '2026-12-31',
        taxRateBps: 0,
        notes: null,
        periodStart: null,
        periodEnd: null,
      });
    };
    const older = await make('2026-09-01', -1000);
    const newer = await make('2026-10-01', -900);
    expect((await api.invoices.list()).map((invoice) => invoice.id)).toEqual([newer.id, older.id]);
  });
});

describe('data', () => {
  it('exports a backup that imports back into an empty workspace', async () => {
    const source = setup();
    await createFixtures(source.api);
    await source.api.entries.create(entryInput());
    const backup = await source.api.data.exportBackup();

    expect(backup).toMatchObject({ app: 'stint', format: 1, exportedAt: NOW.toISOString() });

    const target = setup();
    const summary = await target.api.data.importBackup(JSON.parse(JSON.stringify(backup)));

    expect(summary).toEqual({ clients: 2, projects: 3, entries: 1, invoices: 0 });
    expect(await target.api.clients.list()).toEqual(await source.api.clients.list());
  });

  describe('importBackup rejects', () => {
    async function validBackup(): Promise<BackupFile> {
      const { api } = setup();
      await createFixtures(api);
      return api.data.exportBackup();
    }

    it.each([
      ['a string', 'not a backup'],
      ['null', null],
      ['an array', []],
    ])('%s', async (_label, file) => {
      const { api } = setup();
      await expectApiError(api.data.importBackup(file), 'VALIDATION');
    });

    it('files from another app or format', async () => {
      const { api } = setup();
      const backup = await validBackup();
      await expectApiError(api.data.importBackup({ ...backup, app: 'other' }), 'VALIDATION');
      const newer = await expectApiError(
        api.data.importBackup({ ...backup, format: 2 }),
        'VALIDATION',
      );
      expect(newer.message).toMatch(/newer version/);
    });

    it('files larger than 5 MB', async () => {
      const { api } = setup();
      const backup = await validBackup();
      const error = await expectApiError(
        api.data.importBackup({ ...backup, padding: 'x'.repeat(5 * 1024 * 1024) }),
        'VALIDATION',
      );
      expect(error.message).toMatch(/5 MB/);
    });

    it('data that does not match the schema, naming the problem', async () => {
      const { api } = setup();
      const backup = await validBackup();
      const broken = structuredClone(backup);
      const project = broken.data.projects[0];
      if (!project) throw new Error('Expected a project');
      (project as { color: string }).color = 'chartreuse';

      const error = await expectApiError(api.data.importBackup(broken), 'VALIDATION');
      expect(error.message).toContain('projects[0].color');
    });

    it('data with broken references, keeping the current data', async () => {
      const { api } = setup();
      const existing = await api.clients.create({
        name: 'Keep me',
        email: null,
        address: null,
        hourlyRateCents: null,
      });
      const backup = await validBackup();
      const broken = structuredClone(backup);
      broken.data.clients = [];

      const error = await expectApiError(api.data.importBackup(broken), 'VALIDATION');
      expect(error.message).toMatch(/inconsistent/);
      expect(await api.clients.list()).toEqual([existing]);
    });
  });

  it('resets to demo data and clears everything', async () => {
    const { api } = setup();

    await api.data.resetToDemo();
    expect(await api.clients.list()).toHaveLength(4);
    expect((await api.settings.get()).businessName).toBe('Moreau Studio');

    await api.data.clearAll();
    expect(await api.clients.list()).toEqual([]);
    expect(await api.projects.list()).toEqual([]);
    expect(await api.entries.list()).toEqual([]);
    expect(await api.invoices.list()).toEqual([]);
    expect((await api.settings.get()).businessName).toBe('');
  });
});

describe('general behaviour', () => {
  it('returns private copies that cannot change stored data', async () => {
    const { api } = setup();
    const client = await api.clients.create({
      name: 'Acme',
      email: null,
      address: null,
      hourlyRateCents: null,
    });

    client.name = 'Mutated';
    const [listed] = await api.clients.list();
    if (!listed) throw new Error('Expected a client');
    listed.name = 'Mutated again';
    (await api.settings.get()).ownerName = 'Mutated';

    expect((await api.clients.get(client.id)).name).toBe('Acme');
    expect((await api.settings.get()).ownerName).toBe('');
  });

  it('delays every call by the simulated latency', async () => {
    vi.useFakeTimers();
    const storage = createMemoryStorage();
    const store = new LocalStore(storage, { seed: () => createEmptyDatabase('en-GB') });
    const api = createLocalApi(store, { latencyMs: 300, now: () => NOW });
    let settled = false;

    const pending = api.settings.get().then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(299);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(settled).toBe(true);
  });
});
