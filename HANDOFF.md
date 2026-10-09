# Stint — build handoff

**Written:** 2026-10-09, mid-build. **For:** whoever continues this build, most likely a new Claude Code session.
**Project root:** `C:\Users\Adam.Bouallala\Desktop\code\stint` (Windows 11, Git Bash, Node 24.14, npm 11, Chrome 156).

> **Resume in one line:** run the checks in [Step 0](#step-0--verify-the-foundation), fix anything red, then launch the
> feature phase described in [`docs/build/FEATURES.md`](docs/build/FEATURES.md) (7 parallel builders).

---

## 1. The brief (what "done" means)

The user asked for an autonomous, production-quality build of a complete, responsive, accessible, documented web app.
The full prompt is not stored in the repo, so its requirements are summarized here:

- **Product:** **Stint**, time tracking + invoicing for freelancers and small studios. It's a local-first SPA: data lives
  in the browser behind an async API layer that a REST backend could replace. Nothing simulated may be presented as real.
- **Must work end to end:** live timer → timesheet → clients/projects → reports (charts + CSV) → invoices
  (draft → sent → paid, print) → settings with backup export/import.
- **Quality bars:**
  - Responsive at 360/390/768/1024/1440 px with no horizontal overflow.
  - WCAG 2.2 AA: keyboard support, focus handling, contrast, reduced motion.
  - Strict TypeScript, organized modules, no dead buttons, no secrets.
  - Production build passes. Unit, integration and e2e tests have been run.
  - Real browser testing, with screenshots actually looked at.
- **Required docs:**
  - `README.md` with: name/description, features, stack, prerequisites, install, run, test, build, environment
    variables, folder structure, architecture, known limitations, future improvements.
  - `docs/TECHNICAL_GUIDE.md` with: structure, what each folder and key file does, how components communicate, where
    data is stored and retrieved, state management, navigation, validation and errors, styling and responsiveness, how
    to add a page, how to add a feature, and how to connect a real backend. Use real filenames and examples.
- **Final report sections (in the reply to the user):**
  - A. Overview
  - B. Features
  - C. Stack + justification
  - D. Folder tree
  - E. Important files
  - F. Skills and tools actually used, including failed installs
  - G. Exact run/test/build commands
  - H. Test results (what ran, what passed, what was not run)
  - I. Limitations
  - J. How to extend
  - K. Learning guide (study order)
- **Honesty rules:** never claim a check passed, a skill was used, or a page was visually inspected unless that
  really happened.

## 2. Current state

| Area | State |
|---|---|
| Environment, dependency versions, configs | ✅ Done (see §4) |
| Design tokens `src/styles/index.css` | ✅ Done; palette and text contrast validated (see §4) |
| Domain models `src/domain/models.ts`, API contract `src/services/api/types.ts` | ✅ Done |
| Utilities `src/lib/*` (dates, duration, money, csv, download, id, cn, colors, format) | ✅ Done + tests |
| Domain logic (`billing`, `invoices`, `budget`, `reports`, `integrity`, `time-entries`) | ✅ Built by agent + tests |
| UI kit `src/components/ui/*` | ✅ Built by agent + tests |
| Charts `src/components/charts/*` (hand-rolled SVG, table view, meter, stat tile) | ✅ Built by agent + tests |
| Data layer (`local-store`, `local-api`, demo seed, query hooks) | 🟡 Agent was finishing at handoff time |
| App shell (router, providers, theme, layout, hooks, `src/test/render.tsx`) | 🟡 Agent was finishing at handoff time |
| Shared `src/components/project-label.tsx`, `project-select.tsx` | ✅ Written by lead |
| **Feature pages** (`src/features/*`) | ⬜ Placeholders only, replaced in the next phase |
| E2E tests (`tests/e2e/`), README, `docs/TECHNICAL_GUIDE.md` | ⬜ Not started |
| Git | Repo initialized on `main` with a repo-local identity. **Nothing committed yet.** No remote; never push. |

**Snapshot at handoff:** `npx tsc -p tsconfig.app.json` reported **0 errors**. This was taken while two builders were still
running. ESLint, the full Vitest run and `vite build` had **not** been run project-wide yet; the integration step
does that.

**In-flight work:** foundation workflow `wf_d8ad629e-f1e` (5 builders, then 1 integration agent). Its integration agent:
- runs `tsc -b`, `eslint .`, `vitest run` and `vite build`, and fixes cross-module problems;
- smoke-tests every route in Chrome at 1440 and 390 px, saving screenshots to the old session's scratchpad.

If that session ended before integration finished, **redo Step 0 manually**. Workflow resume only works within the same
session.

## 3. Next steps (in order)

### Step 0 — Verify the foundation
```bash
cd /c/Users/Adam.Bouallala/Desktop/code/stint
npx tsc -b            # type-check app + node configs
npx eslint .          # lint (type-aware rules)
npx vitest run        # unit + component tests
npx vite build        # production build (CSP meta is injected at build time)
```
Fix everything red. Prefer fixing the consumer when it deviates from the contracts in `docs/build/SPEC.md`.

Then smoke-test in a real browser:
1. Start `npx vite --port 5199 --strictPort` in the background.
2. Write a throwaway Node script using `import { chromium } from 'playwright'` with
   `chromium.launch({ channel: 'chrome' })`. Run it with the project root as the working directory so
   `node_modules` resolves; `node_modules/.cache/` is a fine place for it.
3. Visit every route and collect console errors and page errors.
4. Screenshot at 1440 and 390 px and **look at the PNGs** with the Read tool.

### Step 1 — Feature phase (7 parallel builders)
The spec is [`docs/build/FEATURES.md`](docs/build/FEATURES.md), which extends [`docs/build/SPEC.md`](docs/build/SPEC.md). Each
builder owns one folder, replaces its placeholder page(s), and writes colocated tests:

| Builder | Owns | Pages (named exports) | Exports used by other features |
|---|---|---|---|
| overview | `src/features/overview/**` | `OverviewPage` (`/`) | — |
| time | `src/features/time/**` | `TimePage` (`/time`) | `TimerBar`, `EntryFormDialog` |
| projects | `src/features/projects/**` | `ProjectsPage`, `ProjectDetailPage` | `ProjectFormDialog` |
| clients | `src/features/clients/**` | `ClientsPage`, `ClientDetailPage` | `ClientFormDialog` |
| invoices | `src/features/invoices/**` (+ minimal `print:hidden` edits in `src/components/layout`) | `InvoicesPage`, `InvoiceBuilderPage`, `InvoiceDetailPage` | `InvoiceStatusBadge` |
| reports | `src/features/reports/**` | `ReportsPage` | — |
| settings | `src/features/settings/**` | `SettingsPage` | — |

**How it was being run.** The user opted into multi-agent orchestration (they said "go faster" and enabled ultracode).
Ultracode was later switched off, so in a new session **confirm the user still wants a workflow**: they can say
"use a workflow". Otherwise use the Agent tool or build sequentially.

**Builder prompt essentials:**
1. Read `docs/build/SPEC.md`, then `docs/build/FEATURES.md`, then the actual source of the modules you use. The code is
   the truth now.
2. Only touch your own folder.
3. Don't install packages, edit configs, or run git.
4. Finish with `npx tsc -p tsconfig.app.json`, `npx eslint <your files>` and `npx vitest run <your tests>` all green.
5. Return a structured report: files, deviations, checks run, known issues.

Builders must not run `tsc -b` concurrently; `tsc -p tsconfig.app.json` is safe.

Follow the phase with **one integration agent**, which runs the checks from Step 0 plus the screenshot review across
all routes.

### Step 2 — Verification phase
Run these in parallel, with disjoint outputs:
- **e2e-core** writes Playwright specs in `tests/e2e/` and reports app bugs rather than fixing shared code. Flows to cover:
  - timer: start/stop from the shell and from `/time`; survives a reload
  - manual entry: validation errors, then a successful save
  - edit, duplicate, and delete with Undo
  - create client → project; archive; delete conflict
  - invoice: builder → draft → sent → paid; deleting a draft releases its entries; print view renders
  - reports: filters and CSV download (`page.waitForEvent('download')`)
  - settings: theme persists; backup export → import round trip; an invalid import shows an error
  - every route loads without console errors; 404 page
- **e2e-responsive-a11y:**
  - `responsive.spec.ts`: for every route at 360/390/768/1024/1440, assert
    `document.documentElement.scrollWidth <= clientWidth` and save screenshots.
  - `a11y.spec.ts`: `@axe-core/playwright` on every route in light and dark, plus with a dialog open. Fail on
    serious/critical violations.
  - `mobile.spec.ts` (runs under the `mobile` Playwright project, Pixel 7): drawer navigation, the bottom
    "now tracking" bar, dialogs fit the viewport.
- **visual/UX review:** screenshots of every page at 390 and 1440 in light and dark. Critique against the design system
  (§4) and fix spacing, hierarchy, truncation and empty states.
- **security review (report-only):**
  - no `dangerouslySetInnerHTML`
  - import validation: Zod schema + `findIntegrityIssues` + 5 MB cap
  - CSV formula-injection guard
  - production CSP
  - nothing sensitive in storage
  - `npm audit`

Then a **fix agent** applies the confirmed findings and re-runs everything, including `npm run test:e2e`.
`playwright.config.ts` builds and previews on port 4173 and uses the system Chrome, so no browser download is needed.

### Step 3 — Documentation
Write `README.md` and `docs/TECHNICAL_GUIDE.md` (required contents in §1) from the real code. Mention the env vars in
`.env.example`:
- `VITE_SEED_DEMO_DATA` (default `true`)
- `VITE_SIMULATED_LATENCY_MS` (default `0`)

Decide whether `docs/build/` and this `HANDOFF.md` stay as design history, or are deleted or moved before the final
commit.

### Step 4 — Finish
1. Run `npm run check` (typecheck + lint + test + build) and `npm run test:e2e`.
2. Commit locally. End the message with the `Co-Authored-By` trailer from the session's attribution reminder.
3. Write the final report A–K (§1), including honest test results and anything not verified.

## 4. Key decisions and why

**Dependency versions:** all pinned exactly, all ≥ 2 weeks old at selection time, `npm audit` clean.

| Choice | Reason |
|---|---|
| **TypeScript 6.0.3**, not 7.x | typescript-eslint 8.70 peer range is `<6.1`; TS 7 is the native port. |
| **Vite 8.3.3** (only 3 days old) | Contains a dev-server `fs.serve` security fix. Verified it was published by GitHub Actions trusted publishing with SLSA provenance. |
| **jsdom 29.1.1**, not 30 | jsdom 30 needs Node ≥ 24.15; this machine has 24.14. |
| **ESLint 10.11 + `eslint-plugin-jsx-a11y-x` 0.2.0** | The original jsx-a11y only supports ESLint ≤ 9. The fork (es-tooling) supports 10. |
| **Vitest 4.1.11** (mature), React Router 8.4 | React Router: `RouterProvider` comes from `react-router/dom`; docs ship in `node_modules/react-router/docs`. |
| TanStack Query 5.103.2, Zod 4.6.5, RHF 7.88, Radix (`radix-ui` 1.6.7), lucide-react 1.48, date-fns 4.4, Tailwind 4.3.3, Playwright 1.63 + axe 4.13 | Standard, well-supported choices. |

**Architecture:**
- The UI talks only to the `StintApi` interface (`src/services/api/types.ts`).
- The current implementation is `createLocalApi(LocalStore)` over localStorage key `stint:db`. It validates every write
  with Zod and performs transactions atomically.
- TanStack Query hooks live in `src/services/queries/`; every mutation invalidates the `['stint']` root key.
- Cross-tab sync uses the `storage` event.
- Money is integer cents, durations are seconds, tax is basis points.
- Charts are hand-rolled SVG, which met the data-viz specs better than a chart library and removed a dependency.

**Design system ("paper & ink ledger"):**
- Monochrome chrome: warm paper, ink-black primary actions, hairline rules.
- Color only for data, status (always with icon + label), and the vermilion live-timer signal.
- Fonts: IBM Plex Sans (UI), IBM Plex Mono (timer), Instrument Serif (page H1s only, never numbers). All self-hosted via
  @fontsource, so CSP stays `font-src 'self'`.
- Tailwind's default palette is reset (`--color-*: initial`): only token colors exist.

**Validation results:**
- The 8-hue categorical palette passed the dataviz validator against the app's own surfaces (`#FCFBF8` light,
  `#1B1A18` dark).
