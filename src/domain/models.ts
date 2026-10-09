/**
 * Domain models.
 *
 * Every entity is described by a Zod schema; the TypeScript types are inferred from
 * those schemas so runtime validation and compile-time types can never drift apart.
 * The schemas validate data at the boundaries of the app: data loaded from storage,
 * backup files imported by the user, and inputs sent to the API layer.
 *
 * Conventions:
 * - Money is stored as integer minor units (cents) to avoid floating-point errors.
 * - Durations are stored as whole seconds.
 * - Instants are ISO-8601 timestamps (UTC); calendar dates are `YYYY-MM-DD` keys.
 * - Tax rates are basis points (2200 = 22%).
 */
import { z } from 'zod';

export const PROJECT_COLORS = [
  'blue',
  'orange',
  'aqua',
  'yellow',
  'magenta',
  'green',
  'violet',
  'red',
] as const;
export type ProjectColor = (typeof PROJECT_COLORS)[number];

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const LOCALES = ['en-US', 'en-GB'] as const;
export type AppLocale = (typeof LOCALES)[number];

export const ROUNDING_INCREMENTS = [0, 1, 5, 6, 10, 15, 30] as const;
export type RoundingIncrement = (typeof ROUNDING_INCREMENTS)[number];

export const ROUNDING_MODES = ['up', 'nearest'] as const;
export type RoundingMode = (typeof ROUNDING_MODES)[number];

export const INVOICE_STATUSES = ['draft', 'sent', 'paid'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** Upper bound for any amount: 10 million in major currency units. */
const MAX_CENTS = 1_000_000_000;

export const idSchema = z.string().min(1).max(64);
export const timestampSchema = z.iso.datetime({ offset: true });
export const dateKeySchema = z.iso.date();
export const centsSchema = z.number().int().min(0).max(MAX_CENTS);
export const taxRateBpsSchema = z.number().int().min(0).max(10_000);

export const clientSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1, 'Name is required').max(80, 'Keep the name under 80 characters'),
  email: z.email('Enter a valid email address').max(254).nullable(),
  address: z.string().trim().max(500, 'Keep the address under 500 characters').nullable(),
  hourlyRateCents: centsSchema.nullable(),
  archived: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type Client = z.infer<typeof clientSchema>;

export const projectSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1, 'Name is required').max(80, 'Keep the name under 80 characters'),
  clientId: idSchema.nullable(),
  color: z.enum(PROJECT_COLORS),
  hourlyRateCents: centsSchema.nullable(),
  budgetHours: z
    .number()
    .positive('Budget must be greater than zero')
    .max(100_000, 'Budget is too large')
    .nullable(),
  billableByDefault: z.boolean(),
  notes: z.string().trim().max(1000, 'Keep notes under 1,000 characters').nullable(),
  archived: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type Project = z.infer<typeof projectSchema>;

