/**
 * Minimal RFC 4180 CSV writer with protection against spreadsheet formula injection
 * (CWE-1236): text cells that start with `=`, `+`, `-`, `@`, tab or carriage return
 * are prefixed with an apostrophe so Excel/Sheets treat them as text, not formulas.
 */

export type CsvValue = string | number | boolean | null | undefined;

const FORMULA_TRIGGER = /^[=+\-@\t\r]/;
const NEEDS_QUOTING = /[",\r\n]/;
const UTF8_BOM = '\uFEFF';

export function escapeCsvCell(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';

  let text = value;
  if (FORMULA_TRIGGER.test(text)) text = `'${text}`;
  if (NEEDS_QUOTING.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

/**
 * Serialises rows to CSV with CRLF line endings. A UTF-8 byte order mark is added so
 * spreadsheet apps detect the encoding of non-ASCII text (accents, currency symbols).
 */
export function toCsv(header: readonly string[], rows: readonly (readonly CsvValue[])[]): string {
  const lines = [header, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  return `${UTF8_BOM}${lines.join('\r\n')}\r\n`;
}
