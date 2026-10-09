/**
 * Demo workspace for Alex Moreau of Moreau Studio, a small design and front-end studio.
 *
 * Everything is generated relative to `now` from a seeded pseudo-random generator, so the
 * same `now` always produces exactly the same data (tests and screenshots rely on this),
 * while the data always looks current. The generator follows the app's business rules:
 * no overlapping entries, nothing ending after `now`, no running timer, invoices built
 * with the same line logic as the app, and every invoiced entry linked to its invoice.
 */
import { addDays, startOfDay } from 'date-fns';
import { createBillingContext } from '@/domain/billing';
import { createDefaultSettings } from '@/domain/defaults';
import {
  addDaysToKey,
  buildInvoiceLines,
  formatInvoiceNumber,
  nextInvoiceNumber,
} from '@/domain/invoices';
import {
  DATABASE_VERSION,
  type Client,
  type DatabaseState,
  type Invoice,
  type InvoiceStatus,
  type Project,
  type ProjectColor,
  type Settings,
  type TimeEntry,
} from '@/domain/models';
import { toDateKey } from '@/lib/dates';

/** An empty workspace with default settings for the browser's locale. */
export function createEmptyDatabase(browserLocale?: string): DatabaseState {
  return {
    version: DATABASE_VERSION,
    clients: [],
    projects: [],
    entries: [],
    invoices: [],
    settings: createDefaultSettings(browserLocale),
  };
}

const HISTORY_DAYS = 70;
/** Any constant works; it only has to stay fixed so the output is reproducible. */
const DATA_SEED = 0x51_17_20_26;
const ID_SEED = 0x0b_ad_5e_ed;

type ClientKey = 'orchard' | 'kestrel' | 'lumen' | 'ferro';
type ProjectKey =
  'website' | 'booking' | 'store' | 'portal' | 'competition' | 'admin' | 'learning' | 'trail';

interface ClientSpec {
  key: ClientKey;
  name: string;
  email: string;
  address: string;
  hourlyRateCents: number | null;
  createdDaysAgo: number;
}

interface ProjectSpec {
  key: ProjectKey;
  name: string;
  client: ClientKey | null;
  color: ProjectColor;
  hourlyRateCents: number | null;
  /** First and last day with work on the project, relative to today (0 = today). */
  activeFrom: number;
  activeTo: number;
  /** Relative share of a working day. */
  weight: number;
  /** Tracked time ÷ budget the demo should show; `null` means the project has no budget. */
  budgetRatio: number | null;
  archived: boolean;
  notes: string | null;
  tasks: readonly string[];
}

interface InvoicePlan {
  client: ClientKey;
  /** Days (relative to today, inclusive) whose entries the invoice covers. */
  from: number;
  to: number;
  /** Issue day; moved off weekends (forwards, or backwards for the draft). */
  issuedOn: number;
  status: InvoiceStatus;
  /** For paid invoices: days between issuing and payment. */
  paidAfterDays?: number;
  taxRateBps: number;
  notes: string;
}

const CLIENTS: readonly ClientSpec[] = [
  {
    key: 'orchard',
    name: 'Orchard & Pine Hotels',
    email: 'accounts@orchardandpine.example',
    address: '14 Quayside Walk\nBristol BS1 0ZZ\nUnited Kingdom',
    hourlyRateCents: 9500,
    createdDaysAgo: 160,
  },
  {
    key: 'kestrel',
    name: 'Kestrel Outdoor Co.',
    email: 'finance@kestreloutdoor.example',
    address: 'Unit 4, Fellside Works\nKendal LA9 0ZZ\nUnited Kingdom',
    // No client rate: Kestrel work is billed at the studio's default rate.
    hourlyRateCents: null,
    createdDaysAgo: 120,
  },
  {
    key: 'lumen',
    name: 'Lumen Health Clinic',
    email: 'billing@lumenhealth.example',
    address: 'Rue des Tilleuls 48\n1000 Brussels\nBelgium',
    hourlyRateCents: 9000,
    createdDaysAgo: 210,
  },
  {
    key: 'ferro',
    name: 'Ferro Architetti',
    email: 'amministrazione@ferroarchitetti.example',
    address: 'Via dei Fabbri 7\n20123 Milano\nItaly',
    hourlyRateCents: 11000,
    createdDaysAgo: 55,
  },
];

