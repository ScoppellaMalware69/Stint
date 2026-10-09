/** Project budget usage (hours budget vs tracked time). */
import { SECONDS_PER_HOUR } from '@/lib/duration';

export type BudgetLevel = 'ok' | 'warning' | 'over';

/** From this share of the budget onwards the project is "near budget". */
export const BUDGET_WARNING_RATIO = 0.8;

export interface BudgetUsage {
  budgetSeconds: number;
  usedSeconds: number;
  /** Negative once the budget is exceeded. */
  remainingSeconds: number;
  /** `usedSeconds / budgetSeconds`; above 1 when over budget. */
  ratio: number;
  level: BudgetLevel;
}

/** Tolerates floating-point noise so that exactly 80% counts as "near budget". */
const RATIO_EPSILON = 1e-9;

/** `null` when the project has no (valid) budget. Exactly 100% is still a warning, not over. */
export function getBudgetUsage(budgetHours: number | null, usedSeconds: number): BudgetUsage | null {
  if (budgetHours === null || !Number.isFinite(budgetHours) || budgetHours <= 0) return null;
  const budgetSeconds = Math.round(budgetHours * SECONDS_PER_HOUR);
  const used = Math.max(0, usedSeconds);
  const ratio = used / budgetSeconds;
  let level: BudgetLevel = 'ok';
  if (used > budgetSeconds) level = 'over';
  else if (ratio + RATIO_EPSILON >= BUDGET_WARNING_RATIO) level = 'warning';
  return { budgetSeconds, usedSeconds: used, remainingSeconds: budgetSeconds - used, ratio, level };
}
