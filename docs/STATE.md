# Project State

Last updated: 2026-04-22

## Current Phase

**`weekly-review-flow` implementation is complete (2026-04-22);
fresh-context review is pending.**

The `/retros` placeholder has been replaced with the live weekly-review
surface: page-head `本周复盘 ⌘↵` / `修改本周 ⌘↵`, `阶段复盘` placeholder
tab, weekly modal write path, read-only weekly card list, previous-week
Q6 reference line for Q4, and server-side weekly upsert/revalidation.
All four anti-patterns still pass. Verification at close: `build`,
`typecheck`, `lint`, and `test` are green; `/retros` now builds as a
dynamic route; a `next start` preview against a temp SQLite DB covered
all six weekly-review smoke items.

The preceding `knowledge-capture-inline` slice remains in place:
`/knowledge` stays the primary inline capture surface for
`knowledge_item`, and `/today`'s `最近动静` block still renders the
active project's top-5 recent captures.

The dogfood deadline is still **2026-05-03**. With
`daily-log-flow` implemented, the remaining v1 slices are
`weekly-review-flow`, `retro-flow`, and `export-json-cli`.

## What Is True Now

### Repository contents

- `PRD.md` v1.0 remains the product source of truth
- `AGENTS.md` + `web/AGENTS.md` remain the operating contract and command map
- `docs/decisions/0001-design-handoff-reference.md` still locks the visual system
- `docs/plans/archive/` holds the closed `scaffold-and-schema`,
  `seed-cli`, `today-page-skeleton`, `knowledge-capture-inline`, and
  `daily-log-flow` plans
- `docs/plans/weekly-review-flow.md` remains the current execution
  record and now carries the M1–M4 progress log entries plus the
  M5 handoff note
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
- `web/components/weekly/` now holds the weekly slice UI primitives:
  `WeeklyReviewEntry`, `WeeklyReviewModal`, `WeeklyScoresRow`, and the
  server-safe `WeeklyLogCard`
- `web/app/retros/page.tsx` now replaces the placeholder with the live
  weekly tab plus the phase-placeholder tab
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
- `web/tests/retros-page.test.tsx` renders `/retros` through RTL and
  covers empty states, current/previous-week button state, and the
  phase placeholder
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

As of 2026-04-22 at `weekly-review-flow` close (author verification,
pre fresh-context review):

- `cd web && npm run build` - green; `/knowledge`, `/retros`, and
  `/today` build as dynamic routes, while `/`, `/_not-found`,
  `/artifacts`, `/plan`, and `/settings` remain static
- `cd web && npm run typecheck` - green
- `cd web && npm run lint` - green
- `cd web && npm test` - green; 119 tests
- Manual smoke on a `next start` preview against
  `web/prisma/manual-smoke-weekly-flow.db` covered all six weekly-review
  items: weekly-tab empty state, submit validation, current-week create,
  current-week edit, previous-week Q6 reference line, phase placeholder,
  and cross-project rerendering on `/retros`

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

**Open the fresh-context review for `weekly-review-flow`.** Implementation
is landed and verified; the next useful step is a diff-focused Codex
review against `main` using `docs/code_review.md`.

After that: `retro-flow`, then `export-json-cli` before the
2026-05-03 dogfood deadline.

## Blockers

None.

## Deferred / Upcoming

- `weekly-review-flow` — next in queue, plan to be drafted
- `retro-flow`
- `export-json-cli`
- v2-only AI roles (Coach / Historian / Scout / Principle mirror)
- multi-user, cloud sync, mobile, and collaboration remain out of scope
