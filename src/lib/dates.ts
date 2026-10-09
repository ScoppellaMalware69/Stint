/**
 * Calendar helpers. All functions work in the browser's local time zone, which is
 * what users expect when they think about "today" or "this week".
 *
 * Ranges are half-open: `{ from, to }` includes `from` and excludes `to`, which
 * avoids 23:59:59.999 edge cases when comparing timestamps.
 */
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  isValid,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  subDays,
} from 'date-fns';

export type WeekStart = 0 | 1;

export interface DateRange {
  from: Date;
  /** Exclusive end. */
  to: Date;
}

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Formats a date as a local `YYYY-MM-DD` key. */
export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Parses a `YYYY-MM-DD` key into local midnight, or `null` if it is not a real date. */
export function parseDateKey(key: string): Date | null {
  const match = DATE_KEY_PATTERN.exec(key);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  // Reject overflow such as 2026-02-31, which `Date` silently rolls into March.
  if (!isValid(date) || toDateKey(date) !== key) return null;
  return date;
}

/** Like `parseDateKey` but throws; use only for keys that were already validated. */
export function dateFromKey(key: string): Date {
  const date = parseDateKey(key);
  if (!date) throw new Error(`Invalid date key: ${key}`);
  return date;
}

export function todayKey(now: Date = new Date()): string {
  return toDateKey(now);
}

export function weekStartOf(date: Date, weekStartsOn: WeekStart): Date {
  return startOfWeek(date, { weekStartsOn });
}

export function weekRange(date: Date, weekStartsOn: WeekStart): DateRange {
  const from = weekStartOf(date, weekStartsOn);
  return { from, to: addWeeks(from, 1) };
}

/** Builds a range from inclusive start/end date keys. */
export function rangeFromKeys(fromKey: string, toKey: string): DateRange | null {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  if (!from || !to || to < from) return null;
  return { from, to: addDays(to, 1) };
}

/** The inclusive last day of a half-open range. */
export function lastDayOf(range: DateRange): Date {
  return subDays(range.to, 1);
}

export function isWithinRange(instant: Date | number, range: DateRange): boolean {
  const time = typeof instant === 'number' ? instant : instant.getTime();
  return time >= range.from.getTime() && time < range.to.getTime();
}

export const RANGE_PRESETS = [
  'this-week',
  'last-week',
  'this-month',
  'last-month',
  'last-30-days',
  'last-90-days',
  'this-quarter',
  'this-year',
] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export const RANGE_PRESET_LABELS: Record<RangePreset, string> = {
  'this-week': 'This week',
  'last-week': 'Last week',
  'this-month': 'This month',
  'last-month': 'Last month',
  'last-30-days': 'Last 30 days',
  'last-90-days': 'Last 90 days',
  'this-quarter': 'This quarter',
  'this-year': 'This year',
};

export function isRangePreset(value: string | null | undefined): value is RangePreset {
  return RANGE_PRESETS.includes(value as RangePreset);
}

export function presetRange(preset: RangePreset, now: Date, weekStartsOn: WeekStart): DateRange {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  switch (preset) {
    case 'this-week':
      return weekRange(now, weekStartsOn);
    case 'last-week':
      return weekRange(addWeeks(now, -1), weekStartsOn);
    case 'this-month':
      return { from: startOfMonth(now), to: addMonths(startOfMonth(now), 1) };
    case 'last-month': {
      const from = startOfMonth(addMonths(now, -1));
      return { from, to: addMonths(from, 1) };
    }
    case 'last-30-days':
      return { from: subDays(tomorrow, 30), to: tomorrow };
    case 'last-90-days':
      return { from: subDays(tomorrow, 90), to: tomorrow };
    case 'this-quarter':
      return { from: startOfQuarter(now), to: addMonths(startOfQuarter(now), 3) };
    case 'this-year':
      return { from: startOfYear(now), to: addMonths(startOfYear(now), 12) };
  }
}

/** Combines a local date key (`YYYY-MM-DD`) and a time (`HH:mm`) into a Date. */
export function combineDateAndTime(dateKey: string, time: string): Date | null {
  const date = parseDateKey(dateKey);
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!date || !match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/** Formats a Date as a local `HH:mm` value for `<input type="time">`. */
export function toTimeInputValue(date: Date): string {
  return format(date, 'HH:mm');
}
