import { describe, expect, it } from 'vitest';
import {
  RANGE_PRESET_LABELS,
  RANGE_PRESETS,
  combineDateAndTime,
  dateFromKey,
  isRangePreset,
  isWithinRange,
  lastDayOf,
  parseDateKey,
  presetRange,
  rangeFromKeys,
  todayKey,
  toDateKey,
  toTimeInputValue,
  weekRange,
  weekStartOf,
  type DateRange,
  type RangePreset,
  type WeekStart,
} from '@/lib/dates';

const keys = (range: DateRange) => [toDateKey(range.from), toDateKey(range.to)];

describe('date keys', () => {
  it('formats local calendar days', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
    expect(todayKey(new Date(2026, 9, 9, 23, 59))).toBe('2026-10-09');
  });

  it.each(['2026-10-09', '2028-02-29', '2026-01-01', '2026-12-31'])(
    'parses %s to local midnight',
    (key) => {
      const date = parseDateKey(key);
      expect(date).not.toBeNull();
      expect(date?.getHours()).toBe(0);
      expect(date && toDateKey(date)).toBe(key);
    },
  );

  it.each(['2026-02-31', '2026-02-29', '2026-13-01', '2026-00-10', '2026-1-5', '20261009', 'abc', ''])(
    'rejects %j',
    (key) => {
      expect(parseDateKey(key)).toBeNull();
    },
  );

  it('dateFromKey throws on invalid keys', () => {
    expect(dateFromKey('2026-10-09')).toEqual(new Date(2026, 9, 9));
    expect(() => dateFromKey('2026-02-30')).toThrow(/Invalid date key/);
  });
});

describe('weeks', () => {
  it.each([
    // [date, weekStartsOn, expected week start]
    [new Date(2026, 9, 8, 12), 1, '2026-10-05'],
    [new Date(2026, 9, 8, 12), 0, '2026-10-04'],
    [new Date(2026, 9, 11, 12), 1, '2026-10-05'],
    [new Date(2026, 9, 11, 12), 0, '2026-10-11'],
    [new Date(2026, 9, 5, 0, 0), 1, '2026-10-05'],
    [new Date(2026, 0, 1, 12), 1, '2025-12-29'],
  ] as const)('weekStartOf(%s, %d) → %s', (date, weekStartsOn, expected) => {
    expect(toDateKey(weekStartOf(date, weekStartsOn))).toBe(expected);
  });

  it('weekRange spans seven days, end exclusive', () => {
    expect(keys(weekRange(new Date(2026, 9, 8), 1))).toEqual(['2026-10-05', '2026-10-12']);
    expect(keys(weekRange(new Date(2026, 9, 8), 0))).toEqual(['2026-10-04', '2026-10-11']);
  });
});

describe('ranges', () => {
  it('builds half-open ranges from inclusive keys', () => {
    const range = rangeFromKeys('2026-10-01', '2026-10-31');
    expect(range && keys(range)).toEqual(['2026-10-01', '2026-11-01']);
    expect(range && toDateKey(lastDayOf(range))).toBe('2026-10-31');
    const single = rangeFromKeys('2026-10-09', '2026-10-09');
    expect(single && keys(single)).toEqual(['2026-10-09', '2026-10-10']);
  });

  it.each([
    ['2026-10-31', '2026-10-01'],
    ['2026-02-30', '2026-03-01'],
    ['2026-10-01', 'tomorrow'],
  ])('rejects rangeFromKeys(%s, %s)', (from, to) => {
    expect(rangeFromKeys(from, to)).toBeNull();
  });

  it('isWithinRange includes from and excludes to', () => {
    const range = { from: new Date(2026, 9, 1), to: new Date(2026, 9, 2) };
    expect(isWithinRange(new Date(2026, 9, 1), range)).toBe(true);
    expect(isWithinRange(new Date(2026, 9, 1, 23, 59, 59, 999), range)).toBe(true);
    expect(isWithinRange(new Date(2026, 9, 2), range)).toBe(false);
    expect(isWithinRange(new Date(2026, 8, 30, 23, 59).getTime(), range)).toBe(false);
  });
});

describe('presets', () => {
  /** Thursday 8 October 2026, mid-afternoon. */
  const now = new Date(2026, 9, 8, 15, 30);

  it.each([
    ['this-week', 1, '2026-10-05', '2026-10-12'],
    ['this-week', 0, '2026-10-04', '2026-10-11'],
    ['last-week', 1, '2026-09-28', '2026-10-05'],
    ['last-week', 0, '2026-09-27', '2026-10-04'],
    ['this-month', 1, '2026-10-01', '2026-11-01'],
    ['last-month', 1, '2026-09-01', '2026-10-01'],
    ['last-30-days', 1, '2026-09-09', '2026-10-09'],
    ['last-90-days', 1, '2026-07-11', '2026-10-09'],
    ['this-quarter', 1, '2026-10-01', '2027-01-01'],
    ['this-year', 1, '2026-01-01', '2027-01-01'],
  ] as const)('%s (week starts %d) → %s … %s', (preset, weekStartsOn, from, to) => {
    expect(keys(presetRange(preset, now, weekStartsOn))).toEqual([from, to]);
  });

  it('handles the year boundary for last month and this quarter', () => {
    const january = new Date(2026, 0, 15, 9);
    expect(keys(presetRange('last-month', january, 1))).toEqual(['2025-12-01', '2026-01-01']);
    expect(keys(presetRange('this-quarter', january, 1))).toEqual(['2026-01-01', '2026-04-01']);
  });

  it('has a label for every preset and recognises preset ids', () => {
    for (const preset of RANGE_PRESETS) {
      expect(RANGE_PRESET_LABELS[preset]).toMatch(/^[A-Z]/);
      expect(isRangePreset(preset)).toBe(true);
    }
    expect(isRangePreset('yesterday')).toBe(false);
    expect(isRangePreset(null)).toBe(false);
    expect(isRangePreset(undefined)).toBe(false);
  });

  it('current presets contain now; past presets end before it', () => {
    const current: RangePreset[] = [
      'this-week',
      'this-month',
      'last-30-days',
      'last-90-days',
      'this-quarter',
      'this-year',
    ];
    for (const weekStartsOn of [0, 1] as WeekStart[]) {
      for (const preset of current) {
        expect(isWithinRange(now, presetRange(preset, now, weekStartsOn))).toBe(true);
      }
      for (const preset of ['last-week', 'last-month'] as const) {
        expect(presetRange(preset, now, weekStartsOn).to <= now).toBe(true);
      }
    }
  });
});

describe('time inputs', () => {
  it('combines a date key and HH:mm into local time', () => {
    expect(combineDateAndTime('2026-10-08', '09:30')).toEqual(new Date(2026, 9, 8, 9, 30));
    expect(combineDateAndTime('2026-10-08', '23:59')).toEqual(new Date(2026, 9, 8, 23, 59));
    expect(combineDateAndTime('2026-10-08', '00:00')).toEqual(new Date(2026, 9, 8));
  });

  it.each([
    ['2026-10-08', '24:00'],
    ['2026-10-08', '12:60'],
    ['2026-10-08', '9:30'],
    ['2026-10-08', ''],
    ['2026-02-30', '09:00'],
  ])('rejects combineDateAndTime(%s, %j)', (dateKey, time) => {
    expect(combineDateAndTime(dateKey, time)).toBeNull();
  });

  it('formats times for <input type="time">', () => {
    expect(toTimeInputValue(new Date(2026, 9, 8, 7, 5))).toBe('07:05');
    expect(toTimeInputValue(new Date(2026, 9, 8, 23, 59, 59))).toBe('23:59');
  });
});
