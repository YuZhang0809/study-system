# Project State

Last updated: 2026-04-22

## Current Phase

**`retro-flow` implementation is complete (2026-04-22);
fresh-context review is pending.**

`/retros` now matches the locked phase-retro slice shape: the
default tab is back on `phase`, the phase surface is live rather
than a placeholder, the page-head `阶段复盘 ⌘↵` entry is driven by
eligible-segment selection, and the in-page 5-step wizard
(`指标 / 六项自评 / 三问 / 范围调整 / 留钩子`) writes one retro per
segment through a server action with URL-driven open/close
(`?wizard=1`). Committed retros render as read-only cards with the
7-metric strip, 6-score tally rows, fixed 三问 copy, scope-change
list, and `nextPhaseFirstThing`.

Schema risk was kept to the locked additive migration only:
`add-retro-next-phase-first-thing` adds one nullable
`Retro.nextPhaseFirstThing` column, while the retro JSON payloads
were narrowed at the Zod boundary to the design-authoritative
shape. Metrics remain pure Prisma aggregation (`drift_days` =
planned-dates minus logged-dates over the segment window), the
previous-phase score reference renders as muted copy rather than
prefill, and the four anti-patterns still pass: not a tutor, not a
ghostwriter, not a cheerleader, not a planner.

The dogfood deadline is still **2026-05-03**. With
`daily-log-flow`, `weekly-review-flow`, and `retro-flow`
implemented, `export-json-cli` is the final v1 slice after the
retro review closes.

## What Is True Now

### Repository contents

- `PRD.md` v1.0 remains the product source of truth
- `AGENTS.md` + `web/AGENTS.md` remain the operating contract and command map
- `docs/decisions/0001-design-handoff-reference.md` still locks the visual system
- `docs/plans/archive/` holds the closed `scaffold-and-schema`,
  `seed-cli`, `today-page-skeleton`, `knowledge-capture-inline`,
  `daily-log-flow`, and `weekly-review-flow` plans
- `docs/plans/retro-flow.md` is the current slice record; the
  implementation is landed and waiting on fresh-context review
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

As of 2026-04-22 at `retro-flow` implementation close (pre
fresh-context review):

- `cd web && npm run build` - green; `/knowledge`, `/retros`, and
  `/today` build as dynamic routes, while `/`, `/_not-found`,
  `/artifacts`, `/plan`, and `/settings` remain static
- `cd web && npm run typecheck` - green
- `cd web && npm run lint` - green
- `cd web && npm test` - green; 133/133 tests
- Manual smoke on a `next start` preview during implementation
  covered all seven retro-flow plan items: phase-default eligible
  state, submit validation bounce to step 2, current-segment create,
  committed-card render, previous-phase score reference line without
  prefill, cross-project rerendering on `/retros`, and the weekly-tab
  surface staying intact after the phase-default flip.

## Known Open Questions

- `export-json-cli` is still required before dogfood trust per PRD §10
- the Today fact-strip's `累计 commits` read remains parked even though
  `knowledge-capture-inline` now writes `Artifact(kind = "commit")`
- global `N` routing and Tweaks-axis resurrection remain parked until
  dogfood proves them necessary
- `npm run typecheck` on a clean workspace can fail once on missing
  `.next/types/routes.js` before `next build` runs. Next.js 16
  generated-types artifact, not a product defect. Verifier order is
  `build → typecheck` (or prepend `next typegen`). Revisit if any
  slice's verification step trips on it.

## Recommended Next Step

**Open the fresh-context review for `retro-flow`.** Implementation is
landed and verified; the next useful step is a diff-focused Codex
review against `main` using `docs/code_review.md`, with emphasis on
the retro schema boundary, metrics aggregation, and the phase-wizard
write path.

After the retro review closes: `export-json-cli` is the final v1
slice before the 2026-05-03 dogfood deadline.

## Blockers

None.

## Deferred / Upcoming

- `retro-flow` — implemented; fresh-context review pending
- `export-json-cli` — final v1 slice before dogfood
- v2-only AI roles (Coach / Historian / Scout / Principle mirror)
- multi-user, cloud sync, mobile, and collaboration remain out of scope
