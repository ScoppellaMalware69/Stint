import { describe, expect, it } from 'vitest';
import {
  amountForSeconds,
  canBeBilled,
  clientForProject,
  createBillingContext,
  entryAmountCents,
  entryBilledSeconds,
  entryRateCents,
  isInvoiceable,
  resolveHourlyRateCents,
  roundBilledSeconds,
  summarizeBillable,
} from '@/domain/billing';
import type { Client, Project, RoundingMode, Settings, TimeEntry } from '@/domain/models';

const STAMP = '2026-01-01T00:00:00.000Z';

const settings: Settings = {
  ownerName: 'Alex Moreau',
  businessName: 'Moreau Studio',
  businessEmail: null,
  businessAddress: null,
  taxId: null,
  currency: 'EUR',
  locale: 'en-GB',
  defaultHourlyRateCents: 7500,
  weekStartsOn: 1,
  weeklyTargetHours: 35,
  roundingIncrementMinutes: 15,
  roundingMode: 'up',
  invoicePrefix: 'INV-',
  paymentTermsDays: 30,
  defaultTaxRateBps: 0,
};

const client = (id: string, hourlyRateCents: number | null): Client => ({
  id,
  name: `Client ${id}`,
  email: null,
  address: null,
  hourlyRateCents,
  archived: false,
  createdAt: STAMP,
  updatedAt: STAMP,
});

const project = (id: string, clientId: string | null, hourlyRateCents: number | null): Project => ({
  id,
  name: `Project ${id}`,
  clientId,
  color: 'blue',
  hourlyRateCents,
  budgetHours: null,
  billableByDefault: clientId !== null,
  notes: null,
  archived: false,
  createdAt: STAMP,
  updatedAt: STAMP,
});

const clients = [client('c1', 9000), client('c2', null)];
const projects = [
  project('p1', 'c1', 12_000), // own rate
  project('p2', 'c1', null), // inherits the client rate
  project('p3', 'c2', null), // inherits the default rate
  project('internal', null, null),
  project('orphan', 'deleted-client', 5000),
];
const ctx = createBillingContext(settings, projects, clients);

const start = new Date(2026, 9, 5, 9, 0);
function makeEntry(minutes: number | null, overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'e1',
    description: '',
    projectId: 'p1',
    start: start.toISOString(),
    end: minutes === null ? null : new Date(start.getTime() + minutes * 60_000).toISOString(),
    billable: true,
    invoiceId: null,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  };
}

describe('createBillingContext', () => {
  it('indexes projects and clients by id', () => {
    expect(ctx.settings).toBe(settings);
    expect(ctx.projectsById.get('p2')?.name).toBe('Project p2');
    expect(ctx.clientsById.get('c1')?.hourlyRateCents).toBe(9000);
    expect(ctx.projectsById.size).toBe(5);
  });
});

describe('resolveHourlyRateCents', () => {
  it.each([
    [{ hourlyRateCents: 12_000 }, { hourlyRateCents: 9000 }, 12_000],
    [{ hourlyRateCents: null }, { hourlyRateCents: 9000 }, 9000],
    [{ hourlyRateCents: null }, { hourlyRateCents: null }, 7500],
    [{ hourlyRateCents: 0 }, { hourlyRateCents: 9000 }, 0],
    [{ hourlyRateCents: null }, { hourlyRateCents: 0 }, 0],
    [null, { hourlyRateCents: 9000 }, 9000],
    [undefined, null, 7500],
    [null, undefined, 7500],
  ])('project %j, client %j → %d', (projectRate, clientRate, expected) => {
    expect(resolveHourlyRateCents(projectRate, clientRate, settings)).toBe(expected);
  });
});

describe('roundBilledSeconds', () => {
  it.each<[number, number, RoundingMode, number]>([
    // No rounding.
    [0, 0, 'up', 0],
    [61, 0, 'up', 61],
    [61, 0, 'nearest', 61],
    // Round up to 15 minutes; exact multiples stay put.
    [1, 15, 'up', 900],
    [899, 15, 'up', 900],
    [900, 15, 'up', 900],
    [901, 15, 'up', 1800],
    [1800, 15, 'up', 1800],
    [0, 15, 'up', 0],
    [-30, 15, 'up', 0],
    // Nearest 15 minutes, halves round up.
    [449, 15, 'nearest', 0],
    [450, 15, 'nearest', 900],
    [900, 15, 'nearest', 900],
    [1349, 15, 'nearest', 900],
    [1350, 15, 'nearest', 1800],
    // Other increments.
    [60, 1, 'up', 60],
    [61, 1, 'up', 120],
    [360, 6, 'up', 360],
    [361, 6, 'up', 720],
    [1801, 30, 'up', 3600],
    [3599, 30, 'nearest', 3600],
    [2699, 30, 'nearest', 1800],
  ])('%d s, %d min, %s → %d s', (seconds, increment, mode, expected) => {
    expect(roundBilledSeconds(seconds, increment, mode)).toBe(expected);
  });

  it('does not round floating-point noise up to the next increment', () => {
    const noisy = (0.1 + 0.2) * 3000; // 900.0000000000001
    expect(noisy).not.toBe(900);
    expect(roundBilledSeconds(noisy, 15, 'up')).toBe(900);
  });
});

