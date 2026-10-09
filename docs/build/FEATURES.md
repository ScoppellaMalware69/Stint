# Stint — feature phase spec (read SPEC.md first; this extends it)

The foundation exists and compiles: domain logic, data layer + query hooks (`@/services/queries`), UI kit
(`@/components/ui/*`), charts (`@/components/charts/*`), app shell/layout (`@/components/layout/*`), hooks (`@/hooks/*`),
`renderWithProviders` (`@/test/render`). READ the actual source of whatever you use (exports may differ slightly from the
spec — the code is the truth now). Every route currently renders a placeholder page; you REPLACE the placeholder module(s)
you own with the real page (keep the same file path and named export).

Shared domain-aware components (already exist, use them):
- `@/components/project-label` → `ProjectLabel({ project, client?, showClient?, noneLabel?, className? })` (swatch + name + client).
- `@/components/project-select` → `ProjectSelect({ projects, clients, value: string|null, onChange(id|null), noneLabel?,
  includeArchived?, invalid?, ...selectProps })` native select grouped by client + "Internal".

Cross-feature contracts (the OWNER must export exactly this; other features may import it — code against it even if the
owner is still writing it):
- TIME owns `@/features/time/timer-bar` → `TimerBar({ className? })` (full timer control; used on /time and the overview).
- TIME owns `@/features/time/entry-form-dialog` → `EntryFormDialog({ open: boolean; onOpenChange(open: boolean): void;
  entry?: TimeEntry; defaults?: { dateKey?: string; projectId?: string | null } })` (create when no entry, edit otherwise).
- PROJECTS owns `@/features/projects/project-form-dialog` → `ProjectFormDialog({ open; onOpenChange; project?: Project;
  defaultClientId?: string | null; onSaved?: (project: Project) => void })`.
- CLIENTS owns `@/features/clients/client-form-dialog` → `ClientFormDialog({ open; onOpenChange; client?: Client;
  onSaved?: (client: Client) => void })`.
- INVOICES owns `@/features/invoices/invoice-status-badge` → `InvoiceStatusBadge({ status: InvoiceDisplayStatus })`
  (draft: neutral + FilePen icon "Draft"; sent: outline + Send "Sent"; overdue: danger + AlertTriangle "Overdue";
  paid: success + CheckCircle2 "Paid").

Common page rules: `<Page>` + `<PageHeader title description actions>` + `useDocumentTitle`; skeletons on first load;
`ErrorState` with retry; `EmptyState` with the next action; toasts after mutations (`errorMessage(e)` on failure); confirm
destructive actions with `useConfirm` (tone danger); URL search params for filters; responsive down to 360px (tables →
stacked rows below md); no horizontal page overflow; all text in English sentence case; currency/dates via `useFormatters`.
Use `useLookups()` for settings/projects/clients/billing context. Use `useNow()` only where live time is shown.

## OVERVIEW — `src/features/overview/**` (OverviewPage at `/`)
Header: title "Overview" (or "Good morning, Alex" style greeting using settings.ownerName first name + time of day;
title must still be the page h1), description with today's date. Actions: "Add time" (EntryFormDialog) and "New invoice"
(link to /invoices/new).
1. `TimerBar` at the top.
2. Hero (exactly one per view): "This week" tracked time (HeroFigure: e.g. "27h 40m") with a Meter towards
   settings.weeklyTargetHours (label/valueText "27h 40m of 35h weekly target (79%)"), caption with remaining hours and days left.
3. KPI row (StatTile ×3–4, responsive grid 1→2→4 cols): "Billable this month" (amount, delta vs same period last month by
   day-of-month, sentiment up = positive), "Unbilled time" (amount + "across N clients", action link "Create invoice" →
   /invoices/new), "Outstanding" (sent+overdue totals; footnote "N overdue" with warning icon if any; link /invoices?status=overdue),
   "Billable ratio" this month (percent of tracked time that is billable).
4. Chart: ColumnChartCard "Last 14 days" — daily tracked time stacked Billable (data-blue) vs Non-billable (data-other),
   highlight today, categoryHeader "Day", formatValue formatDurationText.
