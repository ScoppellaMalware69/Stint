import { describe, expect, it } from 'vitest';
import type { TimeEntry } from '@/domain/models';
import {
  LONG_ENTRY_WARNING_SECONDS,
  MAX_MANUAL_ENTRY_SECONDS,
  entryDurationSeconds,
  groupEntriesByDay,
  isRunning,
  isUnusuallyLong,
  totalDurationSeconds,
} from '@/domain/time-entries';

let sequence = 0;
function makeEntry(start: Date, end: Date | null, overrides: Partial<TimeEntry> = {}): TimeEntry {
  sequence += 1;
  return {
    id: `e${sequence}`,
    description: '',
    projectId: null,
    start: start.toISOString(),
    end: end ? end.toISOString() : null,
    billable: false,
    invoiceId: null,
    createdAt: start.toISOString(),
    updatedAt: start.toISOString(),
    ...overrides,
  };
}

const at = (day: number, hour: number, minute = 0, second = 0) =>
  new Date(2026, 9, day, hour, minute, second);

describe('entry durations', () => {
  it('exposes the limits', () => {
    expect(MAX_MANUAL_ENTRY_SECONDS).toBe(24 * 3600);
    expect(LONG_ENTRY_WARNING_SECONDS).toBe(12 * 3600);
  });

  it.each([
    [at(5, 9), at(5, 10, 30), 5400],
    [at(5, 9), at(5, 9), 0],
    [at(5, 10), at(5, 9), 0],
    [at(5, 23), at(6, 1), 7200],
    [at(5, 9, 0, 0), at(5, 9, 0, 59), 59],
  ])('%s → %s lasts %d seconds', (start, end, expected) => {
    expect(entryDurationSeconds(makeEntry(start, end))).toBe(expected);
  });

  it('floors partial seconds', () => {
    const entry = { start: '2026-10-05T09:00:00.000Z', end: '2026-10-05T09:00:01.999Z' };
    expect(entryDurationSeconds(entry)).toBe(1);
  });

  it('measures running entries up to now', () => {
    const running = makeEntry(at(5, 9), null);
    expect(isRunning(running)).toBe(true);
    expect(entryDurationSeconds(running, at(5, 9, 25).getTime())).toBe(1500);
    expect(entryDurationSeconds(running, at(5, 8).getTime())).toBe(0);
  });

  it('treats unparsable timestamps as zero length', () => {
    expect(entryDurationSeconds({ start: 'garbage', end: null }, Date.now())).toBe(0);
  });

  it('sums durations including the running entry', () => {
    const entries = [
      makeEntry(at(5, 9), at(5, 10)),
      makeEntry(at(5, 11), at(5, 11, 30)),
      makeEntry(at(5, 13), null),
    ];
    expect(totalDurationSeconds(entries, at(5, 13, 15).getTime())).toBe(3600 + 1800 + 900);
    expect(totalDurationSeconds([])).toBe(0);
    expect(isRunning(entries[0] as TimeEntry)).toBe(false);
  });

  it('flags entries longer than 12 hours, not exactly 12', () => {
    expect(isUnusuallyLong(makeEntry(at(5, 8), at(5, 20)))).toBe(false);
    expect(isUnusuallyLong(makeEntry(at(5, 8), at(5, 20, 0, 1)))).toBe(true);
    const forgotten = makeEntry(at(5, 8), null);
    expect(isUnusuallyLong(forgotten, at(5, 19).getTime())).toBe(false);
    expect(isUnusuallyLong(forgotten, at(6, 8).getTime())).toBe(true);
  });
});

describe('groupEntriesByDay', () => {
  it('groups by local start day, newest day and newest entry first', () => {
    const mondayMorning = makeEntry(at(5, 9), at(5, 10));
    const mondayLate = makeEntry(at(5, 23, 30), at(6, 0, 30));
    const wednesday = makeEntry(at(7, 14), at(7, 14, 45));
    const tuesday = makeEntry(at(6, 8), at(6, 8, 15));
    const running = makeEntry(at(7, 16), null);

    const groups = groupEntriesByDay(
      [mondayMorning, wednesday, running, mondayLate, tuesday],
      at(7, 16, 30).getTime(),
    );

    expect(groups.map((group) => group.dateKey)).toEqual(['2026-10-07', '2026-10-06', '2026-10-05']);
    expect(groups.map((group) => group.entries.map((entry) => entry.id))).toEqual([
      [running.id, wednesday.id],
      [tuesday.id],
      [mondayLate.id, mondayMorning.id],
    ]);
    expect(groups.map((group) => group.totalSeconds)).toEqual([2700 + 1800, 900, 3600 + 3600]);
    expect(groups[0]?.date).toEqual(new Date(2026, 9, 7));
  });

  it('returns no groups for no entries', () => {
    expect(groupEntriesByDay([])).toEqual([]);
  });
});