describe('amountForSeconds', () => {
  it.each([
    [3600, 7500, 7500],
    [5400, 7500, 11_250],
    [1, 7500, 2],
    [0, 7500, 0],
    [2700, 9999, 7499],
    [1800, 1, 1],
    [3600, 0, 0],
  ])('%d s at %d c/h → %d c', (seconds, rate, expected) => {
    expect(amountForSeconds(seconds, rate)).toBe(expected);
  });
});

describe('billability', () => {
  it.each([
    ['p1', 'c1'],
    ['p3', 'c2'],
    ['internal', null],
    ['orphan', null],
  ])('client of project %s is %s', (projectId, expected) => {
    expect(clientForProject(ctx.projectsById.get(projectId), ctx)?.id ?? null).toBe(expected);
  });

  it('has no client without a project', () => {
    expect(clientForProject(null, ctx)).toBeNull();
    expect(clientForProject(undefined, ctx)).toBeNull();
  });

  it.each([
    ['client project, billable', { projectId: 'p1', billable: true }, true],
    ['client project, not billable', { projectId: 'p1', billable: false }, false],
    ['internal project', { projectId: 'internal', billable: true }, false],
    ['no project', { projectId: null, billable: true }, false],
    ['unknown project', { projectId: 'nope', billable: true }, false],
    ['project of a deleted client', { projectId: 'orphan', billable: true }, false],
  ])('%s → %s', (_label, entry, expected) => {
    expect(canBeBilled(entry, ctx)).toBe(expected);
  });

  it.each([
    ['p1', true, 12_000],
    ['p2', true, 9000],
    ['p3', true, 7500],
    ['internal', true, null],
    ['p1', false, null],
  ])('rate for project %s (billable %s) → %j', (projectId, billable, expected) => {
    expect(entryRateCents({ projectId, billable }, ctx)).toBe(expected);
  });
});

describe('entry amounts', () => {
  it('rounds each entry, then prices the billed time', () => {
    const entry = makeEntry(20); // 20 min → 30 min billed at 120.00/h
    expect(entryBilledSeconds(entry, ctx)).toBe(1800);
    expect(entryAmountCents(entry, ctx)).toBe(6000);
  });

  it('bills nothing for entries that cannot be billed', () => {
    expect(entryBilledSeconds(makeEntry(20, { billable: false }), ctx)).toBe(0);
    expect(entryAmountCents(makeEntry(20, { billable: false }), ctx)).toBe(0);
    expect(entryAmountCents(makeEntry(60, { projectId: 'internal' }), ctx)).toBe(0);
  });

  it('measures running entries up to now', () => {
    const running = makeEntry(null);
    const now = start.getTime() + 16 * 60_000;
    expect(entryBilledSeconds(running, ctx, now)).toBe(1800);
    expect(entryAmountCents(running, ctx, now)).toBe(6000);
  });

  it.each([
    ['finished, billable, not invoiced', makeEntry(30), true],
    ['running', makeEntry(null), false],
    ['already invoiced', makeEntry(30, { invoiceId: 'inv1' }), false],
    ['not billable', makeEntry(30, { billable: false }), false],
    ['internal project', makeEntry(30, { projectId: 'internal' }), false],
  ])('isInvoiceable: %s → %s', (_label, entry, expected) => {
    expect(isInvoiceable(entry, ctx)).toBe(expected);
  });
});

describe('summarizeBillable', () => {
  it('separates tracked, billable and billed time', () => {
    const entries = [
      makeEntry(20), // p1 120.00/h: 30 min billed → 6000
      makeEntry(50, { projectId: 'p2' }), // 9000/h: 60 min billed → 9000
      makeEntry(45, { billable: false }), // tracked only
      makeEntry(60, { projectId: 'internal' }), // tracked only
    ];
    expect(summarizeBillable(entries, ctx)).toEqual({
      trackedSeconds: (20 + 50 + 45 + 60) * 60,
      billableSeconds: (20 + 50) * 60,
      billedSeconds: (30 + 60) * 60,
      amountCents: 6000 + 9000,
    });
  });

  it('uses each settings rounding mode', () => {
    const nearest = createBillingContext(
      { ...settings, roundingMode: 'nearest' },
      projects,
      clients,
    );
    const none = createBillingContext({ ...settings, roundingIncrementMinutes: 0 }, projects, clients);
    const entries = [makeEntry(20), makeEntry(5)];
    expect(summarizeBillable(entries, nearest).billedSeconds).toBe(15 * 60);
    expect(summarizeBillable(entries, none).billedSeconds).toBe(25 * 60);
    expect(summarizeBillable(entries, none).amountCents).toBe(4000 + 1000);
  });

  it('is all zeros for no entries', () => {
    expect(summarizeBillable([], ctx)).toEqual({
      trackedSeconds: 0,
      billableSeconds: 0,
      billedSeconds: 0,
      amountCents: 0,
    });
  });
});