5. Two-column section (stack on mobile): "Active projects" — up to 5 active projects with recent activity: ProjectLabel, hours
   this month, budget Meter (size sm, showStatus) when budgetHours set, link to project; "Needs attention" list: overdue
   invoices (InvoiceStatusBadge, client, amount, link), projects near/over budget, unusually long entries; empty → friendly
   "All clear" EmptyState compact.
6. "Recent entries": last 6 finished entries: description, ProjectLabel, duration, a "Continue" IconButton (starts the timer
   with same description/project/billable) — link "View timesheet" → /time.
Tests: renders hero/KPIs from seeded api data (use renderWithProviders; the real local api with jsdom localStorage seeds demo
data); "Continue" starts a timer.

## TIME — `src/features/time/**` (TimePage at `/time`; exports TimerBar, EntryFormDialog)
TimerBar (Card): description input ("What are you working on?", maxLength 200), ProjectSelect (active projects), billable
toggle button (aria-pressed, Coins/BadgeEuro-like icon + visible "Billable" text on ≥ sm; disabled with tooltip/hint when the
project has no client), live clock (font-mono tabular-nums text-2xl, signal colour dot animate-live while running) and a
Start/Stop primary button (Play/Square icons; Stop uses variant primary; Start keyboard: Enter in the description input
starts). Idle: fields are a local draft; choosing a project sets billable = project.billableByDefault (if billable allowed).
Running: fields reflect the running entry and edits are saved (description on blur/Enter, debounced 600ms while typing is fine;
project/billable immediately) via useUpdateRunningEntry; "Discard" (Trash) IconButton with confirm; elapsed from start
via useNow. Stop → toast "Saved 1:23:45 to <project>" with "Undo"? (undo = not needed; keep simple toast). Layout: one row on
lg, stacked on mobile (clock+button row at bottom). Disable controls while mutations are pending.
TimePage: header "Time" + description + actions "Add entry" (EntryFormDialog). Week navigation toolbar: Previous/Next week
IconButtons, "This week" button (disabled when current), a label "6 – 12 Oct 2026" (formatters), week total (formatDurationText)
and billable total; URL param `week=YYYY-MM-DD` (week start; invalid → current week). Below: a 7-day strip (one cell per day:
weekday, date, total; today highlighted; days with entries clickable → scroll/focus that day's section) — wraps nicely on
mobile (7 narrow cells). Optional search input filtering descriptions (URL param `q`).
Day sections (newest first, only days with entries; empty week → EmptyState "No time tracked this week" with Start timer /
Add entry actions): h2 day heading (formatters.dayHeading) + day total. Entry rows (ul/li): description (or italic-free muted
"No description"), ProjectLabel (with client), time range "09:00 – 10:30" (running shows "09:00 – now" with signal dot),
duration H:MM (tabular), billable indicator (Coins icon + sr-only "Billable"/"Non-billable" with tooltip), lock icon + tooltip
"Invoiced on INV-…" for invoiced entries (no edit/delete), "unusually long" warning icon with tooltip, and a row actions
DropdownMenu ("Entry actions"): Continue (start timer with same details), Edit (EntryFormDialog), Duplicate, Delete (no confirm
but toast with Undo → useRestoreEntry). Clicking the row text opens edit (button semantics — the row content is a button,
the menu is a sibling, never nested interactive). Mobile: two-line layout (description + duration on line 1; project + time
range on line 2), actions menu stays reachable (≥ 40px target).
EntryFormDialog (react-hook-form + zodResolver of a FORM schema): fields Description (textarea 2 rows or input), Project
(ProjectSelect, includeArchived when editing an entry with an archived project), Date (input type=date), Start & End (type=time)
and Duration (text, parseDurationInput; typing a duration sets End = Start + duration; changing Start/End recomputes Duration;
End earlier than Start means next day — show hint "Ends next day"), Billable (Checkbox; disabled + hint when the project has no
client; defaults from project.billableByDefault when the project changes, until the user touches it). Validation messages:
"Enter a valid duration like 1:30, 1h 30m or 90m", "Duration must be at least 1 minute", "Entries can't be longer than 24
hours", "This entry would end in the future". Submit → useCreateEntry/useUpdateEntry, map ApiError fieldErrors, toast, close.
Defaults for create: date today (or defaults.dateKey), start = now rounded down to 15 min − 1h (or end of the last entry
today if that is later), end = start + 1h capped at now. Footer: Cancel / Save (loading). Edit mode shows "Delete entry"
danger ghost button bottom-left (confirm).
Tests: TimerBar start → shows running clock → stop; EntryFormDialog validation errors (bad duration, future end) and a
successful create that appears on the page; week navigation updates the URL; delete + Undo restores.

## PROJECTS — `src/features/projects/**` (ProjectsPage, ProjectDetailPage; exports ProjectFormDialog)
ProjectsPage: header "Projects" + "New project" button. Toolbar (wraps): search input (name/client, URL `q`),
SegmentedControl status Active/Archived/All (URL `status`, default active, with counts), client filter Select (URL `client`,
"All clients" / each client / "Internal"), sort Select (Name, Recently active, Most tracked — URL `sort`). List: ≥ md a table
(Project [ProjectLabel + notes snippet], Client, Tracked this month, Total tracked, Budget [Meter sm + "42h / 60h"], Rate
[effective rate via resolveHourlyRateCents + "inherited" hint when not set on project], actions menu); < md stacked cards with
the same info. Row/card name links to /projects/:id. Actions menu: Start timer (useStartTimer with project, billable =
billableByDefault && has client), Edit (dialog), Archive/Unarchive, Delete (confirm; on CONFLICT toast "This project has time
entries — archive it instead" with an Archive action). Empty states for no projects / no matches (with "Clear filters").
ProjectFormDialog: Name, Client (Select: "No client (internal)" + active clients; when editing keep the current client even if
archived), Colour (radio group of the 8 palette swatches with visible names via sr-only + title; keyboard arrows; selected ring),
Hourly rate (Input with currency symbol adornment, placeholder shows the inherited rate "Inherits €85.00 from client/default";
empty = inherit; parseMoneyInput), Budget hours (optional number), Billable by default (Checkbox; disabled + unchecked for
internal projects with hint), Notes (textarea). New project colour default: suggestProjectColor(existing colours). Submit via
create/update, fieldErrors mapping, toast, onSaved.
ProjectDetailPage (/projects/:projectId; 404 state if missing with link back): breadcrumbs Projects › Name; header with
ProjectLabel-like title (h1 is the project name in font-display; colour swatch beside), client link (/clients/:id), Archived
badge; actions: Start timer (primary), Edit, more menu (Archive/Unarchive, Delete). Stat tiles: Total tracked, This month,
Unbilled amount (invoiceable entries), Effective rate. Budget card with Meter (md, showStatus) + used/remaining text (when
budget set; else a hint + "Set a budget" button opening Edit). ColumnChartCard "Weekly hours" — last 12 weeks, single series in
the project's colour (dataColorVar), categoryHeader "Week", highlight current week. "Recent entries" list (last 10; description,
date, duration, billable/invoiced indicators; "Add time" opens EntryFormDialog with defaults.projectId) + link
"View all in reports" → /reports?project=<id>&range=this-year.
Tests: create project via dialog (validation: empty name, bad rate) appears in list; filters via URL; delete conflict shows
archive suggestion; detail page renders stats for a seeded project.

## CLIENTS — `src/features/clients/**` (ClientsPage, ClientDetailPage; exports ClientFormDialog)
ClientsPage: header "Clients" + "New client". Toolbar: search (URL `q`), SegmentedControl Active/Archived/All. Grid of
client cards (1 col mobile, 2 md, 3 xl) or table: name (link to detail), email (mailto link text), active projects count,
unbilled amount (+ "Create invoice" link → /invoices/new?client=<id> when > 0), outstanding invoices amount (overdue flagged
with icon+text), actions menu (Edit, New invoice, Archive/Unarchive, Delete with confirm; CONFLICT → toast explaining).
ClientFormDialog: Name, Email, Address (textarea, 3 rows), Default hourly rate (money input with currency adornment;
placeholder inherits settings default), submit/fieldErrors/toast/onSaved.
ClientDetailPage (/clients/:clientId; not-found state): breadcrumbs; h1 name; contact block (email, address preserving line
breaks via whitespace-pre-line); Archived badge; actions: New invoice (primary when unbilled > 0), Edit, menu (New project →
ProjectFormDialog with defaultClientId, Archive, Delete). Stat tiles: Unbilled, Outstanding, Paid this year, Tracked this month.
Sections: Projects (list with ProjectLabel, hours, budget meter, links), Invoices (number, dates, InvoiceStatusBadge, total,
links; empty state), each with empty states.
Tests: create client with invalid email shows error; detail page shows projects and unbilled; archive toggles badge.

## INVOICES — `src/features/invoices/**` (InvoicesPage, InvoiceBuilderPage, InvoiceDetailPage; exports InvoiceStatusBadge)
InvoicesPage: header "Invoices" + "New invoice" (primary). KPI row (StatTile): Outstanding (sent+overdue total, count),
Overdue (total, count; warning icon footnote), Paid in the last 30 days. Filter row: SegmentedControl All/Draft/Sent/Overdue/
Paid with counts (URL `status`), search (number or client, URL `q`), client Select (URL `client`). List: ≥ md table (Number
[font-mono, link], Client, Issued, Due [relativeDays for sent/overdue, e.g. "due in 5 days" / "12 days overdue"], Status badge,
Total right-aligned tabular); < md cards. Empty states (no invoices yet → CTA; no matches → clear filters).
InvoiceBuilderPage (/invoices/new?client=): breadcrumbs Invoices › New invoice; two-column on lg (form left, sticky summary
right), single column on mobile with the summary after the form. Step sections:
 1. "Client" — Select of active clients; each option shows unbilled amount e.g. "Kestrel Outdoor Co. — €1,240.00 unbilled";
    URL param prefill; when the client has nothing unbilled show an EmptyState with link to /time.
 2. "Period" — SegmentedControl All unbilled / This month / Last month / Custom (custom shows From/To date inputs); filters
    which invoiceable entries are offered.
 3. "Time to bill" — invoiceable entries of that client (useEntries with clientId, invoiced:false, billable:true; then
    isInvoiceable) grouped by project: per project a checkbox (checked/indeterminate) with ProjectLabel, entry count, billed
    hours (formatters.hours of billed seconds), rate, amount; an expand button revealing per-entry checkboxes (date,
    description, tracked duration → billed duration if rounding changed it). Default: all selected. Show the rounding rule in
    a hint ("Each entry is rounded up to 15 minutes — change in Settings").
 4. "Details" — Invoice number preview (useInvoiceNumberPreview(issueDate), read-only, font-mono), Issue date (date input,
    default today), Payment terms Select (Due on receipt, 7, 14, 30, 45, 60 days; default settings.paymentTermsDays) → Due date
    (computed, editable date input; validation due ≥ issue), Tax rate % (default settings.defaultTaxRateBps; parsePercentInput),
    Notes (textarea, e.g. payment instructions).
 Summary card (sticky top-24 on lg): Billed hours, Subtotal, Tax (rate), Total (large), line count; primary "Create draft
 invoice" (disabled with visible reason when nothing selected); on success toast + navigate to /invoices/:id.
 Use buildInvoiceLines + computeInvoiceTotals for the live preview (same functions the API uses, so numbers match).
InvoiceDetailPage (/invoices/:invoiceId; not-found state): toolbar (print:hidden): breadcrumbs, InvoiceStatusBadge, actions by
status — draft: "Mark as sent" (primary), "Edit details" (dialog: issue date, due date, tax %, notes; react-hook-form + zod;
updateDetails), "Delete draft" (confirm, then navigate to /invoices; toast "Draft deleted — its time is unbilled again");
sent/overdue: "Mark as paid" (primary), "Revert to draft"; paid: "Mark as unpaid"; always "Print / Save as PDF"
(window.print()). Status timeline below the document: Created, Sent (sentAt), Paid (paidAt) with dates.
Invoice document (the print area; a paper-like Card, max-w-3xl, generous padding, prints cleanly on A4/Letter with the app
chrome hidden via print:hidden on shell elements you can't touch — use `print:` variants inside your page and wrap the
document in an element with data-print-root; coordinate: the shell may need `print:hidden` on sidebar/topbar/bottom bar — if
missing, ADD those classes in src/components/layout files (allowed exception, minimal edit) and list it in your report):
"Invoice" title in font-display text-4xl, number (font-mono), From (snapshot business name/address/email/tax id) and Bill to
(snapshot client), dates (Issued, Due, Period), line items table (Description [project], Hours [decimal, tabular], Rate, Amount),
right-aligned totals (Subtotal, Tax n%, Total due — bold), rounding note, notes (whitespace-pre-line), footer with payment
terms. Amounts use the invoice's own currency (createFormatters(locale, invoice.currency)), not the current settings currency.
Tests: builder computes totals and creates a draft (entries become locked; detail page shows lines); status transitions;
delete draft releases entries; status badge text for each status.

## REPORTS — `src/features/reports/**` (ReportsPage at `/reports`)
Filter row (one row above everything, wraps on mobile; all in URL): Range Select of RANGE_PRESETS + "Custom" (custom reveals
From/To date inputs, URL `from`/`to`), Client Select (`client`), Project ProjectSelect with noneLabel "All projects" (`project`),
Billable Select All/Billable/Non-billable (`billable`), "Reset" ghost button when any filter is non-default. Data: useEntries
({ from, to, clientId, projectIds, billable }, { keepPrevious: true }) — hold the previous render at reduced opacity while
refetching (isPlaceholderData).
Summary tiles: Total tracked, Billable time (+ % of total), Billable amount (summarizeBillable), Average per active day.
Chart: ColumnChartCard "Time by project" — buckets via chooseGranularity/buildBuckets/bucketizeEntries; series = top 5 projects
by tracked time in range (colour = project.color via dataColorVar) + "Other" (data-other) for the rest and no-project time;
labels by granularity (day: weekday+date; week: "Week of 6 Oct"; month: "Oct 2026"); highlight current bucket.
Breakdown: SegmentedControl "By project" / "By client" (URL `group`), table: name (ProjectLabel / client name / "No project"),
tracked (H:MM), share (ShareBar + percent text), billable amount; total row. Mobile: stacked rows.
Detailed entries: "Entries" table sorted by date desc (sortable by Date / Duration via header buttons with aria-sort),
paginated 20/page (Pagination), columns: Date, Description, Project, Duration, Billable amount; mobile stacked.
"Export CSV" button (secondary, Download icon) exporting the filtered entries with columns: Date, Start, End, Duration (h),
Description, Project, Client, Billable, Rate, Amount, Invoice — via toCsv + downloadTextFile("stint-report-<from>-<to>.csv").
Empty state when no entries in range ("No time in this period" + clear filters).
Tests: changing range updates the URL and totals; CSV export builds the expected header/rows (mock downloadTextFile);
breakdown percentages sum ≈ 100%.

## SETTINGS — `src/features/settings/**` (SettingsPage at `/settings`)
Sections as Cards with h2 + description, each its own form with its own Save button (react-hook-form + zod from
settingsSchema subsets; dirty-state aware: Save disabled until changed; toast "Settings saved"):
 1. Profile & business: Your name, Business name, Email, Address (textarea), Tax / VAT ID — shown on invoices.
 2. Time & billing: Currency (Select of CURRENCIES with names via Intl.DisplayNames), Date & number format (Select en-US
    "English (US) — 10/09/2026, 1:30 PM" / en-GB "English (UK) — 09/10/2026, 13:30" with live examples), Week starts on
    (Monday/Sunday), Weekly target hours, Default hourly rate (money input), Time rounding for invoices (Select: Off, 1, 5, 6,
    10, 15, 30 minutes) + Rounding mode (Round up / Round to nearest; disabled when Off) with an explanatory example
    ("A 52-minute entry is billed as 1h 00m").
 3. Invoices: Number prefix (live preview "INV-2026-007"), Payment terms (days), Default tax rate %.
 4. Appearance: Theme radio cards System / Light / Dark (useTheme) — applies immediately.
 5. Data (danger zone styling restrained: hairline danger border on the card): "Export backup" (downloads
    stint-backup-YYYY-MM-DD.json via useExportBackup + downloadTextFile), "Import backup" (file input accept
    application/json, max 5 MB, read text, JSON.parse with friendly error, confirm "Replace all data?" showing counts, then
    useImportBackup; errors shown inline in a danger callout), "Load demo data" (confirm), "Erase all data" (confirm requiring
    typing ERASE in a text field inside a custom dialog; then toast). Explain that data lives only in this browser.
Tests: saving profile persists (re-render reads new value); invalid email blocks save; import rejects invalid JSON and a
schema-invalid file with a visible error; theme radio sets data-theme.
