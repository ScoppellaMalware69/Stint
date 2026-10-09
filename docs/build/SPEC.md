# Stint — shared build spec (read fully before writing code)

Project root: `C:\Users\Adam.Bouallala\Desktop\code\stint` (Windows, Git Bash shell; use forward slashes in bash).
Stint = time tracking + invoicing for freelancers/small studios. Local-first SPA: all data lives in the browser
(localStorage) behind an async API layer that could be swapped for a REST backend.

## Stack (already installed — DO NOT install/upgrade/remove packages, DO NOT edit package.json)
Vite 8, React 19.3 (ref is a normal prop; no forwardRef needed), TypeScript 6 (strict, `noUncheckedIndexedAccess`,
`verbatimModuleSyntax` → use `import type`/inline `type` imports, `erasableSyntaxOnly` → no enums/namespaces/parameter
properties), React Router 8 (data mode: `createBrowserRouter` from 'react-router', `RouterProvider` from 'react-router/dom';
everything else from 'react-router'), TanStack Query 5, Zod 4 (`z.email()`, `z.iso.date()`, `z.flattenError(err)`),
react-hook-form 7 + `@hookform/resolvers/zod` (`zodResolver`), `radix-ui` (import `{ Dialog, DropdownMenu, Tooltip, Toast,
AlertDialog, Popover, Slot, ... } from 'radix-ui'` then `<Dialog.Root>` etc.), lucide-react icons, date-fns 4, clsx +
tailwind-merge (use `cn()` from `@/lib/cn`), Tailwind CSS 4 (CSS-first config in `src/styles/index.css`).
Tests: Vitest 4 + jsdom + Testing Library (+ user-event, jest-dom matchers). E2E later with Playwright.
Path alias: `@/` → `src/`. Named exports only (no default exports) except where a tool requires it.

## Existing files (read them; do not rewrite unless you own them)
- `src/styles/index.css` — design tokens (see Design system below). Owned by lead; don't edit.
- `src/domain/models.ts` — Zod schemas + inferred types: Client, Project, TimeEntry (end===null ⇒ running timer),
  Invoice, InvoiceLine, InvoiceParty, Settings, DatabaseState, inputs (ClientInput, ProjectInput, TimeEntryInput,
  TimerStartInput, RunningEntryPatch, InvoiceCreateInput, InvoiceDetailsInput), constants PROJECT_COLORS, CURRENCIES,
  LOCALES ('en-US'|'en-GB'), ROUNDING_INCREMENTS, ROUNDING_MODES ('up'|'nearest'), INVOICE_STATUSES ('draft'|'sent'|'paid'),
  DATABASE_VERSION, databaseSchema. Money = integer cents; durations = seconds; tax = basis points (2200 = 22%).
- `src/services/api/types.ts` — `StintApi` interface (THE contract between UI and data), `EntryQuery`, `BackupFile`,
  `ImportSummary`, `TimerStartResult`.
- `src/lib/dates.ts` — toDateKey, parseDateKey, dateFromKey, todayKey, weekStartOf, weekRange, rangeFromKeys, lastDayOf,
  isWithinRange, RANGE_PRESETS/RangePreset/RANGE_PRESET_LABELS/isRangePreset/presetRange, combineDateAndTime,
  toTimeInputValue, types DateRange {from, to(exclusive)}, WeekStart (0|1).
- `src/lib/duration.ts` — formatClock (H:MM:SS), formatHoursMinutes (H:MM), formatDurationText ("7h 45m"),
  toDecimalHours, parseDurationInput (→ seconds|null), SECONDS_PER_HOUR/MINUTE.
- `src/lib/money.ts` — parseMoneyInput (→ cents|null), centsToInputValue, parsePercentInput (→ bps|null), bpsToInputValue.
- `src/lib/csv.ts` — toCsv(header, rows), escapeCsvCell (formula-injection safe).
- `src/lib/download.ts` — downloadTextFile(filename, content, mime).
- `src/lib/id.ts` — createId(). `src/lib/cn.ts` — cn(). `src/lib/colors.ts` — dataColorVar(color|'other') → 'var(--data-x)',
  PROJECT_COLOR_LABELS, suggestProjectColor(usedColors).
