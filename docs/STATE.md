# Project State

Last updated: 2026-04-22

## Current Phase

**`export-json` is closed (2026-04-22) at approved head `e1a1ab3`;
v1 is feature-complete per PRD §7 / §8. Next action is dogfood
prep for the 2026-05-03 Day-1 start.** Fresh-context review
returned `approve` with zero blockers and zero nits; one v1.1
follow-up was captured (the `/settings` no-project sidebar state
— see Known Open Questions). `PRD.md` §10 now treats the
Settings-page JSON export as the minimum v1 backup path. The new
`web/lib/export/` layer builds a deterministic flat envelope over
the eight user-authored tables plus `_prisma_migrations`, `/api/export`
returns that envelope as pretty-printed JSON, and `/settings`
ships the browser-download button plus the restrained noun+number
summary line. The implementation landed across `33d2b65` (M1 PRD
edit), `24b4110` (M2 data + serializer), `fa1bb38` (M3 route +
Settings button), `de87403` (M4 tests), and `e1a1ab3` (M5 doc
sync).

Verification at the approved head is green: `npm run build`,
`npm run typecheck`, `npm run lint`, and `npm test` all passed,
with the suite now at **155/155** tests. Manual smoke against
`next start` and the real `web/prisma/dev.db` confirmed the empty-DB
export path, byte-deterministic repeat export, `/today`-authored
`daily_log` inclusion, and full-DB export across two projects.
Reviewer-side verifiers (`npm run build` / `typecheck` / `lint` /
`test` / `npm test -- lib/export`) re-ran green independently.

## What Is True Now

### Repository contents

- `PRD.md` v1.0 remains the product source of truth
- `AGENTS.md` + `web/AGENTS.md` remain the operating contract and command map
- `docs/decisions/0001-design-handoff-reference.md` still locks the visual system
- `docs/plans/archive/` holds the closed `scaffold-and-schema`,
  `seed-cli`, `today-page-skeleton`, `knowledge-capture-inline`,
  `daily-log-flow`, `weekly-review-flow`, `retro-flow`, and
  `export-json` plans
- `docs/decisions/0002-schema-slice-runtime-probe.md` adds two
  verifier steps (`prisma migrate status` + runtime probe against
  real DATABASE_URL) required for any schema-changing slice before
  review handoff
- `web/lib/knowledge/` now holds the knowledge slice server/data layer:
  `queries.ts`, `slug.ts`, `artifact-kind.ts`, and `actions.ts`
- `web/components/knowledge/` now holds the knowledge slice UI
  primitives: `TypeTag`, `TypePillbar`, `KnowledgeList`, `SearchBox`,
  and `InlineCompose`
- `web/app/knowledge/page.tsx` plus
  `web/app/knowledge/_NewButtonRow.tsx` replace the `/knowledge`
  placeholder with the inline capture surface
- `web/lib/daily-log/` now holds the reshaped daily-log slice
  server/data layer: `queries.ts`, `actions.ts`, and
  `presentation.ts` (including `getTodayPlannedTasks` and `daysOpen`)
- `web/components/daily-log/` now holds the wizard-led daily-log UI:
  `EndOfDayEntry`, `EndOfDayWizard`, `wizard/Step1Checklist`,
  `wizard/Step2SkippedList`, `wizard/Step3TimeInput`,
  `wizard/Step4TomorrowNote`, the read-only
  `YesterdayPromiseBlock`, the overdue-badge `OpenItemsBlock`, and the
  existing open-item/blocker inline action children;
  `web/lib/daily-log/wizard-state.ts` holds the pure step1/step2
  derivation helpers reviewed in the fresh-context pass
- the superseded `DailyLogCompose`, `DailyLogSummary`,
  `CarryForwardButton`, and `ChipEditor` files have been deleted
- `web/app/today/page.tsx` now wires the wizard into the `.page-head`,
  keeps the `今日 · {ISO}` plan block read-only, renders the read-only
  `昨日之承诺` block in the left column, and keeps `最近动静`,
  `未清账`, and `阻塞` project-scoped
- `web/lib/weekly-log/` now holds the weekly slice data/presentation
  layer: `presentation.ts`, `queries.ts`, `actions.ts`, and `copy.ts`
- `web/lib/retro/` now holds the retro slice data/presentation layer:
  `copy.ts`, `presentation.ts`, `metrics.ts`, `queries.ts`, and
  `actions.ts`
- `web/lib/ui/resize-textarea.ts` now holds the shared textarea auto-grow
  helper reused by both weekly and retro flows
