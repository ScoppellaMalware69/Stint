import { addDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { createBillingContext } from '@/domain/billing';
import type { Client, Project, Settings, TimeEntry } from '@/domain/models';
import {
  breakdownByClient,
  breakdownByProject,
  bucketizeEntries,
  buildBuckets,
  chooseGranularity,
  type TimeBucket,
} from '@/domain/reports';
import { toDateKey, type DateRange } from '@/lib/dates';

const STAMP = '2026-01-01T00:00:00.000Z';
const HOUR = 3600;

const range = (from: Date, to: Date): DateRange => ({ from, to });
const daysFrom = (from: Date, days: number) => range(from, addDays(from, days));
const bucketKeys = (buckets: TimeBucket[]) => buckets.map((bucket) => bucket.key);

let sequence = 0;
function makeEntry(start: Date, minutes: number | null, overrides: Partial<TimeEntry> = {}): TimeEntry {
  sequence += 1;
  return {
    id: `e${sequence}`,
    description: '',
    projectId: null,
    start: start.toISOString(),
    end: minutes === null ? null : new Date(start.getTime() + minutes * 60_000).toISOString(),
    billable: false,
    invoiceId: null,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  };
}

describe('chooseGranularity', () => {
  const january = new Date(2026, 0, 1);
  it.each([
    [1, 'day'],
    [7, 'day'],
    [35, 'day'],
    [36, 'week'],
    [90, 'week'],
    [183, 'week'],
    [184, 'month'],
    [365, 'month'],
  ] as const)('%d days → %s', (days, expected) => {
    expect(chooseGranularity(daysFrom(january, days))).toBe(expected);
  });

  it('counts calendar days across daylight-saving changes', () => {
    expect(chooseGranularity(daysFrom(new Date(2026, 2, 1), 35))).toBe('day');
    expect(chooseGranularity(daysFrom(new Date(2026, 9, 1), 36))).toBe('week');
  });
});

describe('buildBuckets', () => {
  it('builds contiguous local days across a month boundary', () => {
    const buckets = buildBuckets(range(new Date(2026, 8, 29), new Date(2026, 9, 3)), 'day', 1);
    expect(bucketKeys(buckets)).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
    expect(buckets[0]?.start).toEqual(new Date(2026, 8, 29));
    expect(buckets[1]?.end).toEqual(new Date(2026, 9, 1));
    buckets.slice(1).forEach((bucket, index) => expect(bucket.start).toEqual(buckets[index]?.end));
  });

  it.each([
    [1, ['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19']],
    [0, ['2026-09-27', '2026-10-04', '2026-10-11', '2026-10-18']],
  ] as const)('aligns weeks to the week start (%d)', (weekStartsOn, expected) => {
    // Thursday 1 October to Thursday 22 October (exclusive).
    const buckets = buildBuckets(range(new Date(2026, 9, 1), new Date(2026, 9, 22)), 'week', weekStartsOn);
    expect(bucketKeys(buckets)).toEqual(expected);
    expect(toDateKey(buckets[3]?.end ?? new Date(Number.NaN))).toBe(
      weekStartsOn === 1 ? '2026-10-26' : '2026-10-25',
    );
  });

  it('builds whole months across a year boundary', () => {
    const buckets = buildBuckets(range(new Date(2025, 10, 15), new Date(2026, 1, 10)), 'month', 1);
    expect(bucketKeys(buckets)).toEqual(['2025-11-01', '2025-12-01', '2026-01-01', '2026-02-01']);
    expect(buckets[3]?.end).toEqual(new Date(2026, 2, 1));
  });

  it('returns nothing for an empty range', () => {
    const day = new Date(2026, 9, 9);
    expect(buildBuckets(range(day, day), 'day', 1)).toEqual([]);
  });
});

describe('bucketizeEntries', () => {
  const days = buildBuckets(range(new Date(2026, 8, 29), new Date(2026, 9, 3)), 'day', 1);
  const seriesOf = (entry: TimeEntry) => entry.projectId ?? 'none';

  it('adds each entry to the bucket containing its start', () => {
    const totals = bucketizeEntries(
      [
        makeEntry(new Date(2026, 8, 30, 23, 30), 60, { projectId: 'a' }), // crosses midnight
        makeEntry(new Date(2026, 9, 1, 0, 0), 30, { projectId: 'a' }), // exactly on the boundary
        makeEntry(new Date(2026, 9, 2, 9), 90, { projectId: 'a' }),
        makeEntry(new Date(2026, 9, 2, 14), 45),
        makeEntry(new Date(2026, 9, 5, 9), 60, { projectId: 'a' }), // outside every bucket
        makeEntry(new Date(2026, 8, 28, 9), 60, { projectId: 'a' }), // before the first bucket
      ],
      days,
      seriesOf,
    );
    expect(totals.map((row) => row.bucket.key)).toEqual(bucketKeys(days));
    expect(totals.map((row) => row.total)).toEqual([0, HOUR, 1800, 5400 + 2700]);
    expect(totals.map((row) => row.values)).toEqual([{}, { a: HOUR }, { a: 1800 }, { a: 5400, none: 2700 }]);
  });

  it('measures running entries up to now', () => {
    const start = new Date(2026, 9, 2, 16);
    const totals = bucketizeEntries([makeEntry(start, null)], days, seriesOf, start.getTime() + 600_000);
    expect(totals[3]?.values).toEqual({ none: 600 });
  });

  it('splits month and week buckets on the right side of the boundary', () => {
    const months = buildBuckets(range(new Date(2026, 8, 1), new Date(2026, 10, 1)), 'month', 1);
    const monthTotals = bucketizeEntries(
      [makeEntry(new Date(2026, 8, 30, 23, 59), 10), makeEntry(new Date(2026, 9, 1, 0, 0), 20)],
      months,
      seriesOf,
    );
    expect(monthTotals.map((row) => row.total)).toEqual([600, 1200]);

    const sunday = makeEntry(new Date(2026, 9, 4, 10), 60);
    const mondayWeeks = buildBuckets(range(new Date(2026, 8, 28), new Date(2026, 9, 12)), 'week', 1);
    const sundayWeeks = buildBuckets(range(new Date(2026, 8, 27), new Date(2026, 9, 11)), 'week', 0);
    expect(bucketizeEntries([sunday], mondayWeeks, seriesOf).map((row) => row.total)).toEqual([HOUR, 0]);
    expect(bucketizeEntries([sunday], sundayWeeks, seriesOf).map((row) => row.total)).toEqual([0, HOUR]);
  });

  it('returns an empty row per bucket when there are no entries', () => {
    expect(bucketizeEntries([], days, seriesOf).every((row) => row.total === 0)).toBe(true);
  });
});

describe('breakdowns', () => {
  const settings: Settings = {
    ownerName: '',
    businessName: '',
    businessEmail: null,
    businessAddress: null,
    taxId: null,
    currency: 'EUR',
    locale: 'en-GB',
    defaultHourlyRateCents: 6000,
    weekStartsOn: 1,
    weeklyTargetHours: 35,
    roundingIncrementMinutes: 0,
    roundingMode: 'up',
    invoicePrefix: 'INV-',
    paymentTermsDays: 30,
    defaultTaxRateBps: 0,
  };
  const client = (id: string): Client => ({
    id,
    name: id,
    email: null,
    address: null,
    hourlyRateCents: null,
    archived: false,
    createdAt: STAMP,
    updatedAt: STAMP,
  });
  const project = (id: string, clientId: string | null, rate: number | null): Project => ({
    id,
    name: id,
    clientId,
    color: 'blue',
    hourlyRateCents: rate,
    budgetHours: null,
    billableByDefault: true,
    notes: null,
    archived: false,
    createdAt: STAMP,
    updatedAt: STAMP,
  });
  const ctx = createBillingContext(
    settings,
    [project('p1', 'c1', 12_000), project('p2', 'c1', null), project('p3', 'c2', null), project('internal', null, null)],
    [client('c1'), client('c2')],
  );
  const monday = new Date(2026, 9, 5, 9);
  const entries = [
    makeEntry(monday, 120, { projectId: 'p1', billable: true }),
    makeEntry(monday, 60, { projectId: 'p1', billable: false }),
    makeEntry(monday, 150, { projectId: 'p2', billable: false }),
    makeEntry(monday, 30, { projectId: 'p3', billable: true }),
    makeEntry(monday, 60, { projectId: 'internal', billable: true }),
    makeEntry(monday, 90),
  ];

  it('totals by project, most time first, with "no project" as id null', () => {
    expect(breakdownByProject(entries, ctx)).toEqual([
      { id: 'p1', trackedSeconds: 3 * HOUR, billableSeconds: 2 * HOUR, amountCents: 24_000, entryCount: 2 },
      { id: 'p2', trackedSeconds: 2.5 * HOUR, billableSeconds: 0, amountCents: 0, entryCount: 1 },
      { id: null, trackedSeconds: 1.5 * HOUR, billableSeconds: 0, amountCents: 0, entryCount: 1 },
      { id: 'internal', trackedSeconds: HOUR, billableSeconds: 0, amountCents: 0, entryCount: 1 },
      { id: 'p3', trackedSeconds: 0.5 * HOUR, billableSeconds: 0.5 * HOUR, amountCents: 3000, entryCount: 1 },
    ]);
  });

  it('totals by client, grouping internal and unassigned time under null', () => {
    expect(breakdownByClient(entries, ctx)).toEqual([
      { id: 'c1', trackedSeconds: 5.5 * HOUR, billableSeconds: 2 * HOUR, amountCents: 24_000, entryCount: 3 },
      { id: null, trackedSeconds: 2.5 * HOUR, billableSeconds: 0, amountCents: 0, entryCount: 2 },
      { id: 'c2', trackedSeconds: 0.5 * HOUR, billableSeconds: 0.5 * HOUR, amountCents: 3000, entryCount: 1 },
    ]);
  });

  it('breaks ties by amount, then puts the "none" group last', () => {
    const tied = [
      makeEntry(monday, 60),
      makeEntry(monday, 60, { projectId: 'p2' }),
      makeEntry(monday, 60, { projectId: 'p1', billable: true }),
    ];
    expect(breakdownByProject(tied, ctx).map((row) => row.id)).toEqual(['p1', 'p2', null]);
  });

  it('includes running entries up to now', () => {
    const running = makeEntry(monday, null, { projectId: 'p1', billable: true });
    const [row] = breakdownByProject([running], ctx, monday.getTime() + 30 * 60_000);
    expect(row).toEqual({ id: 'p1', trackedSeconds: 1800, billableSeconds: 1800, amountCents: 6000, entryCount: 1 });
  });
});