- `src/test/setup.ts` — jest-dom matchers, cleanup + localStorage.clear after each test, matchMedia/ResizeObserver stubs.
- `src/vite-env.d.ts` — ImportMetaEnv: VITE_SEED_DEMO_DATA, VITE_SIMULATED_LATENCY_MS.

## Design system ("paper & ink ledger") — follow strictly
Chrome is monochrome: warm paper surfaces, ink-black primary actions, hairline rules. Colour is reserved for DATA (project
colours, charts), STATUS, and the vermilion "live" SIGNAL of a running timer. No gradients, no glassmorphism, no glow.
Tailwind's default palette is REMOVED — only these colour utilities exist (bg-/text-/border-/fill-/stroke-/ring-/outline-):
- Surfaces: `canvas` (page bg), `surface` (cards/panels/dialogs), `sunken` (hover rows, table headers, segmented bg, selected nav).
- Text: `ink` (primary), `ink-2` (secondary), `ink-3` (muted/meta — still AA), `ink-inverse` (text on ink-coloured buttons).
- Lines: `line` (hairline dividers/card borders), `line-strong` (form-control borders; 3:1 contrast).
- `overlay` (dialog backdrop).
- Live timer only: `signal`, `signal-soft`.
- Status text/backgrounds (always with icon + text label, never colour alone): `danger`/`danger-soft`,
  `success`/`success-soft`, `warning`/`warning-soft`. Status marks/icons: `status-good|warning|serious|critical`.
- Data hues (project identity + charts ONLY): `data-blue|orange|aqua|yellow|magenta|green|violet|red`, `data-other`;
  chart chrome `chart-grid`, `chart-axis`; meters `meter-track`, `meter-track-warning`, `meter-track-critical`.
  In inline styles use `dataColorVar(color)` (e.g. `style={{ backgroundColor: dataColorVar(project.color) }}`).
- Opacity modifiers work (`bg-ink/5`).
Fonts: `font-sans` (IBM Plex Sans, default), `font-mono` (IBM Plex Mono: live timer clock, invoice numbers),
`font-display` (Instrument Serif — ONLY for page H1 titles via `font-display text-display`, the "Stint" wordmark, and the
invoice document title; NEVER for numbers). Numbers: headline figures use sans semibold with proportional figures;
columns of numbers use `tabular-nums`.
Type scale: body is already 15px (mobile) / 14px (lg+). Use `text-sm` secondary, `text-xs` meta/captions/table headers
(sentence case, no ALL CAPS), section headings `text-base font-semibold text-ink`. Hero figure: `text-hero font-semibold`.
Radii: buttons/inputs `rounded-md` (8px), cards `rounded-lg` (12px), dialogs `rounded-xl` (16px), chips `rounded-full`/`rounded-sm`.
Shadows: only `shadow-pop` for floating layers (menus, popovers, dialogs, toasts). Cards: `bg-surface border border-line rounded-lg`.
Sizing: controls `h-10 lg:h-9` (md), `h-9 lg:h-8` (sm); inputs `text-base lg:text-sm` (16px on mobile prevents iOS zoom).
Touch targets ≥ 40px on mobile. Icons lucide-react: `size-4` inline, `size-[18px]` nav; decorative icons `aria-hidden`.
Focus: global `:focus-visible` outline (2px ink, offset 2px) — never remove outlines. Use `outline-offset` tweaks only.
Motion: overlays use `data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out` (dialogs/menus/popovers),
`animate-fade-in` (backdrops), `animate-sheet-in/out` (mobile drawer from the left), `animate-live` (pulsing live dot),
`animate-rise-in` (toasts). Hover transitions `transition-colors duration-150`. Reduced motion is handled globally in CSS.
Layout: page container `mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10`; sidebar on ≥ lg (1024px); below lg a
sticky top bar + slide-in drawer. Pages MUST NOT overflow horizontally at 360px. Below `md` (768px) data tables become stacked
cards/rows (or wrap in an `overflow-x-auto` container only when a true table is essential).
Copy: English, sentence case ("New project", "Mark as paid"). Every control must work — no dead buttons or fake links.

