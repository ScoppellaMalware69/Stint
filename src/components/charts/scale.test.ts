import { describe, expect, it } from 'vitest';
import { estimateTextWidth, formatHourTick, niceScale } from './scale';

const HOUR = 3600;

describe('niceScale', () => {
  it('uses whole-hour steps for durations', () => {
    expect(niceScale(7.5 * HOUR, 'seconds').ticks).toEqual([0, 2, 4, 6, 8].map((h) => h * HOUR));
    expect(niceScale(9 * HOUR, 'seconds').ticks).toEqual([0, 4, 8, 12].map((h) => h * HOUR));
    expect(niceScale(40 * HOUR, 'seconds').ticks).toEqual([0, 10, 20, 30, 40].map((h) => h * HOUR));
  });

  it('falls back to half hours for tiny ranges and keeps going past 200h', () => {
    expect(niceScale(20 * 60, 'seconds').ticks).toEqual([0, 1800]);
    expect(niceScale(300 * HOUR, 'seconds').ticks).toEqual([0, 100, 200, 300].map((h) => h * HOUR));
  });

  it('uses 1/2/2.5/5 steps for plain numbers', () => {
    expect(niceScale(123_456)).toEqual({ max: 150_000, ticks: [0, 50_000, 100_000, 150_000] });
    expect(niceScale(0.7).ticks).toEqual([0, 0.2, 0.4, 0.6, 0.8]);
  });

  it('never returns more than five ticks and always covers the maximum', () => {
    for (const max of [1, 3, 7, 9, 11, 19, 21, 99, 101, 999, 1001, 12_345, 7.25 * HOUR]) {
      for (const unit of [undefined, 'seconds'] as const) {
        const scale = niceScale(max, unit);
        expect(scale.ticks.length).toBeLessThanOrEqual(5);
        expect(scale.max).toBeGreaterThanOrEqual(max);
      }
    }
  });

  it('handles an empty or zero domain', () => {
    expect(niceScale(0)).toEqual({ max: 1, ticks: [0, 1] });
    expect(niceScale(Number.NaN, 'seconds')).toEqual({ max: 1800, ticks: [0, 1800] });
  });
});

describe('formatHourTick', () => {
  it('labels ticks in hours', () => {
    expect(formatHourTick(0)).toBe('0h');
    expect(formatHourTick(1800)).toBe('0.5h');
    expect(formatHourTick(4 * HOUR)).toBe('4h');
    expect(formatHourTick(10_000 * HOUR)).toBe('10,000h');
  });
});

describe('estimateTextWidth', () => {
  it('grows with the text and the font size', () => {
    expect(estimateTextWidth('Mon 6 Oct', 12)).toBeGreaterThan(estimateTextWidth('Mon', 12));
    expect(estimateTextWidth('Mon', 24)).toBe(estimateTextWidth('Mon', 12) * 2);
  });
});
