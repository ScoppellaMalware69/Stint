/**
 * Billing rules shared by the data layer, reports and the invoice builder.
 *
 * - Hourly rate: project rate ?? client rate ?? default rate from settings.
 * - Only entries flagged billable whose project belongs to an existing client can be billed.
 * - Each entry is rounded on its own (settings increment + mode) into "billed seconds";
 *   amounts are always computed from billed seconds, hour figures from tracked seconds.
 */
import type { Client, Project, RoundingMode, Settings, TimeEntry } from '@/domain/models';
import { entryDurationSeconds } from '@/domain/time-entries';
import { SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from '@/lib/duration';

export interface BillingContext {
  settings: Settings;
  projectsById: ReadonlyMap<string, Project>;
  clientsById: ReadonlyMap<string, Client>;
}

type BillingEntry = Pick<TimeEntry, 'projectId' | 'billable'>;
type MeasuredBillingEntry = BillingEntry & Pick<TimeEntry, 'start' | 'end'>;

/**
 * Guards against floating-point noise (e.g. 0.30000000000000004 units) so that a duration
 * that is an exact multiple of the increment is never rounded up to the next increment.
 */
const ROUNDING_EPSILON = 1e-9;

export function createBillingContext(
  settings: Settings,
  projects: readonly Project[],
  clients: readonly Client[],
): BillingContext {
  return {
    settings,
    projectsById: new Map(projects.map((project) => [project.id, project])),
    clientsById: new Map(clients.map((client) => [client.id, client])),
  };
}

export function resolveHourlyRateCents(
  project: Pick<Project, 'hourlyRateCents'> | null | undefined,
  client: Pick<Client, 'hourlyRateCents'> | null | undefined,
  settings: Pick<Settings, 'defaultHourlyRateCents'>,
): number {
  return project?.hourlyRateCents ?? client?.hourlyRateCents ?? settings.defaultHourlyRateCents;
}

/**
 * Rounds a tracked duration to the billing increment. `incrementMinutes` 0 means no
 * rounding. Mode `up` bills every started increment; `nearest` rounds half up.
 */
export function roundBilledSeconds(
  seconds: number,
  incrementMinutes: number,
  mode: RoundingMode,
): number {
  if (!(seconds > 0)) return 0;
  if (!(incrementMinutes > 0)) return Math.round(seconds);
  const increment = incrementMinutes * SECONDS_PER_MINUTE;
  const units = seconds / increment;
  const rounded =
    mode === 'up' ? Math.ceil(units - ROUNDING_EPSILON) : Math.round(units);
  return rounded * increment;
}

/** `round(seconds × rate / 3600)`, in cents. */
export function amountForSeconds(seconds: number, rateCents: number): number {
  return Math.round((seconds * rateCents) / SECONDS_PER_HOUR);
}

export function clientForProject(
  project: Pick<Project, 'clientId'> | null | undefined,
  ctx: BillingContext,
): Client | null {
  if (!project?.clientId) return null;
  return ctx.clientsById.get(project.clientId) ?? null;
}

function projectOf(entry: Pick<TimeEntry, 'projectId'>, ctx: BillingContext): Project | null {
  return entry.projectId === null ? null : (ctx.projectsById.get(entry.projectId) ?? null);
}

/** True when the entry is flagged billable AND its project belongs to an existing client. */
export function canBeBilled(entry: BillingEntry, ctx: BillingContext): boolean {
  if (!entry.billable) return false;
  return clientForProject(projectOf(entry, ctx), ctx) !== null;
}

/** The hourly rate the entry is billed at, or `null` when it cannot be billed. */
export function entryRateCents(entry: BillingEntry, ctx: BillingContext): number | null {
  if (!canBeBilled(entry, ctx)) return null;
  const project = projectOf(entry, ctx);
  return resolveHourlyRateCents(project, clientForProject(project, ctx), ctx.settings);
}

/** Rounds tracked seconds with the context's settings (billability is the caller's concern). */
function roundWithSettings(seconds: number, ctx: BillingContext): number {
  const { roundingIncrementMinutes, roundingMode } = ctx.settings;
  return roundBilledSeconds(seconds, roundingIncrementMinutes, roundingMode);
}

/** Rounded duration that would be billed; 0 for entries that cannot be billed. */
export function entryBilledSeconds(
  entry: MeasuredBillingEntry,
  ctx: BillingContext,
  now: number = Date.now(),
): number {
  if (!canBeBilled(entry, ctx)) return 0;
  return roundWithSettings(entryDurationSeconds(entry, now), ctx);
}

/** Billable amount of one entry in cents; 0 for entries that cannot be billed. */
export function entryAmountCents(
  entry: MeasuredBillingEntry,
  ctx: BillingContext,
  now: number = Date.now(),
): number {
  const rateCents = entryRateCents(entry, ctx);
  if (rateCents === null) return 0;
  return amountForSeconds(roundWithSettings(entryDurationSeconds(entry, now), ctx), rateCents);
}

/** Billable, finished and not yet on an invoice. */
export function isInvoiceable(
  entry: BillingEntry & Pick<TimeEntry, 'end' | 'invoiceId'>,
  ctx: BillingContext,
): boolean {
  return canBeBilled(entry, ctx) && entry.end !== null && entry.invoiceId === null;
}

export interface BillableSummary {
  /** Every entry's tracked time. */
  trackedSeconds: number;
  /** Tracked time of the entries that can be billed. */
  billableSeconds: number;
  /** Rounded time of the entries that can be billed. */
  billedSeconds: number;
  amountCents: number;
}

export function summarizeBillable(
  entries: readonly MeasuredBillingEntry[],
  ctx: BillingContext,
  now: number = Date.now(),
): BillableSummary {
  const summary: BillableSummary = {
    trackedSeconds: 0,
    billableSeconds: 0,
    billedSeconds: 0,
    amountCents: 0,
  };
  for (const entry of entries) {
    const seconds = entryDurationSeconds(entry, now);
    summary.trackedSeconds += seconds;
    const rateCents = entryRateCents(entry, ctx);
    if (rateCents === null) continue;
    const billed = roundWithSettings(seconds, ctx);
    summary.billableSeconds += seconds;
    summary.billedSeconds += billed;
    summary.amountCents += amountForSeconds(billed, rateCents);
  }
  return summary;
}
