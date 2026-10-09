/**
 * Invoice rules: building lines from time entries, totals, numbering, the derived
 * "overdue" status and the allowed status transitions.
 */
import { addDays } from 'date-fns';
import {
  amountForSeconds,
  clientForProject,
  isInvoiceable,
  resolveHourlyRateCents,
  roundBilledSeconds,
  type BillingContext,
} from '@/domain/billing';
import type { Invoice, InvoiceStatus, TimeEntry } from '@/domain/models';
import { entryDurationSeconds } from '@/domain/time-entries';
import { dateFromKey, toDateKey } from '@/lib/dates';

export interface InvoiceLineDraft {
  projectId: string | null;
  description: string;
  billedSeconds: number;
  trackedSeconds: number;
  rateCents: number;
  amountCents: number;
  entryIds: string[];
}

/** Used when an entry's project cannot be found, so a line never has an empty description. */
const FALLBACK_LINE_DESCRIPTION = 'Time';

/**
 * One line per project from the invoiceable entries (others are skipped). Each entry is
 * rounded on its own; the line amount is computed once on the summed billed seconds so it
 * matches "hours × rate" as printed on the invoice. Lines are sorted by description.
 */
export function buildInvoiceLines(
  entries: readonly TimeEntry[],
  ctx: BillingContext,
): InvoiceLineDraft[] {
  const { roundingIncrementMinutes, roundingMode } = ctx.settings;
  const groups = new Map<string | null, TimeEntry[]>();
  for (const entry of entries) {
    if (!isInvoiceable(entry, ctx)) continue;
    const group = groups.get(entry.projectId);
    if (group) group.push(entry);
    else groups.set(entry.projectId, [entry]);
  }

  const lines: InvoiceLineDraft[] = [];
  for (const [projectId, groupEntries] of groups) {
    const project = projectId === null ? undefined : ctx.projectsById.get(projectId);
    const rateCents = resolveHourlyRateCents(project, clientForProject(project, ctx), ctx.settings);
    groupEntries.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    let trackedSeconds = 0;
    let billedSeconds = 0;
    for (const entry of groupEntries) {
      const seconds = entryDurationSeconds(entry);
      trackedSeconds += seconds;
      billedSeconds += roundBilledSeconds(seconds, roundingIncrementMinutes, roundingMode);
    }
    lines.push({
      projectId,
      description: project?.name ?? FALLBACK_LINE_DESCRIPTION,
      billedSeconds,
      trackedSeconds,
      rateCents,
      amountCents: amountForSeconds(billedSeconds, rateCents),
      entryIds: groupEntries.map((entry) => entry.id),
    });
  }
  return lines.sort(
    (a, b) =>
      a.description.localeCompare(b.description) ||
      (a.projectId ?? '').localeCompare(b.projectId ?? ''),
  );
}

export interface InvoiceTotals {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

/** Tax is rounded once on the subtotal: `round(subtotal × bps / 10000)`. */
export function computeInvoiceTotals(
  lines: ReadonlyArray<{ amountCents: number }>,
  taxRateBps: number,
): InvoiceTotals {
  const subtotalCents = lines.reduce((sum, line) => sum + line.amountCents, 0);
  const taxCents = Math.round((subtotalCents * taxRateBps) / 10_000);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

export function invoiceTotals(invoice: Pick<Invoice, 'lines' | 'taxRateBps'>): InvoiceTotals {
  return computeInvoiceTotals(invoice.lines, invoice.taxRateBps);
}

/** `INV-2026-007` */
export function formatInvoiceNumber(prefix: string, year: number, seq: number): string {
  return `${prefix}${year}-${String(seq).padStart(3, '0')}`;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The next number in the prefix + year sequence: the highest existing sequence + 1, so
 * gaps left by deleted drafts are not reused. Numbers with another prefix or year, or
 * that do not follow the pattern exactly, are ignored.
 */
export function nextInvoiceNumber(
  existing: ReadonlyArray<Pick<Invoice, 'number'>>,
  prefix: string,
  year: number,
): string {
  const pattern = new RegExp(`^${escapeRegExp(prefix)}${year}-(\\d{3,})$`);
  let max = 0;
  for (const { number } of existing) {
    const match = pattern.exec(number);
    if (match?.[1]) max = Math.max(max, Number(match[1]));
  }
  return formatInvoiceNumber(prefix, year, max + 1);
}

export type InvoiceDisplayStatus = 'draft' | 'sent' | 'overdue' | 'paid';

/** "Overdue" is derived: sent and the due date is before today (due today is not overdue). */
export function getInvoiceDisplayStatus(
  invoice: Pick<Invoice, 'status' | 'dueDate'>,
  todayKey: string,
): InvoiceDisplayStatus {
  if (invoice.status === 'sent' && invoice.dueDate < todayKey) return 'overdue';
  return invoice.status;
}

export const INVOICE_TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  draft: ['sent'],
  sent: ['paid', 'draft'],
  paid: ['sent'],
};

export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return INVOICE_TRANSITIONS[from].includes(to);
}

/** Calendar arithmetic on `YYYY-MM-DD` keys (DST-safe, local time). */
export function addDaysToKey(dateKey: string, days: number): string {
  return toDateKey(addDays(dateFromKey(dateKey), days));
}
