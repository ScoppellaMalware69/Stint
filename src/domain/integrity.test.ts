import { describe, expect, it } from 'vitest';
import { findIntegrityIssues } from '@/domain/integrity';
import type {
  Client,
  DatabaseState,
  Invoice,
  InvoiceLine,
  Project,
  TimeEntry,
} from '@/domain/models';

const STAMP = '2026-01-01T00:00:00.000Z';

const client = (id: string): Client => ({
  id,
  name: `Client ${id}`,
  email: null,
  address: null,
  hourlyRateCents: null,
  archived: false,
  createdAt: STAMP,
  updatedAt: STAMP,
});

const project = (id: string, clientId: string | null): Project => ({
  id,
  name: `Project ${id}`,
  clientId,
  color: 'blue',
  hourlyRateCents: null,
  budgetHours: null,
  billableByDefault: true,
  notes: null,
  archived: false,
  createdAt: STAMP,
  updatedAt: STAMP,
});

const entry = (id: string, overrides: Partial<TimeEntry> = {}): TimeEntry => ({
  id,
  description: `Work ${id}`,
  projectId: 'p1',
  start: '2026-10-05T09:00:00.000Z',
  end: '2026-10-05T10:00:00.000Z',
  billable: true,
  invoiceId: null,
  createdAt: STAMP,
  updatedAt: STAMP,
  ...overrides,
});

const line = (entryIds: string[], overrides: Partial<InvoiceLine> = {}): InvoiceLine => ({
  id: `line-${entryIds.join('-')}`,
  projectId: 'p1',
  description: 'Project p1',
  billedSeconds: 3600,
  trackedSeconds: 3600,
  rateCents: 7500,
  amountCents: 7500,
  entryIds,
  ...overrides,
});

const invoice = (id: string, number: string, lines: InvoiceLine[], clientId = 'c1'): Invoice => {
  const party = { name: 'Party', email: null, address: null, taxId: null };
  return {
    id,
    number,
    clientId,
    status: 'sent',
    issueDate: '2026-10-01',
    dueDate: '2026-10-31',
    periodStart: null,
    periodEnd: null,
    currency: 'EUR',
    from: party,
    billTo: party,
    lines,
    taxRateBps: 0,
    rounding: { incrementMinutes: 0, mode: 'up' },
    notes: null,
    sentAt: STAMP,
    paidAt: null,
    createdAt: STAMP,
    updatedAt: STAMP,
  };
};

function validDatabase(): DatabaseState {
  return {
    version: 1,
    clients: [client('c1')],
    projects: [project('p1', 'c1'), project('internal', null)],
    entries: [
      entry('e1', { invoiceId: 'inv1' }),
      entry('e2', { invoiceId: 'inv1' }),
      entry('e3', { projectId: 'internal', billable: false }),
      entry('e4', { projectId: null }),
      entry('running', { end: null }),
    ],
    invoices: [invoice('inv1', 'INV-2026-001', [line(['e1', 'e2'])])],
    settings: {
      ownerName: '',
      businessName: '',
      businessEmail: null,
      businessAddress: null,
      taxId: null,
      currency: 'EUR',
      locale: 'en-GB',
      defaultHourlyRateCents: 7500,
      weekStartsOn: 1,
      weeklyTargetHours: 35,
      roundingIncrementMinutes: 0,
      roundingMode: 'up',
      invoicePrefix: 'INV-',
      paymentTermsDays: 30,
      defaultTaxRateBps: 0,
    },
  };
}

