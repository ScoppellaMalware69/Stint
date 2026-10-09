import { describe, expect, it } from 'vitest';
import { createBillingContext } from '@/domain/billing';
import {
  INVOICE_TRANSITIONS,
  addDaysToKey,
  buildInvoiceLines,
  canTransition,
  computeInvoiceTotals,
  formatInvoiceNumber,
  getInvoiceDisplayStatus,
  invoiceTotals,
  nextInvoiceNumber,
} from '@/domain/invoices';
import type { Client, InvoiceStatus, Project, Settings, TimeEntry } from '@/domain/models';

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

const client: Client = {
  id: 'c1',
  name: 'Northwind',
  email: null,
  address: null,
  hourlyRateCents: 9000,
  archived: false,
  createdAt: STAMP,
  updatedAt: STAMP,
};

const project = (id: string, name: string, clientId: string | null, rate: number | null): Project => ({
  id,
  name,
  clientId,
  color: 'blue',
  hourlyRateCents: rate,
  budgetHours: null,
  billableByDefault: true,
  notes: null,
  archived: false,
  createdAt: STAMP,
  updatedAt: STAMP,
});

const ctx = createBillingContext(
  settings,
  [
    project('web', 'Website redesign', 'c1', 12_000),
    project('brand', 'Brand audit', 'c1', null),
    project('internal', 'Admin', null, null),
  ],
  [client],
);

function makeEntry(
  id: string,
  day: number,
  minutes: number | null,
  overrides: Partial<TimeEntry> = {},
): TimeEntry {
  const start = new Date(2026, 9, day, 9, 0);
  return {
    id,
    description: '',
    projectId: 'web',
    start: start.toISOString(),
    end: minutes === null ? null : new Date(start.getTime() + minutes * 60_000).toISOString(),
    billable: true,
    invoiceId: null,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  };
}

describe('buildInvoiceLines', () => {
  it('builds one line per project from invoiceable entries only', () => {
    const lines = buildInvoiceLines(
      [
        makeEntry('web-2', 6, 50),
        makeEntry('web-1', 5, 20),
        makeEntry('brand-1', 5, 60, { projectId: 'brand' }),
        makeEntry('internal', 5, 60, { projectId: 'internal' }),
        makeEntry('non-billable', 5, 60, { billable: false }),
        makeEntry('invoiced', 5, 60, { invoiceId: 'inv-0' }),
        makeEntry('running', 7, null),
      ],
      ctx,
    );

    expect(lines).toEqual([
      {
        projectId: 'brand',
        description: 'Brand audit',
        billedSeconds: 3600,
        trackedSeconds: 3600,
        rateCents: 9000,
        amountCents: 9000,
        entryIds: ['brand-1'],
      },
      {
        projectId: 'web',
        description: 'Website redesign',
        billedSeconds: (30 + 60) * 60,
        trackedSeconds: (20 + 50) * 60,
        rateCents: 12_000,
        amountCents: 18_000,
        entryIds: ['web-1', 'web-2'],
      },
    ]);
  });

  it('prices the summed billed seconds of a line, not each entry', () => {
    const noRounding = createBillingContext(
      { ...settings, roundingIncrementMinutes: 0, defaultHourlyRateCents: 10_000 },
      [project('p', 'Tiny', 'c1', 10_000)],
      [client],
    );
    const entry = (id: string, day: number): TimeEntry => ({
      ...makeEntry(id, day, 0, { projectId: 'p' }),
      end: new Date(new Date(2026, 9, day, 9, 0).getTime() + 1000).toISOString(),
    });
    // Each second is worth 2.78 cents: per entry that rounds to 3 × 3 = 9, summed to 8.
    const [line] = buildInvoiceLines([entry('a', 5), entry('b', 6), entry('c', 7)], noRounding);
    expect(line?.billedSeconds).toBe(3);
    expect(line?.amountCents).toBe(8);
  });

  it('returns no lines when nothing is invoiceable', () => {
    expect(buildInvoiceLines([], ctx)).toEqual([]);
    expect(buildInvoiceLines([makeEntry('x', 5, 30, { billable: false })], ctx)).toEqual([]);
  });
});

describe('invoice totals', () => {
  it.each([
    [[10_000, 2550], 2200, { subtotalCents: 12_550, taxCents: 2761, totalCents: 15_311 }],
    [[1250], 1000, { subtotalCents: 1250, taxCents: 125, totalCents: 1375 }],
    [[5], 1000, { subtotalCents: 5, taxCents: 1, totalCents: 6 }],
    [[4], 1000, { subtotalCents: 4, taxCents: 0, totalCents: 4 }],
    [[9999], 0, { subtotalCents: 9999, taxCents: 0, totalCents: 9999 }],
    [[1000], 10_000, { subtotalCents: 1000, taxCents: 1000, totalCents: 2000 }],
    [[], 2200, { subtotalCents: 0, taxCents: 0, totalCents: 0 }],
  ])('lines %j at %d bps', (amounts, bps, expected) => {
    expect(
      computeInvoiceTotals(
        amounts.map((amountCents) => ({ amountCents })),
        bps,
      ),
    ).toEqual(expected);
  });

  it('computes totals from an invoice', () => {
    const line = {
      id: 'l1',
      projectId: 'web',
      description: 'Website redesign',
      billedSeconds: 3600,
      trackedSeconds: 3500,
      rateCents: 12_000,
      amountCents: 12_000,
      entryIds: ['e1'],
    };
    expect(invoiceTotals({ lines: [line, { ...line, id: 'l2' }], taxRateBps: 2200 })).toEqual({
      subtotalCents: 24_000,
      taxCents: 5280,
      totalCents: 29_280,
    });
  });
});

