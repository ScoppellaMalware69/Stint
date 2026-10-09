/**
 * Duration formatting and parsing. Durations are always whole seconds internally.
 */

export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 3600;

const pad2 = (value: number) => String(value).padStart(2, '0');

/** Live timer display: `H:MM:SS` (e.g. `1:05:09`). */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / SECONDS_PER_HOUR);
  const m = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const s = seconds % SECONDS_PER_MINUTE;
  return `${h}:${pad2(m)}:${pad2(s)}`;
}

/**
 * Compact duration for tables: `H:MM` (e.g. `7:45`). Rounds to the nearest minute so
 * that a column of rounded values adds up to the rounded total in most cases.
 */
export function formatHoursMinutes(totalSeconds: number): string {
  const minutes = Math.round(Math.max(0, totalSeconds) / SECONDS_PER_MINUTE);
  return `${Math.floor(minutes / 60)}:${pad2(minutes % 60)}`;
}

/** Readable duration for prose and headline numbers: `7h 45m`, `45m`, `12h`. */
export function formatDurationText(totalSeconds: number): string {
  const minutes = Math.round(Math.max(0, totalSeconds) / SECONDS_PER_MINUTE);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${pad2(m)}m`;
}

/** Decimal hours, e.g. `7.75`. Used in CSV exports and invoice quantities. */
export function toDecimalHours(totalSeconds: number, fractionDigits = 2): number {
  const factor = 10 ** fractionDigits;
  return Math.round((totalSeconds / SECONDS_PER_HOUR) * factor) / factor;
}

const CLOCK_PATTERN = /^(\d{1,3}):([0-5]?\d)(?::([0-5]?\d))?$/;
const UNITS_PATTERN =
  /^(?:(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?)?\s*(?:(\d+)\s*m(?:in(?:ute)?s?)?)?$/;
const HOURS_THEN_BARE_MINUTES_PATTERN = /^(\d+)\s*h\s*([0-5]?\d)$/;
const DECIMAL_HOURS_PATTERN = /^\d+(?:\.\d+)?$/;

/**
 * Parses what people naturally type into a duration field.
 *
 * Accepted forms (all mean ninety minutes):
 * `1:30`, `1:30:00`, `1h 30m`, `1h30`, `90m`, `90 min`, `1.5`, `1,5`, `1.5h`.
 * A bare number is interpreted as hours, matching the decimal-hours convention used
 * on invoices. Returns the duration in seconds, or `null` if the text is not a duration.
 */
export function parseDurationInput(input: string): number | null {
  const text = input.trim().toLowerCase().replace(',', '.');
  if (text === '') return null;

  const clock = CLOCK_PATTERN.exec(text);
  if (clock) {
    const [, h = '0', m = '0', s = '0'] = clock;
    return Number(h) * SECONDS_PER_HOUR + Number(m) * SECONDS_PER_MINUTE + Number(s);
  }

  if (DECIMAL_HOURS_PATTERN.test(text)) {
    return Math.round(Number(text) * SECONDS_PER_HOUR);
  }

  const bare = HOURS_THEN_BARE_MINUTES_PATTERN.exec(text);
  if (bare) {
    return Number(bare[1]) * SECONDS_PER_HOUR + Number(bare[2]) * SECONDS_PER_MINUTE;
  }

  const units = UNITS_PATTERN.exec(text);
  if (units && (units[1] !== undefined || units[2] !== undefined)) {
    const hours = units[1] ? Number(units[1]) : 0;
    const minutes = units[2] ? Number(units[2]) : 0;
    return Math.round(hours * SECONDS_PER_HOUR + minutes * SECONDS_PER_MINUTE);
  }

  return null;
}
