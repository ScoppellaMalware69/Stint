/**
 * Locale-aware display formatting. `createFormatters` builds every `Intl` object once,
 * because constructing them is far more expensive than calling `format`; React code
 * should get an instance through `useFormatters()` instead of calling this directly.
 */
import { differenceInCalendarDays } from 'date-fns';
import type { AppLocale, Currency } from '@/domain/models';
import { parseDateKey } from '@/lib/dates';
import { SECONDS_PER_HOUR } from '@/lib/duration';

export interface Formatters {
  locale: AppLocale;
  currency: Currency;
  /** `€1,234.50` */
  money(cents: number): string;
  /** `€1,235` — no fraction digits, for stat tiles. */
  moneyWhole(cents: number): string;
  /** `0.725` → `73%` */
  percent(ratio: number, fractionDigits?: number): string;
  number(value: number, fractionDigits?: number): string;
  /** Decimal hours with two fraction digits (`7.75`), for invoices and tables. */
  hours(seconds: number): string;
  /** `9 Oct 2026` (en-GB) / `Oct 9, 2026` (en-US) */
  date(value: Date | string): string;
  /** `9 Oct` / `Oct 9` */
  dateShort(value: Date | string): string;
  /** `Thu` */
  weekday(value: Date | string): string;
  /** `Today`, `Yesterday`, otherwise `Thursday 9 October` (plus the year when it is not the current one). */
  dayHeading(value: Date | string, now?: Date): string;
  /** `09:30` (en-GB) / `9:30 AM` (en-US) */
  time(value: Date | string): string;
  /** `October 2026` */
  monthYear(value: Date | string): string;
  /** `today`, `tomorrow`, `in 3 days`, `5 days ago` */
  relativeDays(dateKey: string, now?: Date): string;
}

/** Shown instead of throwing when a value cannot be formatted (e.g. an invalid date). */
const MISSING = '—';

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Converts a Date, a `YYYY-MM-DD` key or an ISO timestamp into a Date. Date keys become
 * LOCAL midnight — `new Date('2026-10-09')` would be UTC midnight, which is the previous
 * day for anyone west of Greenwich. Invalid input yields an invalid Date.
 */
export function toDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  if (DATE_KEY_PATTERN.test(value)) return parseDateKey(value) ?? new Date(Number.NaN);
  return new Date(value);
}

const isValidDate = (date: Date) => !Number.isNaN(date.getTime());

/** Adding zero turns `-0` into `0`, so nothing is ever shown as "-€0.00". */
const noNegativeZero = (value: number) => value + 0;

export function createFormatters(locale: AppLocale, currency: Currency): Formatters {
  const moneyFormat = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    signDisplay: 'negative',
  });
  const moneyWholeFormat = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    signDisplay: 'negative',
  });
  const hoursFormat = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'negative',
  });
  const defaultNumberFormat = new Intl.NumberFormat(locale, { signDisplay: 'negative' });

  // Fixed-digit number and percent formats are created on first use, then reused.
  const fixedNumberFormats = new Map<number, Intl.NumberFormat>();
  const percentFormats = new Map<number, Intl.NumberFormat>();
  const fixedDigits = (
    cache: Map<number, Intl.NumberFormat>,
    digits: number,
    style: 'decimal' | 'percent',
  ): Intl.NumberFormat => {
    let format = cache.get(digits);
    if (!format) {
      format = new Intl.NumberFormat(locale, {
        style,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
        signDisplay: 'negative',
      });
      cache.set(digits, format);
    }
    return format;
  };

  const dateFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const dateShortFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const weekdayFormat = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const dayHeadingFormat = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const dayHeadingWithYearFormat = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeFormat = new Intl.DateTimeFormat(locale, { timeStyle: 'short' });
  const monthYearFormat = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const relativeFormat = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  const formatNumber = (format: Intl.NumberFormat, value: number) =>
    Number.isFinite(value) ? format.format(noNegativeZero(value)) : MISSING;

  const formatDate = (format: Intl.DateTimeFormat, value: Date | string) => {
    const date = toDate(value);
    return isValidDate(date) ? format.format(date) : MISSING;
  };

  return {
    locale,
    currency,
    money: (cents) => formatNumber(moneyFormat, cents / 100),
    moneyWhole: (cents) => formatNumber(moneyWholeFormat, cents / 100),
    percent: (ratio, fractionDigits = 0) =>
      formatNumber(fixedDigits(percentFormats, fractionDigits, 'percent'), ratio),
    number: (value, fractionDigits) =>
      formatNumber(
        fractionDigits === undefined
          ? defaultNumberFormat
          : fixedDigits(fixedNumberFormats, fractionDigits, 'decimal'),
        value,
      ),
    hours: (seconds) => formatNumber(hoursFormat, seconds / SECONDS_PER_HOUR),
    date: (value) => formatDate(dateFormat, value),
    dateShort: (value) => formatDate(dateShortFormat, value),
    weekday: (value) => formatDate(weekdayFormat, value),
    dayHeading: (value, now = new Date()) => {
      const date = toDate(value);
      if (!isValidDate(date)) return MISSING;
      const daysAgo = differenceInCalendarDays(now, date);
      if (daysAgo === 0) return 'Today';
      if (daysAgo === 1) return 'Yesterday';
      const format =
        date.getFullYear() === now.getFullYear() ? dayHeadingFormat : dayHeadingWithYearFormat;
      return format.format(date);
    },
    time: (value) => formatDate(timeFormat, value),
    monthYear: (value) => formatDate(monthYearFormat, value),
    relativeDays: (dateKey, now = new Date()) => {
      const date = toDate(dateKey);
      if (!isValidDate(date)) return MISSING;
      return relativeFormat.format(differenceInCalendarDays(date, now), 'day');
    },
  };
}