- In light mode, aqua, yellow and magenta are below 3:1. Every chart therefore must keep its **table view** toggle.
- All text tokens are ≥ 4.5:1 on canvas, surface and sunken backgrounds. `line-strong` (control borders) is ≥ 3:1.

**Security:**
- Production CSP meta tag is injected by `vite.config.ts`:
  - `script-src 'self'`
  - `style-src` needs `'unsafe-inline'` because of Radix's scroll-lock styles
  - `frame-ancestors` must be sent as an HTTP header by the host
- The theme pre-paint script is an external file (`public/theme-init.js`) so `script-src 'self'` holds.
- The CSV writer guards against formula injection.

## 5. Gotchas learned
- **Invisible characters:** writing a literal BOM into source happened twice. Always use the escape sequence `\uFEFF`.
- **Zod 4:** `.pick()` throws on object schemas that have refinements. Keep base schemas unrefined and do cross-field
  checks in services.
- **Type-check while agents run:** use `npx tsc -p tsconfig.app.json`. Use `tsc -b` only when nothing else is running.
- **Unknown keys:** Zod 4 `z.object` strips them, which is good for untrusted imports.
- **`cn()`:** tailwind-merge must know the custom token names (see `src/lib/cn.ts`). A builder extended it with
  `shadow` and `animate` groups.