/** Listed in palette order so each project gets the next colour, as the app suggests. */
const PROJECTS: readonly ProjectSpec[] = [
  {
    key: 'website',
    name: 'Website redesign',
    client: 'orchard',
    color: 'blue',
    hourlyRateCents: null,
    activeFrom: -HISTORY_DAYS,
    activeTo: 0,
    weight: 5,
    budgetRatio: 0.62,
    archived: false,
    notes: 'New marketing site for the hotel group. Content freeze two weeks before launch.',
    tasks: [
      'Homepage wireframes',
      'Room detail page layout',
      'Design review with the marketing team',
      'Responsive navigation',
      'Accessibility fixes from audit',
      'Gallery photography selection',
      'Content migration',
      'Newsletter sign-up and footer',
      'Hero image performance tuning',
      'Stakeholder workshop',
    ],
  },
  {
    key: 'booking',
    name: 'Booking engine',
    client: 'orchard',
    color: 'orange',
    hourlyRateCents: 10500,
    activeFrom: -49,
    activeTo: 0,
    weight: 4,
    // Close to its budget, to show the "Near budget" warning.
    budgetRatio: 0.88,
    archived: false,
    notes: 'Fixed scope agreed in the statement of work. Flag overruns early.',
    tasks: [
      'Availability calendar component',
      'Payment step integration',
      'Rate plan API mapping',
      'Checkout error states',
      'QA on staging',
      'Booking confirmation emails',
      'Date picker keyboard support',
    ],
  },
  {
    key: 'store',
    name: 'Online store refresh',
    client: 'kestrel',
    color: 'aqua',
    hourlyRateCents: null,
    activeFrom: -52,
    activeTo: 0,
    weight: 3,
    budgetRatio: 0.55,
    archived: false,
    notes: null,
    tasks: [
      'Product listing filters',
      'Size guide dialog',
      'Cart drawer',
      'Collection page templates',
      'Checkout copy review',
      'Product photo crops',
      'Weekly sync with the Kestrel team',
    ],
  },
  {
    key: 'portal',
    name: 'Patient portal',
    client: 'lumen',
    color: 'yellow',
    hourlyRateCents: null,
    activeFrom: -HISTORY_DAYS,
    activeTo: 0,
    weight: 3,
    budgetRatio: null,
    archived: false,
    notes: 'Ongoing support retainer, invoiced every five weeks.',
    tasks: [
      'Appointment booking flow',
      'Intake form validation',
      'Prescription renewal screens',
      'Patient messaging prototype',
      'Usability test notes',
      'Weekly check-in with clinic staff',
      'Accessibility review',
    ],
  },
  {
    key: 'competition',
    name: 'Museum competition entry',
    client: 'ferro',
    color: 'magenta',
    hourlyRateCents: null,
    activeFrom: -44,
    activeTo: -9,
    weight: 4,
    // Over its budget, to show the "Over budget" state.
    budgetRatio: 1.1,
    archived: false,
    notes: 'Competition boards and booklet for the new civic museum.',
    tasks: [
      'Competition board layout',
      'Site analysis diagrams',
      'Render post-production',
      'Model photography edit',
      'Narrative text editing',
      'Print file preparation',
    ],
  },
  {
    key: 'admin',
    name: 'Studio admin',
    client: null,
    color: 'green',
    hourlyRateCents: null,
    activeFrom: -HISTORY_DAYS,
    activeTo: 0,
    weight: 1.2,
    budgetRatio: null,
    archived: false,
    notes: null,
    tasks: [
      'Invoicing and bookkeeping',
      'Email and scheduling',
      'Proposal for a new client',
      'Portfolio update',
      'Tax paperwork',
    ],
  },
  {
    key: 'learning',
    name: 'Learning & research',
    client: null,
    color: 'violet',
    hourlyRateCents: null,
    activeFrom: -HISTORY_DAYS,
    activeTo: 0,
    weight: 0.8,
    budgetRatio: null,
    archived: false,
    notes: null,
    tasks: [
      'Design systems reading',
      'Prototyping with new CSS features',
      'Conference talk notes',
      'Typography experiments',
    ],
  },
  {
    key: 'trail',
    name: 'Trail guide microsite',
    client: 'kestrel',
    color: 'red',
    hourlyRateCents: null,
    activeFrom: -HISTORY_DAYS,
    activeTo: -46,
    weight: 4,
    budgetRatio: 0.97,
    archived: true,
    notes: 'Launched. Kept for reference.',
    tasks: [
      'Trail map illustrations',
      'Route detail template',
      'CMS training for editors',
      'Launch checklist',
    ],
  },
];