## Dataviz rules (validated palette; applies to charts + KPI tiles)
- Pick the form first: single numbers → stat tile / hero figure (exactly ONE hero figure per view); ratio vs limit → meter
  (fill = blue `data-blue` on `meter-track`; ≥80% → `status-warning` fill on `meter-track-warning` + warning icon +
  "Near budget" label; >100% → `status-critical` on `meter-track-critical` + icon + "Over budget"); magnitude over time →
  columns; part-to-whole → stacked columns. Never pies/donuts, never dual axes.
- Categorical colours follow the ENTITY (project.color), never rank. Max ~6 series: fold the rest into "Other" (`data-other`).
- Emphasis form: billable = `data-blue`, non-billable = `data-other` gray.
- Marks: columns ≤ 24px wide, 4px rounded top (data end), square at baseline; 2px surface-coloured gap between stacked
  segments; gridlines solid 1px hairlines (`chart-grid`), baseline `chart-axis`; never dashed.
- A legend is present for ≥ 2 series (none for 1). Label selectively (e.g. value on the tallest column only).
- Text never wears the data colour: labels/values use ink tokens; identity is the coloured swatch next to the text.
- Hover AND keyboard focus show the same tooltip (values lead, series names follow; short line keys in tooltip).
  Hit target = whole column band (bigger than the mark). Arrow keys move between columns (roving tabindex).
- Every chart has a "Table" view toggle (accessible twin) — three light-mode hues are < 3:1, so this is mandatory.
- While refetching, keep the previous render at reduced opacity (no skeleton flash).
- Tooltip/legend/table text inserted as React text (never dangerouslySetInnerHTML).

## Accessibility (WCAG 2.2 AA)
Semantic HTML, one h1 per page, logical heading order, labels on every field (visible), errors linked via
aria-describedby + aria-invalid, focus management in dialogs (Radix), keyboard operable menus, visible focus, colour never
the only signal, `aria-live` status for async feedback (toasts handle this), skip link, reduced motion, 24px+ targets.

## Data layer behaviour (business rules)
- One running entry at most (end === null). Starting a timer stops the running one atomically.
- Rate inheritance: project.hourlyRateCents ?? client.hourlyRateCents ?? settings.defaultHourlyRateCents.
- Only entries whose project has a client can be billable; service forces `billable=false` otherwise.
- Amount = round(billedSeconds × rateCents / 3600); billedSeconds = per-entry rounding by settings
  (roundingIncrementMinutes 0 = none; mode 'up' ceil / 'nearest' round). Amounts everywhere use billed seconds; hour
  figures show tracked seconds.
- Invoiced entries (invoiceId ≠ null) are LOCKED: update/remove → ApiError LOCKED. Deleting a draft invoice releases them.
- Invoice status: stored draft|sent|paid; "overdue" is derived (sent && dueDate < today). Transitions: draft→sent,
  sent→paid, sent→draft, paid→sent. Only drafts can be edited (details) or deleted.
- Invoice number: `${settings.invoicePrefix}${year}-${seq 3 digits}`, seq = max existing seq for that prefix+year + 1.
- Invoices snapshot `from` (settings business details) and `billTo` (client details), currency and rounding at creation.
- Manual entries: end > start, ≤ 24h, must not end in the future (1 min tolerance). Timer entries may run longer;
  UI flags entries > 12h as "unusually long".
- Delete project only without entries (else CONFLICT → suggest archive). Delete client only without projects/invoices.

## Shared module contracts (exact names; implement or consume exactly these)

