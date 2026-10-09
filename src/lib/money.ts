/**
 * Money input helpers. Amounts are integer cents everywhere in the app; these
 * functions convert between cents and what a person types into a form field.
 * Display formatting lives in `format.ts` because it depends on locale and currency.
 */

const MONEY_INPUT_PATTERN = /^(\d{1,9})(?:[.,](\d{1,2}))?$/;

/**
 * Parses an amount typed by a user (`85`, `85.5`, `85,50`) into cents.
 * Thousands separators are rejected on purpose: `1.234` is ambiguous between locales.
 * Returns `null` for anything that is not a non-negative amount with at most 2 decimals.
 */
export function parseMoneyInput(input: string): number | null {
  const text = input.trim().replace(/\s/g, '');
  const match = MONEY_INPUT_PATTERN.exec(text);
  if (!match) return null;
  const [, whole = '0', fraction = ''] = match;
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** Converts cents back into an editable string (`8550` → `85.50`). */
export function centsToInputValue(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '';
  const whole = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, '0');
  return `${whole}.${fraction}`;
}

/** Converts a percentage typed by a user (`22`, `7.5`, `7,5`) into basis points. */
export function parsePercentInput(input: string): number | null {
  const text = input.trim().replace(',', '.').replace(/%$/, '').trim();
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(text)) return null;
  const bps = Math.round(Number(text) * 100);
  return bps <= 10_000 ? bps : null;
}

/** Converts basis points into an editable percentage string (`2200` → `22`). */
export function bpsToInputValue(bps: number): string {
  return String(bps / 100);
}