- **Tooltips:** Intl output contains U+202F/U+00A0 spaces, so normalize them in tests.
- **E2E settings:** e2e uses locale `en-US` and timezone `Europe/Rome` (`playwright.config.ts`).
- **Demo data:** `src/data/demo-seed.ts` is generated relative to "now", so e2e assertions must be relative, not exact
  numbers.

## 6. Reference
- **Build specs:** [`docs/build/SPEC.md`](docs/build/SPEC.md) (contracts, design system, rules) and
  [`docs/build/FEATURES.md`](docs/build/FEATURES.md) (per-page requirements).
- **Scripts:** `npm run dev | build | preview | typecheck | lint | format | test | test:e2e | check`.
- **Dataviz skill references:** the session's bundled skill folder, `dataviz/references/*.md`. In a new session, load the
  `dataviz` skill before changing charts.
- **Old session artifacts** (may be gone):
  - scratchpad: `C:\Users\ADAM~1.BOU\AppData\Local\Temp\claude\c--Users-Adam-Bouallala-Desktop-code\0d189521-4e40-41d2-a80b-9d51ac13cab5\scratchpad`
  - workflow transcripts: `C:\Users\Adam.Bouallala\.claude\projects\c--Users-Adam-Bouallala-Desktop-code\0d189521-4e40-41d2-a80b-9d51ac13cab5\subagents\workflows\wf_d8ad629e-f1e\`
    (`journal.jsonl` holds each builder's report).
