import { SECONDS_PER_HOUR } from '@/lib/duration';

/** At most four intervals, i.e. at most five tick labels including zero. */
const MAX_TICK_INTERVALS = 4;
/** Hour steps that read naturally on a time axis; larger ranges continue with 1/2/2.5/5 × 10ⁿ. */
const HOUR_STEPS = [0.5, 1, 2, 4, 5, 10, 20, 25, 50] as const;
const DECIMAL_MULTIPLIERS = [1, 2, 2.5, 5] as const;

export type ValueUnit = 'seconds';

export interface NiceScale {
  /** Top of the value domain (the last tick). Always > 0. */
  max: number;
  /** Tick values from 0 to `max`, evenly spaced. */
  ticks: number[];
}

/** Strips floating-point noise such as 0.30000000000000004. */
function tidy(value: number): number {
  return Number(value.toPrecision(12));
}

function decimalStep(max: number): number {
  if (max <= 0) return 1;
  const rough = max / MAX_TICK_INTERVALS;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  for (const multiplier of DECIMAL_MULTIPLIERS) {
    const step = tidy(multiplier * magnitude);
    if (step >= rough) return step;
  }
  return tidy(10 * magnitude);
}

function hourStepSeconds(maxSeconds: number): number {
  const maxHours = maxSeconds / SECONDS_PER_HOUR;
  for (const hours of HOUR_STEPS) {
    if (maxHours <= hours * MAX_TICK_INTERVALS) return hours * SECONDS_PER_HOUR;
  }
  return decimalStep(maxHours) * SECONDS_PER_HOUR;
}

/**
 * Round, evenly spaced ticks covering `maxValue` with at most five ticks.
 * Durations (seconds) step in whole hours (or half hours for tiny ranges).
 */
export function niceScale(maxValue: number, unit?: ValueUnit): NiceScale {
  const max = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 0;
  const step = unit === 'seconds' ? hourStepSeconds(max) : decimalStep(max);
  // The epsilon keeps an exact multiple (8 / 2) from rounding up to an extra interval.
  const intervals = Math.max(1, Math.ceil(max / step - 1e-9));
  const ticks = Array.from({ length: intervals + 1 }, (_, index) => tidy(index * step));
  return { max: tidy(intervals * step), ticks };
}

const hourTickNumber = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });

/** Default duration tick label: "0h", "0.5h", "4h", "1,000h". */
export function formatHourTick(seconds: number): string {
  return `${hourTickNumber.format(seconds / SECONDS_PER_HOUR)}h`;
}

/**
 * Rough rendered width of a label in the UI sans at `fontSize` px. Deliberately errs
 * wide: it only decides spacing (axis band width, label thinning), never clipping.
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  let ems = 0;
  for (const char of text) {
    if (/[iljtfr.,:;'!|\s1]/.test(char)) ems += 0.34;
    else if (/[mwMW@%]/.test(char)) ems += 0.86;
    else if (/[A-Z]/.test(char)) ems += 0.68;
    else ems += 0.58;
  }
  return ems * fontSize;
}