/** A time entry. `end === null` means the entry is the running timer. */
export const timeEntrySchema = z.object({
  id: idSchema,
  description: z.string().trim().max(200, 'Keep the description under 200 characters'),
  projectId: idSchema.nullable(),
  start: timestampSchema,
  end: timestampSchema.nullable(),
  billable: z.boolean(),
  invoiceId: idSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type TimeEntry = z.infer<typeof timeEntrySchema>;

export const invoicePartySchema = z.object({
  name: z.string().trim().max(120),
  email: z.string().trim().max(254).nullable(),
  address: z.string().trim().max(500).nullable(),
  taxId: z.string().trim().max(60).nullable(),
});
export type InvoiceParty = z.infer<typeof invoicePartySchema>;

export const invoiceLineSchema = z.object({
  id: idSchema,
  projectId: idSchema.nullable(),
  description: z.string().trim().min(1).max(200),
  /** Time billed after rounding. */
  billedSeconds: z.number().int().min(0),
  /** Time actually tracked, kept for transparency. */
  trackedSeconds: z.number().int().min(0),
  rateCents: centsSchema,
  amountCents: centsSchema,
  entryIds: z.array(idSchema),
});
export type InvoiceLine = z.infer<typeof invoiceLineSchema>;

export const invoiceSchema = z.object({
  id: idSchema,
  number: z.string().trim().min(1).max(40),
  clientId: idSchema,
  status: z.enum(INVOICE_STATUSES),
  issueDate: dateKeySchema,
  dueDate: dateKeySchema,
  periodStart: dateKeySchema.nullable(),
  periodEnd: dateKeySchema.nullable(),
  currency: z.enum(CURRENCIES),
  /** Snapshots taken when the invoice is created, so later edits don't rewrite history. */
  from: invoicePartySchema,
  billTo: invoicePartySchema,
  lines: z.array(invoiceLineSchema).min(1),
  taxRateBps: taxRateBpsSchema,
  rounding: z.object({
    incrementMinutes: z.literal(ROUNDING_INCREMENTS),
    mode: z.enum(ROUNDING_MODES),
  }),
  notes: z.string().trim().max(1000).nullable(),
  sentAt: timestampSchema.nullable(),
  paidAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type Invoice = z.infer<typeof invoiceSchema>;

export const settingsSchema = z.object({
  ownerName: z.string().trim().max(80, 'Keep the name under 80 characters'),
  businessName: z.string().trim().max(120, 'Keep the business name under 120 characters'),
  businessEmail: z.email('Enter a valid email address').max(254).nullable(),
  businessAddress: z.string().trim().max(500, 'Keep the address under 500 characters').nullable(),
  taxId: z.string().trim().max(60, 'Keep the tax ID under 60 characters').nullable(),
  currency: z.enum(CURRENCIES),
  locale: z.enum(LOCALES),
  defaultHourlyRateCents: centsSchema,
  weekStartsOn: z.literal([0, 1]),
  weeklyTargetHours: z
    .number()
    .min(1, 'Target must be at least 1 hour')
    .max(100, 'Target must be at most 100 hours'),
  roundingIncrementMinutes: z.literal(ROUNDING_INCREMENTS),
  roundingMode: z.enum(ROUNDING_MODES),
  invoicePrefix: z
    .string()
    .trim()
    .max(12, 'Keep the prefix under 12 characters')
    .regex(/^[A-Za-z0-9\-_/]*$/, 'Use letters, numbers, dashes, underscores or slashes'),
  paymentTermsDays: z
    .number()
    .int()
    .min(0, 'Payment terms cannot be negative')
    .max(120, 'Payment terms must be 120 days or less'),
  defaultTaxRateBps: taxRateBpsSchema,
});
export type Settings = z.infer<typeof settingsSchema>;

/* ---------- API inputs ---------- */

export const clientInputSchema = clientSchema.pick({
  name: true,
  email: true,
  address: true,
  hourlyRateCents: true,
});
export type ClientInput = z.infer<typeof clientInputSchema>;

export const projectInputSchema = projectSchema.pick({
  name: true,
  clientId: true,
  color: true,
  hourlyRateCents: true,
  budgetHours: true,
  billableByDefault: true,
  notes: true,
});
export type ProjectInput = z.infer<typeof projectInputSchema>;

export const timeEntryInputSchema = z.object({
  description: timeEntrySchema.shape.description,
  projectId: idSchema.nullable(),
  start: timestampSchema,
  end: timestampSchema,
  billable: z.boolean(),
});
export type TimeEntryInput = z.infer<typeof timeEntryInputSchema>;

export const timerStartInputSchema = z.object({
  description: timeEntrySchema.shape.description,
  projectId: idSchema.nullable(),
  billable: z.boolean(),
});
export type TimerStartInput = z.infer<typeof timerStartInputSchema>;

export const runningEntryPatchSchema = timerStartInputSchema
  .extend({ start: timestampSchema })
  .partial();
export type RunningEntryPatch = z.infer<typeof runningEntryPatchSchema>;

export const invoiceCreateInputSchema = z.object({
  clientId: idSchema,
  entryIds: z.array(idSchema).min(1, 'Select at least one time entry'),
  issueDate: dateKeySchema,
  dueDate: dateKeySchema,
  taxRateBps: taxRateBpsSchema,
  notes: z.string().trim().max(1000).nullable(),
  periodStart: dateKeySchema.nullable(),
  periodEnd: dateKeySchema.nullable(),
});
export type InvoiceCreateInput = z.infer<typeof invoiceCreateInputSchema>;

export const invoiceDetailsInputSchema = z.object({
  issueDate: dateKeySchema,
  dueDate: dateKeySchema,
  taxRateBps: taxRateBpsSchema,
  notes: z.string().trim().max(1000).nullable(),
});
export type InvoiceDetailsInput = z.infer<typeof invoiceDetailsInputSchema>;

/* ---------- Persisted database ---------- */

export const DATABASE_VERSION = 1;

export const databaseSchema = z.object({
  version: z.literal(DATABASE_VERSION),
  clients: z.array(clientSchema),
  projects: z.array(projectSchema),
  entries: z.array(timeEntrySchema),
  invoices: z.array(invoiceSchema),
  settings: settingsSchema,
});
export type DatabaseState = z.infer<typeof databaseSchema>;