describe('findIntegrityIssues', () => {
  it('finds nothing in a consistent database', () => {
    expect(findIntegrityIssues(validDatabase())).toEqual([]);
  });

  it.each<[string, (db: DatabaseState) => void, RegExp]>([
    ['duplicate client ids', (db) => db.clients.push(client('c1')), /More than one client has the id “c1”/],
    ['duplicate project ids', (db) => db.projects.push(project('p1', null)), /More than one project has the id “p1”/],
    ['duplicate entry ids', (db) => db.entries.push(entry('e3')), /More than one time entry has the id “e3”/],
    [
      'duplicate invoice ids',
      (db) => db.invoices.push(invoice('inv1', 'INV-2026-002', [line(['e1'])])),
      /More than one invoice has the id “inv1”/,
    ],
    [
      'projects of missing clients',
      (db) => db.projects.push(project('p9', 'ghost')),
      /Project “Project p9” refers to a client that does not exist \(ghost\)/,
    ],
    [
      'entries of missing projects',
      (db) => db.entries.push(entry('e9', { projectId: 'ghost' })),
      /Time entry “Work e9” \(e9\) refers to a project that does not exist \(ghost\)/,
    ],
    [
      'entries of missing invoices',
      (db) => db.entries.push(entry('e9', { invoiceId: 'ghost' })),
      /refers to an invoice that does not exist \(ghost\)/,
    ],
    [
      'more than one running timer',
      (db) => db.entries.push(entry('e9', { end: null })),
      /2 timers are running at once/,
    ],
    [
      'entries ending when they start',
      (db) => db.entries.push(entry('e9', { end: '2026-10-05T09:00:00.000Z' })),
      /Time entry “Work e9” \(e9\) ends before or at the moment it starts/,
    ],
    [
      'entries ending before they start',
      (db) => db.entries.push(entry('e9', { end: '2026-10-05T08:00:00.000Z' })),
      /ends before or at the moment it starts/,
    ],
    [
      'invoices of missing clients',
      (db) => db.invoices.push(invoice('inv2', 'INV-2026-002', [line([])], 'ghost')),
      /Invoice “INV-2026-002” refers to a client that does not exist \(ghost\)/,
    ],
    [
      'invoice lines listing missing entries',
      (db) => db.invoices[0]?.lines.push(line(['ghost'])),
      /Invoice “INV-2026-001” lists a time entry that does not exist \(ghost\)/,
    ],
    [
      'invoice lines of missing projects',
      (db) => db.invoices[0]?.lines.push(line([], { projectId: 'ghost' })),
      /has a line for a project that does not exist \(ghost\)/,
    ],
    [
      'entries on an invoice but pointing at another one',
      (db) => {
        db.invoices.push(invoice('inv2', 'INV-2026-002', [line(['e1'])]));
      },
      /Time entry “Work e1” \(e1\) is on Invoice “INV-2026-002” but is marked as belonging to another invoice/,
    ],
    [
      'entries on an invoice but not marked as invoiced',
      (db) => db.invoices[0]?.lines.push(line(['e3'])),
      /“Work e3” \(e3\) is on Invoice “INV-2026-001” but is not marked as invoiced/,
    ],
    [
      'entries marked as invoiced but missing from the invoice',
      (db) => db.entries.push(entry('e9', { invoiceId: 'inv1' })),
      /“Work e9” \(e9\) is marked as invoiced on “INV-2026-001” but is not on it/,
    ],
    [
      'entries listed twice on one invoice',
      (db) => db.invoices[0]?.lines.push(line(['e1'])),
      /Invoice “INV-2026-001” lists time entry “e1” more than once/,
    ],
  ])('reports %s', (_label, corrupt, expected) => {
    const db = validDatabase();
    corrupt(db);
    const issues = findIntegrityIssues(db);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(expected);
  });

  it('labels entries without a description by id', () => {
    const db = validDatabase();
    db.entries.push(entry('e9', { description: ' ', projectId: 'ghost' }));
    expect(findIntegrityIssues(db)).toEqual([
      'Time entry “e9” refers to a project that does not exist (ghost).',
    ]);
  });

  it('caps the list at 20 messages with a summary', () => {
    const db = validDatabase();
    for (let index = 0; index < 30; index += 1) {
      db.entries.push(entry(`bad${index}`, { projectId: 'ghost' }));
    }
    const issues = findIntegrityIssues(db);
    expect(issues).toHaveLength(20);
    expect(issues[18]).toMatch(/bad18/);
    expect(issues[19]).toBe('…and 11 more problems.');
  });

  it('returns exactly 20 messages without a summary when there are 20', () => {
    const db = validDatabase();
    for (let index = 0; index < 20; index += 1) {
      db.entries.push(entry(`bad${index}`, { projectId: 'ghost' }));
    }
    const issues = findIntegrityIssues(db);
    expect(issues).toHaveLength(20);
    expect(issues[19]).toMatch(/bad19/);
  });
});