### Domain logic (pure TS, no React) — owner: DOMAIN agent
`src/lib/format.ts`
```ts
export interface Formatters {
  locale: AppLocale; currency: Currency;
  money(cents: number): string;          // "€1,234.50"
  moneyWhole(cents: number): string;     // "€1,235" (no fraction digits) for tiles
  percent(ratio: number, fractionDigits?: number): string; // 0.725 → "73%"
  number(value: number, fractionDigits?: number): string;
  hours(seconds: number): string;        // decimal hours "7.75" localised (for invoices/tables)
  date(value: Date | string): string;    // medium: "9 Oct 2026" (en-GB) / "Oct 9, 2026" (en-US)
  dateShort(value: Date | string): string; // "9 Oct" / "Oct 9"
  weekday(value: Date | string): string; // "Thu"
  dayHeading(value: Date | string, now?: Date): string; // "Today" | "Yesterday" | "Thursday 9 October"
  time(value: Date | string): string;    // "09:30" (en-GB) / "9:30 AM" (en-US)
  monthYear(value: Date | string): string; // "October 2026"
  relativeDays(dateKey: string, now?: Date): string; // "today" | "tomorrow" | "in 3 days" | "5 days ago"
}
export function createFormatters(locale: AppLocale, currency: Currency): Formatters;
export function toDate(value: Date | string): Date; // 'YYYY-MM-DD' → local midnight; ISO timestamp → Date
```
`src/domain/time-entries.ts`: `entryDurationSeconds(entry: Pick<TimeEntry,'start'|'end'>, now = Date.now()): number`,
`isRunning(entry)`, `totalDurationSeconds(entries, now?)`, `interface DayGroup { dateKey; date: Date; entries: TimeEntry[];
totalSeconds }`, `groupEntriesByDay(entries, now?) : DayGroup[]` (newest day first, entries by start desc),
`MAX_MANUAL_ENTRY_SECONDS = 86400`, `LONG_ENTRY_WARNING_SECONDS = 43200`, `isUnusuallyLong(entry, now?)`.
`src/domain/billing.ts`: `interface BillingContext { settings: Settings; projectsById: ReadonlyMap<string, Project>;
clientsById: ReadonlyMap<string, Client> }`, `createBillingContext(settings, projects, clients)`,
`resolveHourlyRateCents(project|null|undefined, client|null|undefined, settings): number`,
`roundBilledSeconds(seconds, incrementMinutes, mode): number`, `amountForSeconds(seconds, rateCents): number`,
`clientForProject(project|null|undefined, ctx): Client|null`, `canBeBilled(entry, ctx): boolean`,
`entryRateCents(entry, ctx): number|null`, `entryBilledSeconds(entry, ctx, now?): number`,
`entryAmountCents(entry, ctx, now?): number`, `isInvoiceable(entry, ctx): boolean` (canBeBilled && end!==null &&
invoiceId===null), `interface BillableSummary { trackedSeconds; billableSeconds; billedSeconds; amountCents }`,
`summarizeBillable(entries, ctx, now?): BillableSummary`.
`src/domain/invoices.ts`: `interface InvoiceLineDraft { projectId: string|null; description: string; billedSeconds;
trackedSeconds; rateCents; amountCents; entryIds: string[] }`, `buildInvoiceLines(entries, ctx): InvoiceLineDraft[]`
(only invoiceable entries, grouped by project, description = project name, sorted by description; amount computed on the
summed billed seconds of the line), `interface InvoiceTotals { subtotalCents; taxCents; totalCents }`,
`computeInvoiceTotals(lines: ReadonlyArray<{amountCents:number}>, taxRateBps): InvoiceTotals` (tax = round(subtotal×bps/10000)),
`invoiceTotals(invoice: Pick<Invoice,'lines'|'taxRateBps'>): InvoiceTotals`, `formatInvoiceNumber(prefix, year, seq)`,
`nextInvoiceNumber(existing: ReadonlyArray<Pick<Invoice,'number'>>, prefix, year): string`,
`type InvoiceDisplayStatus = 'draft'|'sent'|'overdue'|'paid'`, `getInvoiceDisplayStatus(invoice: Pick<Invoice,'status'|'dueDate'>,
todayKey: string)`, `INVOICE_TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]>`, `canTransition(from, to)`,
`addDaysToKey(dateKey, days): string`.
`src/domain/budget.ts`: `type BudgetLevel = 'ok'|'warning'|'over'`, `BUDGET_WARNING_RATIO = 0.8`,
`interface BudgetUsage { budgetSeconds; usedSeconds; remainingSeconds (may be negative); ratio; level }`,
`getBudgetUsage(budgetHours: number|null, usedSeconds: number): BudgetUsage|null` (level 'over' when ratio > 1).
`src/domain/reports.ts`: `type Granularity = 'day'|'week'|'month'`, `interface TimeBucket { key: string; start: Date; end: Date }`,
`chooseGranularity(range: DateRange): Granularity` (≤ 35 days → day, ≤ 183 days → week, else month),
`buildBuckets(range, granularity, weekStartsOn): TimeBucket[]`, `interface BucketTotals { bucket: TimeBucket;
values: Record<string, number>; total: number }`, `bucketizeEntries(entries, buckets, seriesOf: (e: TimeEntry) => string,
now?): BucketTotals[]` (entry assigned to the bucket containing its start), `interface BreakdownRow { id: string|null;
trackedSeconds; billableSeconds; amountCents; entryCount }`, `breakdownByProject(entries, ctx, now?): BreakdownRow[]`,
`breakdownByClient(entries, ctx, now?): BreakdownRow[]` (sorted by trackedSeconds desc; id null = no project / no client).
`src/domain/integrity.ts`: `findIntegrityIssues(db: DatabaseState): string[]` (dangling references, >1 running entry,
end ≤ start, invoice lines referencing missing entries or entries pointing at a different invoice, duplicate ids).