- `web/components/weekly/` now holds the weekly slice UI primitives:
  `WeeklyReviewEntry`, `WeeklyReviewModal`, `WeeklyScoresRow`, and the
  server-safe `WeeklyLogCard`
- `web/components/retro/` now holds the retro slice UI primitives:
  `PhaseRetroEntry`, `PhaseRetroList`, `PhaseRetroCard`,
  `PhaseRetroWizard`, and `RetroScoresRow`
- `web/app/retros/page.tsx` now ships the live dual-surface `/retros`
  page: default `phase` tab, URL-driven phase wizard, real
  eligible-segment state, and the preserved weekly tab flow
- `web/lib/schemas/retro.ts` now matches the design-authoritative
  retro payload shape (`threeQuestions.q1..q3`,
  `scopeChanges[{change,reason}]`, fixed 7 metrics, fixed 6 scores,
  required `nextPhaseFirstThing`)
- `web/lib/schemas/weekly-log.ts` now enforces trimmed required
  `reflections.q1..q6` answers with neutral Chinese validation copy
- `web/components/shell/ProjectListActive.tsx` now preserves the current
  route and query state when switching projects, which unblocks `/retros`
  project-scoped manual smoke
- `web/lib/export/` now holds the export slice data/presentation
  layer: `shape.ts`, `collect.ts`, `serialize.ts`, and
  `presentation.ts`
- `web/app/api/export/route.ts` now returns the deterministic
  pretty-printed export envelope as `application/json`
- `web/components/settings/ExportJsonButton.tsx` now owns the
  browser-download flow (`fetch` → `Blob` → `URL.createObjectURL`
  → programmatic `<a download>`) and the restrained summary line
- `web/app/settings/page.tsx` now replaces the settings placeholder
  with the export surface
- `web/components/today/RecentKnowledgeList.tsx` and
  `web/lib/today/relative-days.ts` light up `/today`'s `最近动静` block
- `web/tests/knowledge-create.test.ts` covers direct server-action calls
  and slug/artifact write behavior against a temp SQLite DB
- `web/tests/knowledge-list.test.ts` covers list filtering, ordering,
  artifact counts, and the 200-row cap against a temp SQLite DB
- `web/tests/knowledge-page.test.tsx` renders `/knowledge` through RTL
  and covers counters, type-filter links, filtered rows, and empty state
- `web/tests/daily-log-upsert.test.ts`,
  `web/tests/open-items-actions.test.ts`, and
  `web/tests/blockers-actions.test.ts` cover the surviving server
  actions against temp SQLite DBs
- `web/tests/weekly-log-upsert.test.ts` covers weekly upsert behavior
  and validation against a temp SQLite DB
- `web/tests/retro-upsert.test.ts` covers retro upsert behavior and
  validation against a temp SQLite DB
- `web/tests/retro-metrics.test.ts` covers the 7 retro metrics,
  including `drift_days` math and commit-artifact filtering, against a
  temp SQLite DB
- `web/tests/retros-page.test.tsx` now renders `/retros` through RTL
  with both weekly and phase coverage: phase-default empty state,
  eligible-segment caption, committed retro card render, and
  `?wizard=1` in-page wizard mode
- `web/tests/today-page.test.tsx` now covers the page-head `今日收工`
  button, the read-only `昨日之承诺` block, and the surviving
  `未清账` / `阻塞` states in addition to the earlier Today-shell
  assertions
- `web/tests/export-collect.test.ts`,
  `web/tests/export-serialize.test.ts`,
  `web/tests/export-presentation.test.ts`, and
  `web/tests/settings-page.test.tsx` now cover the export envelope,
  determinism contract, summary formatter, and `/settings`
  download-trigger flow

### Runtime shape

- Next.js 16.2.4 (App Router, Turbopack)
- React 19.2.4
- Tailwind v4 via `@tailwindcss/postcss`
- Prisma 7.7.0 with `@prisma/adapter-better-sqlite3`
- SQLite local-first runtime only
- Zod 4.3.6 boundary validation
- Vitest 4.1.4 with in-source helper coverage plus `jsdom` + React
  Testing Library for page integration tests

### Locked-in product constraints

Unchanged from the prior state:

- No v1 runtime LLM
- `knowledge_item` stays single-table polymorphic
- `artifact` stays pointers-only
- user-authored body text only; no ghostwriting
- Simplified Chinese UI copy, restrained tone, no streaks / cheerleading
- deterministic validation and writes at the server boundary

