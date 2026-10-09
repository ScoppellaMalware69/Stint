/**
 * Report aggregation: calendar buckets for charts and per-project / per-client breakdowns.
 * Buckets are built in local time, so a "day" is the user's calendar day.
 */
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {
  canBeBilled,
  clientForProject,
  entryAmountCents,
  type BillingContext,
} from '@/domain/billing';
import type { TimeEntry } from '@/domain/models';
import { entryDurationSeconds } from '@/domain/time-entries';
import { toDateKey, type DateRange, type WeekStart } from '@/lib/dates';

export type Granularity = 'day' | 'week' | 'month';

export interface TimeBucket {
  /** Date key (`YYYY-MM-DD`) of the bucket's first day. */
  key: string;
  start: Date;
  /** Exclusive. */
  end: Date;
}

/** ≤ 35 days → daily columns, ≤ 183 days → weekly, longer → monthly. */
export function chooseGranularity(range: DateRange): Granularity {
  const days = differenceInCalendarDays(range.to, range.from);
  if (days <= 35) return 'day';
  if (days <= 183) return 'week';
  return 'month';
}

const bucketStart: Record<Granularity, (date: Date, weekStartsOn: WeekStart) => Date> = {
  day: (date) => startOfDay(date),
  week: (date, weekStartsOn) => startOfWeek(date, { weekStartsOn }),
  month: (date) => startOfMonth(date),
};

const nextBucketStart: Record<Granularity, (start: Date) => Date> = {
  day: (start) => addDays(start, 1),
  week: (start) => addWeeks(start, 1),
  month: (start) => addMonths(start, 1),
};

/**
 * Consecutive buckets covering the range. The first bucket starts on the calendar
 * boundary at or before `range.from` (e.g. the start of its week), so keys always
 * identify whole days, weeks or months.
 */
export function buildBuckets(
  range: DateRange,
  granularity: Granularity,
  weekStartsOn: WeekStart,
): TimeBucket[] {
  const buckets: TimeBucket[] = [];
  const next = nextBucketStart[granularity];
  for (
    let start = bucketStart[granularity](range.from, weekStartsOn);
    start < range.to;
    start = next(start)
  ) {
    buckets.push({ key: toDateKey(start), start, end: next(start) });
  }
  return buckets;
}

export interface BucketTotals {
  bucket: TimeBucket;
  /** Tracked seconds per series id; series without time are absent. */
  values: Record<string, number>;
  total: number;
}

/** Index of the bucket containing `time` (buckets are sorted and contiguous), or -1. */
function findBucketIndex(buckets: readonly TimeBucket[], time: number): number {
  let low = 0;
  let high = buckets.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const bucket = buckets[middle];
    if (!bucket) break;
    if (time < bucket.start.getTime()) high = middle - 1;
    else if (time >= bucket.end.getTime()) low = middle + 1;
    else return middle;
  }
  return -1;
}

/**
 * Sums tracked seconds per bucket and series. Each entry counts in full towards the
 * bucket containing its start; entries starting outside every bucket are ignored.
 */
export function bucketizeEntries(
  entries: readonly TimeEntry[],
  buckets: readonly TimeBucket[],
  seriesOf: (entry: TimeEntry) => string,
  now: number = Date.now(),
): BucketTotals[] {
  const totals: BucketTotals[] = buckets.map((bucket) => ({ bucket, values: {}, total: 0 }));
  for (const entry of entries) {
    const row = totals[findBucketIndex(buckets, Date.parse(entry.start))];
    if (!row) continue;
    const seconds = entryDurationSeconds(entry, now);
    const series = seriesOf(entry);
    row.values[series] = (row.values[series] ?? 0) + seconds;
    row.total += seconds;
  }
  return totals;
}

export interface BreakdownRow {
  /** Project or client id; `null` groups entries without a project / client. */
  id: string | null;
  trackedSeconds: number;
  billableSeconds: number;
  amountCents: number;
  entryCount: number;
}

function breakdownBy(
  entries: readonly TimeEntry[],
  ctx: BillingContext,
  now: number,
  keyOf: (entry: TimeEntry) => string | null,
): BreakdownRow[] {
  const rows = new Map<string | null, BreakdownRow>();
  for (const entry of entries) {
    const id = keyOf(entry);
    let row = rows.get(id);
    if (!row) {
      row = { id, trackedSeconds: 0, billableSeconds: 0, amountCents: 0, entryCount: 0 };
      rows.set(id, row);
    }
    const seconds = entryDurationSeconds(entry, now);
    row.trackedSeconds += seconds;
    if (canBeBilled(entry, ctx)) row.billableSeconds += seconds;
    row.amountCents += entryAmountCents(entry, ctx, now);
    row.entryCount += 1;
  }
  // Most time first; ties fall back to amount, then id with the "none" group last.
  return [...rows.values()].sort(
    (a, b) =>
      b.trackedSeconds - a.trackedSeconds ||
      b.amountCents - a.amountCents ||
      (a.id === null ? 1 : 0) - (b.id === null ? 1 : 0) ||
      (a.id ?? '').localeCompare(b.id ?? ''),
  );
}

export function breakdownByProject(
  entries: readonly TimeEntry[],
  ctx: BillingContext,
  now: number = Date.now(),
): BreakdownRow[] {
  return breakdownBy(entries, ctx, now, (entry) => entry.projectId);
}

export function breakdownByClient(
  entries: readonly TimeEntry[],
  ctx: BillingContext,
  now: number = Date.now(),
): BreakdownRow[] {
  return breakdownBy(entries, ctx, now, (entry) => {
    const project = entry.projectId === null ? null : ctx.projectsById.get(entry.projectId);
    return clientForProject(project, ctx)?.id ?? null;
  });
}