### Data layer — owner: DATA agent
`src/domain/defaults.ts`: `createDefaultSettings(browserLocale?: string): Settings` (locale en-US if browserLocale starts
with 'en-US' else en-GB; currency EUR; rate 7500; weekStartsOn 1 (0 for en-US); target 35h; rounding 0 / 'up';
prefix 'INV-'; terms 30; tax 0; empty business details).
`src/data/demo-seed.ts`: `createDemoDatabase(now: Date): DatabaseState` (deterministic PRNG; ~10 weeks of realistic,
non-overlapping weekday entries ending before `now` incl. today's morning; 4 clients, ~7 projects incl. 2 internal
(no client, non-billable) and 1 archived; 4-5 invoices: 2 paid, 1 sent-overdue, 1 sent-not-due, recent ~3 weeks unbilled;
fictional names; persona "Alex Moreau", business "Moreau Studio"). `createEmptyDatabase(browserLocale?)`.
`src/services/storage/local-store.ts`: `class LocalStore` (key 'stint:db'; in-memory cache; `read()`, `transact(fn)` =
clone → mutate → validate → persist atomically; `replace(state)`; `subscribe(listener)` for changes from OTHER tabs via the
`storage` event; JSON/Schema-corrupt data → `StorageCorruptedError`; QuotaExceeded → ApiError STORAGE).
`src/services/api/errors.ts`: `type ApiErrorCode = 'VALIDATION'|'NOT_FOUND'|'CONFLICT'|'LOCKED'|'STORAGE'`,
`class ApiError extends Error { code; fieldErrors?: Record<string, string[]> }`, `isApiError(e)`, `errorMessage(e: unknown): string`.
`src/services/api/local-api.ts`: `createLocalApi(store: LocalStore, options?: { latencyMs?: number; now?: () => Date }): StintApi`
(validate every input with the Zod input schemas → ApiError VALIDATION with fieldErrors; return deep clones).
`src/services/api/index.ts`: `export const api: StintApi` (singleton using window.localStorage, env flags) + re-exports.
`src/services/queries/*` — TanStack Query hooks (every mutation invalidates `queryKeys.root` on success):
`keys.ts` `queryKeys = { root: ['stint'], settings(), clients(), projects(), entries(query?), running(), invoices(), invoice(id) }`;
`settings.ts` useSettings(), useUpdateSettings();
`clients.ts` useClients(), useClient(id), useCreateClient(), useUpdateClient() vars {id,input}, useSetClientArchived() vars
{id,archived}, useDeleteClient() vars id;
`projects.ts` useProjects(), useProject(id), useCreateProject(), useUpdateProject() {id,input}, useSetProjectArchived()
{id,archived}, useDeleteProject() id;
`entries.ts` useEntries(query?: EntryQuery, options?: { keepPrevious?: boolean; enabled?: boolean }), useCreateEntry(),
useUpdateEntry() {id,input}, useDeleteEntry() id → TimeEntry, useRestoreEntry() entry, useDuplicateEntry() id;
`timer.ts` useRunningEntry(), useStartTimer() TimerStartInput → TimerStartResult, useStopTimer(), useUpdateRunningEntry()
RunningEntryPatch, useDiscardTimer();
`invoices.ts` useInvoices(), useInvoice(id), useCreateInvoice(), useUpdateInvoiceDetails() {id,input},
useSetInvoiceStatus() {id,status}, useDeleteInvoice() id, useInvoiceNumberPreview(issueDate);
`data.ts` useExportBackup(), useImportBackup(), useResetToDemo(), useClearAllData();
`lookups.ts` `interface Lookups { settings; clients; projects; projectsById; clientsById; billing: BillingContext }`,
`useLookups(): { data: Lookups | undefined; isPending: boolean; error: Error | null }`;
`sync.ts` `useCrossTabSync(): void` (invalidate all queries when another tab changes data);
`index.ts` re-exports everything.