/** The project that opens each weekday, so every client gets regular work. */
const DAY_LEADS: Readonly<Record<number, readonly ProjectKey[]>> = {
  1: ['website'],
  2: ['portal'],
  3: ['trail', 'store'],
  4: ['booking', 'website'],
  5: ['competition', 'portal'],
};
const SATURDAY_PROJECTS: readonly ProjectKey[] = ['website', 'competition', 'learning'];

const PAYMENT_NOTE =
  'Payment by bank transfer within 30 days. Please quote the invoice number as the reference.';
const REVERSE_CHARGE_NOTE =
  'Reverse charge: VAT to be accounted for by the recipient. Payment by bank transfer within 30 days.';

const INVOICE_PLANS: readonly InvoicePlan[] = [
  {
    client: 'kestrel',
    from: -HISTORY_DAYS,
    to: -43,
    issuedOn: -42,
    status: 'paid',
    paidAfterDays: 26,
    taxRateBps: 2000,
    notes: PAYMENT_NOTE,
  },
  {
    client: 'orchard',
    from: -HISTORY_DAYS,
    to: -43,
    issuedOn: -42,
    status: 'paid',
    paidAfterDays: 19,
    taxRateBps: 2000,
    notes: PAYMENT_NOTE,
  },
  // Issued five weeks ago with 30-day terms: overdue.
  {
    client: 'lumen',
    from: -HISTORY_DAYS,
    to: -36,
    issuedOn: -35,
    status: 'sent',
    taxRateBps: 2000,
    notes: PAYMENT_NOTE,
  },
  // Issued three weeks ago: due in the coming days.
  {
    client: 'orchard',
    from: -42,
    to: -22,
    issuedOn: -21,
    status: 'sent',
    taxRateBps: 2000,
    notes: PAYMENT_NOTE,
  },
  {
    client: 'ferro',
    from: -42,
    to: -22,
    issuedOn: -1,
    status: 'draft',
    taxRateBps: 0,
    notes: REVERSE_CHARGE_NOTE,
  },
];

