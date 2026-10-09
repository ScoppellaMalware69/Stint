/**
 * Time entry calculations. A running entry (`end === null`) is measured up to `now`,
 * which callers pass explicitly (usually from `useNow()`) so results stay deterministic.
 */
import type { TimeEntry } from '@/domain/models';
import { dateFromKey, toDateKey } from '@/lib/dates';

/** Manual entries may be at most 24 hours long. */
export const MAX_MANUAL_ENTRY_SECONDS = 86_400;
/** Entries longer than 12 hours are flagged as "unusually long" (likely a forgotten timer). */
export const LONG_ENTRY_WARNING_SECONDS = 43_200;

export function isRunning(entry: Pick<TimeEntry, 'end'>): boolean {
  return entry.end === null;
}

/** Whole seconds between start and end (or `now` while running); never negative. */
export function entryDurationSeconds(
  entry: Pick<TimeEntry, 'start' | 'end'>,
  now: number = Date.now(),
): number {
  const start = Date.parse(entry.start);
  const end = entry.end === null ? now : Date.parse(entry.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 1000));
}

export function totalDurationSeconds(
  entries: ReadonlyArray<Pick<TimeEntry, 'start' | 'end'>>,
  now: number = Date.now(),
): number {
  let total = 0;
  for (const entry of entries) total += entryDurationSeconds(entry, now);
  return total;
}

export function isUnusuallyLong(
  entry: Pick<TimeEntry, 'start' | 'end'>,
  now: number = Date.now(),
): boolean {
  return entryDurationSeconds(entry, now) > LONG_ENTRY_WARNING_SECONDS;
}

export interface DayGroup {
  /** Local calendar day (`YYYY-MM-DD`) on which the entries started. */
  dateKey: string;
  /** Local midnight of that day. */
  date: Date;
  entries: TimeEntry[];
  totalSeconds: number;
}

const byStartDesc = (a: TimeEntry, b: TimeEntry) => Date.parse(b.start) - Date.parse(a.start);

/** Groups entries by the local day they started on: newest day first, entries newest first. */
export function groupEntriesByDay(
  entries: readonly TimeEntry[],
  now: number = Date.now(),
): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const entry of [...entries].sort(byStartDesc)) {
    const dateKey = toDateKey(new Date(entry.start));
    let group = groups.get(dateKey);
    if (!group) {
      group = { dateKey, date: dateFromKey(dateKey), entries: [], totalSeconds: 0 };
      groups.set(dateKey, group);
    }
    group.entries.push(entry);
    group.totalSeconds += entryDurationSeconds(entry, now);
  }
  // Entries were visited newest first, so the groups are already in newest-day-first order.
  return [...groups.values()];
}