### UI kit — owner: UI agent (`src/components/ui/*`, one component per kebab-case file)
- `button.tsx`: `Button` props: ButtonHTMLAttributes + `variant?: 'primary'|'secondary'|'ghost'|'danger'` (primary = bg-ink
  text-ink-inverse; secondary = surface + line-strong border; ghost = transparent hover:bg-sunken; danger = text-danger
  border + hover:bg-danger-soft), `size?: 'sm'|'md'|'lg'|'icon'|'icon-sm'`, `asChild?` (Radix Slot, for <Link>),
  `loading?` (spinner + aria-busy, disabled). Export `buttonVariants({variant,size,className})`. Default type="button".
- `icon-button.tsx`: `IconButton` props: Omit<ButtonProps,'children'|'size'> & `{ label: string; icon: LucideIcon;
  size?: 'icon'|'icon-sm'; showTooltip?: boolean (default true) }` → aria-label=label + Tooltip.
- `input.tsx` `Input` (+ `invalid?`, `leading?: ReactNode`, `trailing?: ReactNode` adornments), `textarea.tsx` `Textarea`,
  `select.tsx` `Select` (native, styled, chevron icon, `invalid?`), `checkbox.tsx` `Checkbox` (native input, styled,
  props + `label?: ReactNode` rendering a <label> wrapper; `description?`).
- `field.tsx`: `Field({ label, hint?, error?, required?, className?, labelHidden?, children: (control: { id: string;
  'aria-describedby'?: string; 'aria-invalid'?: true }) => ReactNode })` using useId; renders label, control, hint, error
  (error text in `text-danger` with icon). `FieldGroup` for fieldset+legend.
- `dialog.tsx`: `Dialog` (=Radix Root), `DialogTrigger`, `DialogClose`, `DialogContent({ title, description?, children,
  footer?, size?: 'sm'|'md'|'lg', hideClose? })` (portal, overlay, centered, max-h dvh with inner scroll; full-width with
  16px margin on mobile), `DialogFooter`.
- `confirm.tsx`: `ConfirmProvider`, `useConfirm(): (o: { title: string; description?: ReactNode; confirmLabel?: string;
  cancelLabel?: string; tone?: 'default'|'danger' }) => Promise<boolean>` (Radix AlertDialog).
