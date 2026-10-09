import { describe, expect, it } from 'vitest';
import {
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
  formatClock,
  formatDurationText,
  formatHoursMinutes,
  parseDurationInput,
  toDecimalHours,
} from '@/lib/duration';

describe('duration formatting', () => {
  it('exposes unit constants', () => {
    expect(SECONDS_PER_MINUTE).toBe(60);
    expect(SECONDS_PER_HOUR).toBe(3600);
  });

  it.each([
    [0, '0:00:00'],
    [59, '0:00:59'],
    [59.9, '0:00:59'],
    [3909, '1:05:09'],
    [36_000, '10:00:00'],
    [-5, '0:00:00'],
  ])('formatClock(%d) → %s', (seconds, expected) => {
    expect(formatClock(seconds)).toBe(expected);
  });

  it.each([
    [27_900, '7:45'],
    [29, '0:00'],
    [30, '0:01'],
    [3600, '1:00'],
    [359_999, '100:00'],
    [-60, '0:00'],
  ])('formatHoursMinutes(%d) → %s', (seconds, expected) => {
    expect(formatHoursMinutes(seconds)).toBe(expected);
  });

  it.each([
    [0, '0m'],
    [2700, '45m'],
    [43_200, '12h'],
    [27_900, '7h 45m'],
    [25_500, '7h 05m'],
    [3599, '1h'],
  ])('formatDurationText(%d) → %s', (seconds, expected) => {
    expect(formatDurationText(seconds)).toBe(expected);
  });

  it.each([
    [5400, 2, 1.5],
    [27_900, 2, 7.75],
    [1000, 2, 0.28],
    [1000, 1, 0.3],
    [0, 2, 0],
  ])('toDecimalHours(%d, %d) → %d', (seconds, digits, expected) => {
    expect(toDecimalHours(seconds, digits)).toBe(expected);
  });
});

describe('parseDurationInput', () => {
  it.each([
    ['1:30', 5400],
    ['1:30:00', 5400],
    ['0:45', 2700],
    ['10:00:30', 36_030],
    ['1:5', 3900],
    ['1h 30m', 5400],
    ['1h30m', 5400],
    ['1h30', 5400],
    ['1h 30', 5400],
    ['90m', 5400],
    ['90 min', 5400],
    ['90 mins', 5400],
    ['90 minutes', 5400],
    ['1.5', 5400],
    ['1,5', 5400],
    ['0.25', 900],
    ['1.5h', 5400],
    ['2h', 7200],
    ['2 hours', 7200],
    ['2hrs', 7200],
    ['1H 30M', 5400],
    ['  45m ', 2700],
    ['0:00', 0],
  ])('parses %j as %d seconds', (input, expected) => {
    expect(parseDurationInput(input)).toBe(expected);
  });

  it.each(['', '   ', 'abc', '1:60', '1:30:60', '-1', 'h', 'm', '1.2.3', '1:30pm', '.5'])(
    'rejects %j',
    (input) => {
      expect(parseDurationInput(input)).toBeNull();
    },
  );
});
