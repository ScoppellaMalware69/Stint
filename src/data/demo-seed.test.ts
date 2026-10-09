import { describe, expect, it } from 'vitest';
import { getBudgetUsage } from '@/domain/budget';
import { getInvoiceDisplayStatus } from '@/domain/invoices';
import { findIntegrityIssues } from '@/domain/integrity';
import { databaseSchema, type DatabaseState } from '@/domain/models';
import { toDateKey } from '@/lib/dates';
import { createDemoDatabase, createEmptyDatabase } from './demo-seed';

/** Local times, so the cases hold in any time zone the tests run in. */
const CASES: Array<[string, Date]> = [
  ['a weekday afternoon', new Date(2026, 9, 9, 15, 20, 0)],
  ['a Monday before work', new Date(2026, 9, 12, 7, 5, 0)],
  ['a Saturday', new Date(2026, 9, 17, 11, 0, 0)],
  ['early January', new Date(2027, 0, 4, 10, 0, 0)],
  ['a spring daylight-saving change', new Date(2026, 2, 30, 12, 0, 0)],
];

const DAY_MS = 24 * 60 * 60 * 1000;

function trackedSeconds(db: DatabaseState, projectId: string): number {
  return db.entries
    .filter((entry) => entry.projectId === projectId && entry.end !== null)
    .reduce(
      (sum, entry) => sum + (Date.parse(entry.end ?? '') - Date.parse(entry.start)) / 1000,
      0,
    );
}

describe.each(CASES)('createDemoDatabase on %s', (_label, now) => {
  const db = createDemoDatabase(now);

  it('passes schema validation and integrity checks', () => {
    expect(databaseSchema.safeParse(db).success).toBe(true);
    expect(findIntegrityIssues(db)).toEqual([]);
  });

  it('has no running timer, nothing ending after now and no overlaps', () => {
    const sorted = [...db.entries].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    let previousEnd = -Infinity;
    for (const entry of sorted) {
      expect(entry.end).not.toBeNull();
      const start = Date.parse(entry.start);
      const end = Date.parse(entry.end ?? '');
      expect(end).toBeGreaterThan(start);
      expect(end).toBeLessThanOrEqual(now.getTime());
      expect(start).toBeGreaterThanOrEqual(previousEnd);
      previousEnd = end;
    }
  });

  it('keeps every timestamp in the past', () => {
    const stamps = [
      ...db.clients.flatMap((c) => [c.createdAt, c.updatedAt]),
      ...db.projects.flatMap((p) => [p.createdAt, p.updatedAt]),
      ...db.entries.flatMap((e) => [e.createdAt, e.updatedAt]),
      ...db.invoices.flatMap((i) => [i.createdAt, i.updatedAt, i.sentAt, i.paidAt]),
    ];
    for (const stamp of stamps) {
      if (stamp !== null) expect(Date.parse(stamp)).toBeLessThanOrEqual(now.getTime());
    }
  });

  it('covers about ten weeks of mostly weekday work in office hours', () => {
    const first = Math.min(...db.entries.map((entry) => Date.parse(entry.start)));
    expect(now.getTime() - first).toBeGreaterThan(9 * 7 * DAY_MS);

    const weekend = db.entries.filter((entry) => [0, 6].includes(new Date(entry.start).getDay()));
    expect(weekend.length).toBeLessThan(db.entries.length * 0.05);

    for (const entry of db.entries) {
      const start = new Date(entry.start);
      const end = new Date(entry.end ?? '');
      expect(start.getHours() * 60 + start.getMinutes()).toBeGreaterThanOrEqual(8 * 60 + 30);
      expect(end.getHours() * 60 + end.getMinutes()).toBeLessThanOrEqual(18 * 60 + 30);
    }

    const perDay = new Map<string, number>();
    for (const entry of db.entries) {
      const key = toDateKey(new Date(entry.start));
      perDay.set(key, (perDay.get(key) ?? 0) + 1);
    }
    expect(Math.max(...perDay.values())).toBeLessThanOrEqual(5);
  });

  it('has four clients, internal and archived projects', () => {
    expect(db.clients.map((client) => client.name)).toEqual([
      'Orchard & Pine Hotels',
      'Kestrel Outdoor Co.',
      'Lumen Health Clinic',
      'Ferro Architetti',
    ]);
    const internal = db.projects.filter((project) => project.clientId === null);
    expect(internal).toHaveLength(2);
    expect(internal.every((project) => !project.billableByDefault)).toBe(true);
    expect(db.projects.filter((project) => project.archived)).toHaveLength(1);

    const internalIds = new Set(internal.map((project) => project.id));
    const internalEntries = db.entries.filter((e) => internalIds.has(e.projectId ?? ''));
    expect(internalEntries.every((entry) => !entry.billable)).toBe(true);
  });

  it('shows one project near its budget and one over it', () => {
    const levels = db.projects.map(
      (project) => getBudgetUsage(project.budgetHours, trackedSeconds(db, project.id))?.level,
    );
    expect(levels).toContain('warning');
    expect(levels).toContain('over');
  });

  it('has paid, overdue, upcoming and draft invoices for the right entries', () => {
    const today = toDateKey(now);
    const statuses = db.invoices.map((invoice) => getInvoiceDisplayStatus(invoice, today)).sort();
    expect(statuses).toEqual(['draft', 'overdue', 'paid', 'paid', 'sent']);

    for (const invoice of db.invoices) {
      const lineEntryIds = invoice.lines.flatMap((line) => line.entryIds);
      const linked = db.entries.filter((entry) => entry.invoiceId === invoice.id);
      expect(linked.map((entry) => entry.id).sort()).toEqual([...lineEntryIds].sort());
      expect(invoice.number).toMatch(/^MS-\d{4}-\d{3}$/);
    }
    expect(new Set(db.invoices.map((invoice) => invoice.number)).size).toBe(db.invoices.length);
  });

  it('leaves the last three weeks unbilled', () => {
    const cutoff = now.getTime() - 21 * DAY_MS;
    const recent = db.entries.filter((entry) => Date.parse(entry.start) >= cutoff);
    expect(recent.length).toBeGreaterThan(0);
    expect(recent.every((entry) => entry.invoiceId === null)).toBe(true);
  });

  it('is deterministic for the same moment', () => {
    expect(createDemoDatabase(new Date(now.getTime()))).toEqual(db);
  });
});

describe('createDemoDatabase', () => {
  it('uses the Moreau Studio persona', () => {
    const { settings } = createDemoDatabase(new Date(2026, 9, 9, 12));
    expect(settings).toMatchObject({ ownerName: 'Alex Moreau', businessName: 'Moreau Studio' });
  });

  it('includes this morning’s work but nothing later', () => {
    const now = new Date(2026, 9, 9, 15, 20, 0);
    const today = toDateKey(now);
    const todays = createDemoDatabase(now).entries.filter(
      (entry) => toDateKey(new Date(entry.start)) === today,
    );
    expect(todays.length).toBeGreaterThan(0);
  });
});

describe('createEmptyDatabase', () => {
  it('is valid and empty, with settings for the browser locale', () => {
    const db = createEmptyDatabase('en-US');
    expect(databaseSchema.safeParse(db).success).toBe(true);
    expect(db).toMatchObject({ clients: [], projects: [], entries: [], invoices: [] });
    expect(db.settings.locale).toBe('en-US');
  });
});