export function createDemoDatabase(now: Date): DatabaseState {
  const random = new Random(DATA_SEED);
  const ids = new Random(ID_SEED);
  const today = startOfDay(now);
  const dayAt = (offset: number, hours: number, minutes = 0) =>
    atSeconds(addDays(today, offset), hours * 3600 + minutes * 60);

  const settings: Settings = {
    ...createDefaultSettings('en-GB'),
    ownerName: 'Alex Moreau',
    businessName: 'Moreau Studio',
    businessEmail: 'hello@moreaustudio.example',
    businessAddress: '27 Rue des Ateliers\n69002 Lyon\nFrance',
    taxId: 'FR 00 123 456 789',
    defaultHourlyRateCents: 8500,
    roundingIncrementMinutes: 15,
    roundingMode: 'nearest',
    invoicePrefix: 'MS-',
    defaultTaxRateBps: 2000,
  };

  const clientIds = {} as Record<ClientKey, string>;
  const clients: Client[] = CLIENTS.map((spec) => {
    const id = ids.uuid();
    clientIds[spec.key] = id;
    const createdAt = dayAt(-spec.createdDaysAgo, 10).toISOString();
    return {
      id,
      name: spec.name,
      email: spec.email,
      address: spec.address,
      hourlyRateCents: spec.hourlyRateCents,
      archived: false,
      createdAt,
      updatedAt: createdAt,
    };
  });

  const projectIds = {} as Record<ProjectKey, string>;
  for (const spec of PROJECTS) projectIds[spec.key] = ids.uuid();

  /* ---- Time entries ---- */
  const entries: TimeEntry[] = [];
  const addEntry = (spec: ProjectSpec, day: Date, block: Block) => {
    // Timer-tracked entries have ragged start and end times; typed-in ones are tidy.
    const timerTracked = block.endMinute - block.startMinute >= 20 && random.chance(0.6);
    const startShift = timerTracked ? random.int(0, 4) * 60 + random.int(0, 59) : 0;
    const endShift = timerTracked ? random.int(0, 4) * 60 + random.int(0, 59) : 0;
    const start = atSeconds(day, block.startMinute * 60 + startShift);
    const end = atSeconds(day, block.endMinute * 60 - endShift);
    const description = random.chance(0.05) ? '' : random.pick(spec.tasks);
    const billable = spec.client !== null && !random.chance(0.04);
    if (end.getTime() > now.getTime()) return;
    entries.push({
      id: ids.uuid(),
      description,
      projectId: projectIds[spec.key],
      start: start.toISOString(),
      end: end.toISOString(),
      billable,
      invoiceId: null,
      createdAt: start.toISOString(),
      updatedAt: end.toISOString(),
    });
  };

  for (let offset = -HISTORY_DAYS; offset <= 0; offset += 1) {
    const day = addDays(today, offset);
    const weekday = day.getDay();
    const active = PROJECTS.filter((spec) => offset >= spec.activeFrom && offset <= spec.activeTo);

    if (weekday === 0) continue;
    if (weekday === 6) {
      if (!random.chance(0.12)) continue;
      const weekendProjects = active.filter((spec) => SATURDAY_PROJECTS.includes(spec.key));
      for (const block of planSaturday(random)) {
        addEntry(
          random.weighted(weekendProjects, (spec) => spec.weight),
          day,
          block,
        );
      }
      continue;
    }
    // The occasional day off.
    if (random.chance(0.04)) continue;

    const lead = DAY_LEADS[weekday]
      ?.map((key) => active.find((spec) => spec.key === key))
      .find((spec) => spec !== undefined);
    const blocks = planWorkday(random);
    blocks.forEach((block, index) => {
      const isFridayWrapUp = weekday === 5 && index === blocks.length - 1 && random.chance(0.5);
      const spec =
        index === 0 && lead !== undefined
          ? lead
          : isFridayWrapUp
            ? projectSpec('admin')
            : random.weighted(active, (candidate) => candidate.weight);
      addEntry(spec, day, block);
    });
  }

  /* ---- Projects (budgets follow the generated time) ---- */
  const trackedSeconds = new Map<string, number>();
  for (const entry of entries) {
    if (entry.projectId === null || entry.end === null) continue;
    const seconds = (Date.parse(entry.end) - Date.parse(entry.start)) / 1000;
    trackedSeconds.set(entry.projectId, (trackedSeconds.get(entry.projectId) ?? 0) + seconds);
  }
  const projects: Project[] = PROJECTS.map((spec) => {
    const id = projectIds[spec.key];
    const createdAt = dayAt(spec.activeFrom - 4, 9).toISOString();
    return {
      id,
      name: spec.name,
      clientId: spec.client === null ? null : clientIds[spec.client],
      color: spec.color,
      hourlyRateCents: spec.hourlyRateCents,
      budgetHours: budgetHoursFor(spec.budgetRatio, trackedSeconds.get(id) ?? 0),
      billableByDefault: spec.client !== null,
      notes: spec.notes,
      archived: spec.archived,
      createdAt,
      updatedAt: spec.archived ? dayAt(spec.activeTo + 6, 16).toISOString() : createdAt,
    };
  });

  /* ---- Invoices ---- */
  const billing = createBillingContext(settings, projects, clients);
  const invoices: Invoice[] = [];
  const plans = INVOICE_PLANS.map((plan) => ({ plan, issueDay: issueDayFor(plan, today) })).sort(
    (a, b) => a.issueDay.getTime() - b.issueDay.getTime(),
  );

  for (const { plan, issueDay } of plans) {
    const client = clients.find((candidate) => candidate.id === clientIds[plan.client]);
    if (client === undefined) continue;
    const periodStart = toDateKey(addDays(today, plan.from));
    const periodEnd = toDateKey(addDays(today, plan.to));
    const covered = entries.filter((entry) => {
      const project = billing.projectsById.get(entry.projectId ?? '');
      const dayKey = toDateKey(new Date(entry.start));
      return (
        project?.clientId === client.id &&
        entry.billable &&
        entry.invoiceId === null &&
        dayKey >= periodStart &&
        dayKey <= periodEnd
      );
    });
    const lines = buildInvoiceLines(covered, billing).map((line) => ({ ...line, id: ids.uuid() }));
    if (lines.length === 0) continue;

    const issueDate = toDateKey(issueDay);
    const year = issueDay.getFullYear();
    const isFirstOfYear = !invoices.some((invoice) => invoice.issueDate.startsWith(`${year}-`));
    // Numbering continues from invoices issued earlier in the year, before Stint was used.
    const number = isFirstOfYear
      ? formatInvoiceNumber(settings.invoicePrefix, year, issueDay.getMonth() * 2 + 1)
      : nextInvoiceNumber(invoices, settings.invoicePrefix, year);
    const createdAt = atSeconds(
      issueDay,
      plan.status === 'draft' ? 17 * 3600 + 40 * 60 : 9 * 3600 + 30 * 60,
    );
    const sentAt = plan.status === 'draft' ? null : atSeconds(issueDay, 10 * 3600 + 5 * 60);
    const paidAt =
      plan.status === 'paid' && plan.paidAfterDays !== undefined
        ? atSeconds(addDays(issueDay, plan.paidAfterDays), 11 * 3600 + 20 * 60)
        : null;
    const id = ids.uuid();

    invoices.push({
      id,
      number,
      clientId: client.id,
      status: plan.status,
      issueDate,
      dueDate: addDaysToKey(issueDate, settings.paymentTermsDays),
      periodStart,
      periodEnd,
      currency: settings.currency,
      from: {
        name: settings.businessName,
        email: settings.businessEmail,
        address: settings.businessAddress,
        taxId: settings.taxId,
      },
      billTo: { name: client.name, email: client.email, address: client.address, taxId: null },
      lines,
      taxRateBps: plan.taxRateBps,
      rounding: {
        incrementMinutes: settings.roundingIncrementMinutes,
        mode: settings.roundingMode,
      },
      notes: plan.notes,
      sentAt: sentAt?.toISOString() ?? null,
      paidAt: paidAt?.toISOString() ?? null,
      createdAt: createdAt.toISOString(),
      updatedAt: (paidAt ?? sentAt ?? createdAt).toISOString(),
    });

    const invoicedIds = new Set(lines.flatMap((line) => line.entryIds));
    for (const entry of entries) {
      if (!invoicedIds.has(entry.id)) continue;
      entry.invoiceId = id;
      entry.updatedAt = createdAt.toISOString();
    }
  }

  return {
    version: DATABASE_VERSION,
    clients,
    projects,
    entries,
    invoices,
    settings,
  };
}

