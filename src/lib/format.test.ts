import { describe, expect, it } from 'vitest';
import { createFormatters, toDate } from '@/lib/format';

/** ICU separates some parts with narrow/no-break spaces; compare with plain spaces. */
const plain = (text: string) => text.replace(/\s/g, ' ');

const us = createFormatters('en-US', 'EUR');
const gb = createFormatters('en-GB', 'EUR');
/** Friday 9 October 2026, 15:00 local time. */
const now = new Date(2026, 9, 9, 15, 0);
/** Thursday 8 October 2026, 09:30 local time. */
const thursday = new Date(2026, 9, 8, 9, 30);

describe('toDate', () => {
  it('treats YYYY-MM-DD keys as local midnight', () => {
    const date = toDate('2026-10-09');
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([
      2026, 9, 9, 0,
    ]);
    expect(date.getMinutes()).toBe(0);
  });

  it('parses ISO timestamps as instants', () => {
    expect(toDate('2026-10-09T10:00:00.000Z').getTime()).toBe(Date.UTC(2026, 9, 9, 10));
  });

  it('returns Date values as they are', () => {
    expect(toDate(thursday)).toBe(thursday);
  });

  it.each(['2026-02-31', 'not a date'])('returns an invalid date for %j', (value) => {
    expect(Number.isNaN(toDate(value).getTime())).toBe(true);
  });
});

describe('createFormatters', () => {
  it('exposes the locale and currency it was created with', () => {
    expect(gb.locale).toBe('en-GB');
    expect(gb.currency).toBe('EUR');
  });

  it.each([
    ['en-US', 'EUR', 123450, '€1,234.50'],
    ['en-GB', 'EUR', 123450, '€1,234.50'],
    ['en-GB', 'GBP', 5, '£0.05'],
    ['en-US', 'USD', 100, '$1.00'],
    ['en-GB', 'USD', 100, 'US$1.00'],
    ['en-GB', 'SEK', 123450, 'SEK 1,234.50'],
    ['en-US', 'EUR', 0, '€0.00'],
    ['en-US', 'EUR', -0, '€0.00'],
    ['en-US', 'EUR', -1050, '-€10.50'],
  ] as const)('money in %s %s: %d → %s', (locale, currency, cents, expected) => {
    expect(plain(createFormatters(locale, currency).money(cents))).toBe(expected);
  });

  it.each([
    [123450, '€1,235'],
    [123449, '€1,234'],
    [0, '€0'],
    [-40, '€0'],
    [-150_000, '-€1,500'],
  ])('moneyWhole(%d) → %s', (cents, expected) => {
    expect(us.moneyWhole(cents)).toBe(expected);
  });

  it.each([
    [0.725, undefined, '73%'],
    [0, undefined, '0%'],
    [1, undefined, '100%'],
    [1.234, undefined, '123%'],
    [0.7251, 1, '72.5%'],
    [0.5, 2, '50.00%'],
  ])('percent(%d, %j) → %s', (ratio, digits, expected) => {
    expect(gb.percent(ratio, digits)).toBe(expected);
  });

  it.each([
    [1234.5678, undefined, '1,234.568'],
    [1234.5678, 1, '1,234.6'],
    [2, 2, '2.00'],
    [-0.001, 1, '0.0'],
  ])('number(%d, %j) → %s', (value, digits, expected) => {
    expect(us.number(value, digits)).toBe(expected);
  });

  it.each([
    [27_900, '7.75'],
    [3600, '1.00'],
    [5400, '1.50'],
    [1000, '0.28'],
    [0, '0.00'],
    [360_000, '100.00'],
  ])('hours(%d) → %s', (seconds, expected) => {
    expect(gb.hours(seconds)).toBe(expected);
  });

  it('formats non-finite numbers as a dash instead of throwing', () => {
    expect(us.money(Number.NaN)).toBe('—');
    expect(us.hours(Number.POSITIVE_INFINITY)).toBe('—');
  });

  describe.each([
    {
      locale: 'en-US',
      f: us,
      date: 'Oct 8, 2026',
      dateShort: 'Oct 8',
      time: '9:30 AM',
      afternoon: '2:05 PM',
      heading: 'Tuesday, October 6',
      headingOtherYear: /^Wednesday, October 8, 2025$/,
    },
    {
      locale: 'en-GB',
      f: gb,
      date: '8 Oct 2026',
      dateShort: '8 Oct',
      time: '09:30',
      afternoon: '14:05',
      heading: 'Tuesday 6 October',
      headingOtherYear: /^Wednesday,? 8 October 2025$/,
    },
  ])('dates in $locale', ({ f, date, dateShort, time, afternoon, heading, headingOtherYear }) => {
    it('formats medium and short dates from Dates, keys and timestamps', () => {
      expect(f.date(thursday)).toBe(date);
      expect(f.date('2026-10-08')).toBe(date);
      expect(f.date(thursday.toISOString())).toBe(date);
      expect(f.dateShort('2026-10-08')).toBe(dateShort);
    });

    it('formats weekdays, times and months', () => {
      expect(f.weekday('2026-10-08')).toBe('Thu');
      expect(plain(f.time(thursday))).toBe(time);
      expect(plain(f.time(new Date(2026, 9, 8, 14, 5)))).toBe(afternoon);
      expect(f.monthYear('2026-10-08')).toBe('October 2026');
    });

    it('names today and yesterday in day headings', () => {
      expect(f.dayHeading('2026-10-09', now)).toBe('Today');
      expect(f.dayHeading(new Date(2026, 9, 9, 23, 59), now)).toBe('Today');
      expect(f.dayHeading('2026-10-08', now)).toBe('Yesterday');
      expect(f.dayHeading(new Date(2026, 9, 8, 23, 59), new Date(2026, 9, 9, 0, 1))).toBe(
        'Yesterday',
      );
    });

    it('spells out older days, adding the year only for other years', () => {
      expect(f.dayHeading('2026-10-06', now)).toBe(heading);
      expect(f.dayHeading('2025-10-08', now)).toMatch(headingOtherYear);
    });

    it('returns a dash for invalid dates', () => {
      expect(f.date('2026-13-01')).toBe('—');
      expect(f.dayHeading('nope', now)).toBe('—');
      expect(f.relativeDays('nope', now)).toBe('—');
    });
  });

  it.each([
    ['2026-10-09', 'today'],
    ['2026-10-10', 'tomorrow'],
    ['2026-10-08', 'yesterday'],
    ['2026-10-12', 'in 3 days'],
    ['2026-10-04', '5 days ago'],
    ['2026-11-08', 'in 30 days'],
  ])('relativeDays(%s) → %s', (dateKey, expected) => {
    expect(gb.relativeDays(dateKey, now)).toBe(expected);
    expect(us.relativeDays(dateKey, now)).toBe(expected);
  });

  it('counts relative days by calendar day, not by elapsed hours', () => {
    expect(gb.relativeDays('2026-10-10', new Date(2026, 9, 9, 23, 59))).toBe('tomorrow');
    expect(gb.relativeDays('2026-10-09', new Date(2026, 9, 9, 0, 0))).toBe('today');
  });
});