describe('invoice numbers', () => {
  it.each([
    ['INV-', 2026, 7, 'INV-2026-007'],
    ['INV-', 2026, 42, 'INV-2026-042'],
    ['INV-', 2026, 1000, 'INV-2026-1000'],
    ['', 2026, 1, '2026-001'],
    ['MS/', 2027, 12, 'MS/2027-012'],
  ])('formatInvoiceNumber(%j, %d, %d) → %s', (prefix, year, seq, expected) => {
    expect(formatInvoiceNumber(prefix, year, seq)).toBe(expected);
  });

  const numbers = (...values: string[]) => values.map((number) => ({ number }));

  it.each([
    ['starts at 001', [], 'INV-', 'INV-2026-001'],
    ['continues after the highest, keeping gaps', ['INV-2026-001', 'INV-2026-003'], 'INV-', 'INV-2026-004'],
    ['ignores order', ['INV-2026-010', 'INV-2026-002'], 'INV-', 'INV-2026-011'],
    ['ignores other years', ['INV-2025-009', 'INV-2027-004'], 'INV-', 'INV-2026-001'],
    ['ignores other prefixes', ['ACME-2026-005', 'XINV-2026-008'], 'INV-', 'INV-2026-001'],
    [
      'ignores malformed numbers',
      ['INV-2026-7', 'INV-2026-007-copy', 'INV-20261-001', 'INV-2026-00a'],
      'INV-',
      'INV-2026-001',
    ],
    ['grows past 999', ['INV-2026-999'], 'INV-', 'INV-2026-1000'],
    ['reads four-digit sequences', ['INV-2026-1000', 'INV-2026-999'], 'INV-', 'INV-2026-1001'],
    ['escapes regex characters in the prefix', ['AXB+2026-005', 'A.B+2026-002'], 'A.B+', 'A.B+2026-003'],
    ['handles brackets in the prefix', ['[x]2026-001'], '[x]', '[x]2026-002'],
    ['supports an empty prefix', ['2026-004', 'INV-2026-009'], '', '2026-005'],
    ['supports slashes', ['MS/2026-002'], 'MS/', 'MS/2026-003'],
  ])('nextInvoiceNumber %s', (_label, existing, prefix, expected) => {
    expect(nextInvoiceNumber(numbers(...existing), prefix, 2026)).toBe(expected);
  });
});

describe('invoice status', () => {
  it.each<[InvoiceStatus, string, string]>([
    ['draft', '2026-10-01', 'draft'],
    ['sent', '2026-10-08', 'overdue'],
    ['sent', '2026-10-09', 'sent'],
    ['sent', '2026-10-10', 'sent'],
    ['paid', '2026-09-01', 'paid'],
  ])('%s due %s on 2026-10-09 → %s', (status, dueDate, expected) => {
    expect(getInvoiceDisplayStatus({ status, dueDate }, '2026-10-09')).toBe(expected);
  });

  it('compares due dates across a year boundary', () => {
    expect(getInvoiceDisplayStatus({ status: 'sent', dueDate: '2025-12-31' }, '2026-01-01')).toBe(
      'overdue',
    );
  });

  it.each<[InvoiceStatus, InvoiceStatus, boolean]>([
    ['draft', 'sent', true],
    ['draft', 'paid', false],
    ['draft', 'draft', false],
    ['sent', 'paid', true],
    ['sent', 'draft', true],
    ['sent', 'sent', false],
    ['paid', 'sent', true],
    ['paid', 'draft', false],
    ['paid', 'paid', false],
  ])('%s → %s allowed: %s', (from, to, expected) => {
    expect(canTransition(from, to)).toBe(expected);
    expect(INVOICE_TRANSITIONS[from].includes(to)).toBe(expected);
  });
});

describe('addDaysToKey', () => {
  it.each([
    ['2026-10-09', 30, '2026-11-08'],
    ['2026-10-09', 0, '2026-10-09'],
    ['2026-01-31', 1, '2026-02-01'],
    ['2028-02-28', 1, '2028-02-29'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2026-10-24', 7, '2026-10-31'],
    ['2026-03-28', 2, '2026-03-30'],
    ['2026-10-31', 1, '2026-11-01'],
  ])('%s + %d days → %s', (key, days, expected) => {
    expect(addDaysToKey(key, days)).toBe(expected);
  });
});