/* ---------- Day planning ---------- */

/** A planned block of work, in minutes after local midnight. */
interface Block {
  startMinute: number;
  endMinute: number;
}

const minutesOf = (hours: number, minutes = 0) => hours * 60 + minutes;

/** 2–5 blocks between roughly 08:30 and 18:30, with a lunch break and short pauses. */
function planWorkday(random: Random): Block[] {
  const count = random.int(2, 5);
  const morningCount = count >= 4 ? 2 : random.int(1, Math.min(2, count - 1));
  const dayStart = minutesOf(8, 30) + random.int(0, 9) * 5;
  const lunchStart = minutesOf(12) + random.int(0, 9) * 5;
  const lunchEnd = lunchStart + random.int(9, 15) * 5;
  const dayEnd = minutesOf(17) + random.int(0, 18) * 5;
  return [
    ...splitWindow(random, dayStart, lunchStart, morningCount),
    ...splitWindow(random, lunchEnd, dayEnd, count - morningCount),
  ];
}

/** A short late-morning session. */
function planSaturday(random: Random): Block[] {
  const start = minutesOf(10) + random.int(0, 6) * 5;
  return splitWindow(random, start, start + random.int(12, 20) * 10, random.int(1, 2));
}

/** Splits a window into consecutive blocks of random length with 5–15 minute pauses between. */
function splitWindow(random: Random, from: number, to: number, parts: number): Block[] {
  const weights = Array.from({ length: parts }, () => 0.6 + random.next());
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const blocks: Block[] = [];
  let cursor = from;
  weights.forEach((weight, index) => {
    const share = Math.round(((to - from) * weight) / totalWeight / 5) * 5;
    const end = index === parts - 1 ? to : cursor + share;
    const pause = index === 0 ? 0 : random.int(1, 3) * 5;
    blocks.push({ startMinute: cursor + pause, endMinute: end });
    cursor = end;
  });
  return blocks;
}

