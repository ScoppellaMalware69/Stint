import { describe, expect, it } from 'vitest';
import { BUDGET_WARNING_RATIO, getBudgetUsage, type BudgetLevel } from '@/domain/budget';

const HOUR = 3600;

describe('getBudgetUsage', () => {
  it('warns from 80%', () => {
    expect(BUDGET_WARNING_RATIO).toBe(0.8);
  });

  it.each([null, 0, -5, Number.NaN, Number.POSITIVE_INFINITY])(
    'returns null without a usable budget (%j)',
    (budget) => {
      expect(getBudgetUsage(budget, 3600)).toBeNull();
    },
  );

  it.each<[number, number, BudgetLevel, number, number]>([
    // [budget hours, used seconds, level, ratio, remaining seconds]
    [10, 0, 'ok', 0, 36_000],
    [10, 28_799, 'ok', 28_799 / 36_000, 7201],
    [10, 28_800, 'warning', 0.8, 7200],
    [10, 9 * HOUR, 'warning', 0.9, HOUR],
    [10, 10 * HOUR, 'warning', 1, 0],
    [10, 10 * HOUR + 1, 'over', 36_001 / 36_000, -1],
    [10, 12 * HOUR, 'over', 1.2, -2 * HOUR],
    [2.5, 2 * HOUR, 'warning', 0.8, 1800],
    [0.1, 288, 'warning', 0.8, 72],
    [7.3, 21_024, 'warning', 0.8, 5256],
  ])('%d h budget, %d s used → %s', (budgetHours, used, level, ratio, remaining) => {
    const usage = getBudgetUsage(budgetHours, used);
    expect(usage).toMatchObject({
      budgetSeconds: Math.round(budgetHours * HOUR),
      usedSeconds: used,
      remainingSeconds: remaining,
      level,
    });
    expect(usage?.ratio).toBeCloseTo(ratio, 12);
  });

  it('treats negative usage as none', () => {
    expect(getBudgetUsage(10, -100)).toMatchObject({ usedSeconds: 0, ratio: 0, level: 'ok' });
  });
});