## Verification Snapshot

As of 2026-04-22 at `export-json` fresh-context review approval
(head `e1a1ab3`):

- `cd web && npm run build` - green; `/api/export`, `/knowledge`,
  `/retros`, and `/today` build as dynamic routes, while `/`,
  `/_not-found`, `/artifacts`, `/plan`, and `/settings` remain static
- `cd web && npm run typecheck` - green
- `cd web && npm run lint` - green
- `cd web && npm test` - green; **155/155** tests, including the new
  export in-source helpers and the four M4 export test files
- `npx prisma migrate status` against the real `DATABASE_URL` -
  "Database schema is up to date!" with all four committed
  migrations applied
- Seven-step manual smoke against `next start` + the real
  `web/prisma/dev.db`:
  1. `/settings` rendered the `设置` page head with a visible enabled
     `导出 JSON` button
  2. the button produced `study-system-<ISO>.json` downloads in the
     Playwright browser session
  3. the summary line rendered neutral noun+number copy only
  4. the downloaded file kept the locked top-level/table key order,
     2-space pretty-print, trailing newline, and 4 migration rows
     matching `npx prisma migrate status`
  5. a second export differed only in `exported_at`
  6. one `daily_log` authored via `/today` appeared as exactly one row
     in `tables.daily_log`, and the summary line showed `1 份日志`
  7. after switching to the second project on `/today` via
     `ProjectListActive`, exporting from `/settings?project=...`
     still produced two `daily_log` rows across two project IDs,
     proving full-DB export rather than project-scoped export

## Known Open Questions

- the Today fact-strip's `累计 commits` read remains parked even though
  `knowledge-capture-inline` now writes `Artifact(kind = "commit")`
- global `N` routing and Tweaks-axis resurrection remain parked until
  dogfood proves them necessary
- `/settings` still renders the no-project sidebar state even when
  projects exist, so project switching for the export smoke had to run
  on `/today` and then return to `/settings?project=...`. Decide
  post-dogfood whether this is a shell bug or belongs under Settings
  polish.
- `npm run typecheck` on a clean workspace can fail once on missing
  `.next/types/routes.js` before `next build` runs. Next.js 16
  generated-types artifact, not a product defect. Verifier order is
  `build → typecheck` (or prepend `next typegen`). Revisit if any
  slice's verification step trips on it.
- Prisma 7 renamed `migrate diff`'s `--from-schema-datasource`
  to `--from-config-datasource`. The chore surfaced this; decision
  0002's Open items note it. Any future verifier template that
  diffs schema against the real datasource must use the new flag.

## Recommended Next Step

**Dogfood prep for 2026-05-03 Day-1 start.** The last v1 slice is
approved and closed; no more must-land feature work before dogfood.
Concrete PM-side tasks between now (2026-04-22) and 2026-05-03:

1. **Author the Agentic 90-day plan yaml** (90 days × 3 phases,
   per PRD §8 acceptance list). This is user-authored content;
   Claude can review structure/shape against the seed-cli yaml
   contract but does not write the plan itself (anti-pattern #4
   — not a planner).
2. **`npm run seed -- <plan.yaml>`** against the clean
   `web/prisma/dev.db` (rebuilt 2026-04-22 per decision 0002
   fallout). This becomes the dogfood baseline DB.
3. **Day-0 dry-run smoke** against the seeded DB: `/today` /
   `/plan` / `/knowledge` / `/retros` / `/settings` all render,
   driving-seat block renders expected Day 1 content, first
   `daily_log` can be written, first `knowledge_item` can be
   captured, Settings-page export downloads a plausible first
   backup.
4. **Ship a first backup file to git** (or wherever the user
   wants durable storage) as the Day-0 reference. This is the
   immediate payoff of shipping `export-json` — proof the backup
   path works before dogfood actually starts generating data.

Standing v1.1 backlog (post-dogfood) remains as listed under
Deferred / Upcoming below.

## Blockers

None.

## Deferred / Upcoming

- v1.1 backlog (post-dogfood):
  - CLI form of the JSON export
  - Settings page UX polish: DB path / size readouts, project-context
    parity on `/settings`, and the parked 「导入 YAML」 /「打开目录」 buttons
  - Auto-scheduled backup (picks up the "last backup / next
    auto-backup" copy from the design mockup)
  - Import / restore slice (reverse direction of `export-json`)
- v2-only AI roles (Coach / Historian / Scout / Principle mirror)
- multi-user, cloud sync, mobile, and collaboration remain out of scope