/* ---------- Helpers ---------- */

function projectSpec(key: ProjectKey): ProjectSpec {
  const spec = PROJECTS.find((candidate) => candidate.key === key);
  if (spec === undefined) throw new Error(`Unknown demo project: ${key}`);
  return spec;
}

/** A local instant on `day`, given as seconds after midnight. */
function atSeconds(day: Date, seconds: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, seconds);
}

function budgetHoursFor(ratio: number | null, trackedSeconds: number): number | null {
  if (ratio === null) return null;
  const hours = trackedSeconds / 3600 / ratio;
  // Rounding towards the target keeps "near" and "over" budgets on the right side of their thresholds.
  return Math.max(1, ratio > 1 ? Math.floor(hours) : Math.ceil(hours));
}

function issueDayFor(plan: InvoicePlan, today: Date): Date {
  let day = addDays(today, plan.issuedOn);
  const step = plan.status === 'draft' ? -1 : 1;
  while (day.getDay() === 0 || day.getDay() === 6) day = addDays(day, step);
  return day;
}

/** mulberry32: a tiny, fast, seedable generator that is plenty for demo data. */
class Random {
  #state: number;

  constructor(seed: number) {
    this.#state = seed >>> 0;
  }

  next(): number {
    this.#state = (this.#state + 0x6d2b79f5) >>> 0;
    let t = this.#state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** An integer between `min` and `max`, both inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    const item = items[Math.floor(this.next() * items.length)];
    if (item === undefined) throw new Error('Cannot pick from an empty list');
    return item;
  }

  weighted<T>(items: readonly T[], weightOf: (item: T) => number): T {
    const total = items.reduce((sum, item) => sum + weightOf(item), 0);
    let remaining = this.next() * total;
    for (const item of items) {
      remaining -= weightOf(item);
      if (remaining < 0) return item;
    }
    return this.pick(items);
  }

  /** A version 4 UUID built from this generator, so ids are reproducible too. */
  uuid(): string {
    const hex = Array.from({ length: 32 }, () => this.int(0, 15).toString(16));
    hex[12] = '4';
    hex[16] = this.int(8, 11).toString(16);
    const text = hex.join('');
    return `${text.slice(0, 8)}-${text.slice(8, 12)}-${text.slice(12, 16)}-${text.slice(16, 20)}-${text.slice(20)}`;
  }
}