- `dropdown-menu.tsx`: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent` (align end default),
  `DropdownMenuItem({ icon?: LucideIcon; tone?: 'default'|'danger'; ... })`, `DropdownMenuSeparator`, `DropdownMenuLabel`.
- `tooltip.tsx`: `TooltipProvider`, `Tooltip({ content: ReactNode; children: ReactElement; side? })`.
- `badge.tsx`: `Badge({ tone?: 'neutral'|'success'|'warning'|'danger'|'signal'|'outline'; icon?: LucideIcon; children })`.
- `card.tsx`: `Card` (section/div with surface styles, `as?`), `CardHeader({ title, description?, action?, headingLevel? })`,
  `CardBody`.
- `empty-state.tsx`: `EmptyState({ icon: LucideIcon; title; description?; action?: ReactNode; compact? })`.
- `skeleton.tsx` `Skeleton`; `spinner.tsx` `Spinner({ label?, className? })`.
- `segmented-control.tsx`: `SegmentedControl<T extends string>({ legend: string (sr-only); value: T; onChange(v: T);
  options: { value: T; label: string; count?: number }[]; size?: 'sm'|'md' })` — native radio inputs (keyboard arrows).
- `pagination.tsx`: `Pagination({ page (1-based); pageCount; onPageChange; label? })`.
- `toast.tsx`: `toast(o: { title: string; description?: string; tone?: 'neutral'|'success'|'danger'; action?: { label: string;
  altText?: string; onClick: () => void }; durationMs? }): void`, `Toaster` (Radix Toast; bottom-right ≥ sm, bottom full
  width on mobile with bottom offset `var(--toast-offset, 16px)`; F8 hotkey). Store via useSyncExternalStore.
- `color-dot.tsx`: `ColorDot({ color: ProjectColor | 'other'; size?: 'sm'|'md'; className? })` aria-hidden swatch.
- `kbd.tsx` `Kbd`; `visually-hidden` → use Tailwind `sr-only`.
- `error-state.tsx`: `ErrorState({ title?, error: unknown, onRetry? })`.

### Charts — owner: CHARTS agent (`src/components/charts/*`)
- `types.ts`: `interface ChartSeries { id: string; label: string; color: string }` (CSS colour, e.g. dataColorVar(..)),
  `interface ColumnDatum { id: string; label: string; fullLabel: string; values: Record<string, number> }`.
- `column-chart.tsx`: `ColumnChart({ data, series, formatValue(v): string, formatAxisValue?(v), height? (plot px, default 200),
  ariaLabel: string, highlightId?: string, valueUnit?: 'seconds' })` — responsive SVG (ResizeObserver), stacked when
  series > 1, nice ticks (for seconds: hour-based ticks 0/2h/4h…), x-label thinning, tooltip on hover+focus, roving tabindex.
- `chart-table.tsx`: `ChartTable({ caption, categoryHeader, data, series, formatValue })` (+ Total column).
- `chart-legend.tsx`: `ChartLegend({ series, totals?: Record<string, string> })`.
- `column-chart-card.tsx`: `ColumnChartCard({ title, description?, categoryHeader, data, series, formatValue,
  formatAxisValue?, height?, highlightId?, isRefreshing?, actions?, emptyMessage? })` — Card with heading, legend (≥2 series),
  "Chart / Table" toggle (aria-pressed buttons), chart or table, empty state when all zero.
- `meter.tsx`: `Meter({ value, max, label, valueText, level?: BudgetLevel, showStatus?, size?: 'sm'|'md' })` — role="meter".
- `stat-tile.tsx`: `StatTile({ label, value, delta?: { label: string; direction: 'up'|'down'|'flat'; sentiment: 'positive'|
  'negative'|'neutral' }, footnote?: ReactNode, action?: ReactNode, icon?: LucideIcon })`.
- `hero-figure.tsx`: `HeroFigure({ label, value, caption?: ReactNode, children?: ReactNode })`.
- `share-bar.tsx`: `ShareBar({ ratio, className? })` single-hue (`data-blue`) horizontal bar, aria-hidden (value shown as text).

### App shell — owner: SHELL agent
`src/main.tsx` (imports fonts: '@fontsource-variable/ibm-plex-sans/wght.css', '@fontsource/ibm-plex-mono/400.css',
'@fontsource/ibm-plex-mono/500.css', '@fontsource/instrument-serif/400.css', '@fontsource/instrument-serif/400-italic.css',
then '@/styles/index.css'), `src/app/app.tsx` `App`, `src/app/providers.tsx` `AppProviders` (QueryClientProvider,
ThemeProvider, TooltipProvider, ConfirmProvider, Toaster, useCrossTabSync), `src/app/query-client.ts`
`createQueryClient()` (retry false, staleTime 30s), `src/app/theme.tsx` (`THEME_STORAGE_KEY = 'stint:theme'`,
`ThemeProvider`, `useTheme(): { preference: 'system'|'light'|'dark'; resolved: 'light'|'dark'; setPreference(p) }`,
sets/removes `data-theme` on <html>, cross-tab via storage event), `src/app/router.tsx` `router` (lazy routes below),
`src/app/route-error.tsx` `RouteErrorPage`, `src/app/not-found-page.tsx` `NotFoundPage`.
`src/components/layout/*`: `app-shell.tsx` `AppShell` (skip link → #main, desktop sidebar, mobile top bar + drawer,
`<main id="main" tabIndex={-1}>` + `<Outlet/>`, scroll restoration, mobile bottom "now tracking" bar when a timer runs,
document title shows the live timer), `sidebar.tsx`, `mobile-nav.tsx`, `nav-items.ts`, `running-timer-widget.tsx`
(live clock + description/project + Stop; when idle a "Start timer" button that starts an empty timer at once),
`theme-toggle.tsx`, `page.tsx` `Page({ children, className? })` (container), `page-header.tsx`
`PageHeader({ title, description?, actions?, breadcrumbs?: { label: string; to: string }[], meta?: ReactNode })`
(h1 `font-display text-display`), `wordmark.tsx` `Wordmark`.
`src/hooks/*`: `use-now.ts` `useNow(intervalMs = 1000): number` (shared ticker, useSyncExternalStore),
`use-document-title.ts` `useDocumentTitle(title: string)` ("Title · Stint"), `use-media-query.ts` `useMediaQuery(q)`,
`use-formatters.ts` `useFormatters(): Formatters` (from useSettings; fallback createDefaultSettings while loading).
`src/test/render.tsx` `renderWithProviders(ui, { route?: string, path?: string })` (fresh QueryClient, MemoryRouter via
createMemoryRouter, TooltipProvider, ConfirmProvider, Toaster) — used by component tests.

### Routes (lazy; each page module exports the named component)
| path | module | export |
|---|---|---|
| `/` | `@/features/overview/overview-page` | `OverviewPage` |
| `/time` | `@/features/time/time-page` | `TimePage` |
| `/projects` | `@/features/projects/projects-page` | `ProjectsPage` |
| `/projects/:projectId` | `@/features/projects/project-detail-page` | `ProjectDetailPage` |
| `/clients` | `@/features/clients/clients-page` | `ClientsPage` |
| `/clients/:clientId` | `@/features/clients/client-detail-page` | `ClientDetailPage` |
| `/invoices` | `@/features/invoices/invoices-page` | `InvoicesPage` |
| `/invoices/new` | `@/features/invoices/invoice-builder-page` | `InvoiceBuilderPage` |
| `/invoices/:invoiceId` | `@/features/invoices/invoice-detail-page` | `InvoiceDetailPage` |
| `/reports` | `@/features/reports/reports-page` | `ReportsPage` |
| `/settings` | `@/features/settings/settings-page` | `SettingsPage` |
| `*` | `@/app/not-found-page` | `NotFoundPage` |
Nav order: Overview, Time, Projects, Clients, Invoices, Reports; then Settings. Filters/state that matter live in the URL
(`useSearchParams`), e.g. `/time?week=2026-10-05`, `/reports?range=last-month&project=…`, `/invoices?status=overdue`.

## Code quality rules
Small focused components; feature code stays inside its feature folder; reuse the UI kit (don't restyle raw elements ad
hoc); no `any`, no `@ts-ignore`, no eslint-disable without a one-line justification; no dead code / unused exports;
no `dangerouslySetInnerHTML`; no console.log; comments explain WHY, sparingly. Handle loading (skeletons on first load),
empty and error states (`ErrorState` with retry) for every query-driven view. Mutations: disable/`loading` the submitting
button, toast on success/failure (use `errorMessage(e)`), map ApiError.fieldErrors onto form fields via `setError`.

## Testing conventions
Colocate unit/component tests as `*.test.ts(x)` next to the source. `import { describe, it, expect, vi } from 'vitest'`
(no globals). Query by role/label (Testing Library). `userEvent.setup()`. Deterministic time via explicit `now` args or
`vi.useFakeTimers({ shouldAdvanceTime: true })`/`vi.setSystemTime` where needed.

## Verification commands (run from project root)
- Type-check the app: `npx tsc -p tsconfig.app.json` (≈2s; do NOT use `tsc -b` while other agents run). Other agents may be
  mid-flight: fix ONLY errors in files you own; if an error is caused by a contract mismatch with another owner's file,
  adapt your side to the contract in this spec. Imports of not-yet-existing modules from other owners are expected
  while they work — code against the contract anyway.
- Lint your files: `npx eslint <paths>`.  Tests: `npx vitest run <paths>`.
Never run `npm install`, never touch files you don't own (except creating new files inside your own folders), never run git
commands, never start long-running servers in the foreground without a timeout.
