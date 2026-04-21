# Project State

Last updated: 2026-04-22

## Current Phase

**`daily-log-flow` v2 implementation complete; fresh-context review pending.**

The v2 rework replaced the inline compose card and `[记为未清账]`
carry-forward button with the four-step `EndOfDayWizard` launched from
the page-head `今日收工 ⌘↵` / `修改今日 ⌘↵` button. `昨日之承诺` now
renders as a read-only quoted block with the `未兑现` label, and
`未清账` rows now show `+Nd` overdue badges.

`upsertDailyLog` / OpenItem / Blocker actions remain the server write
path. `OpenItem` + `Blocker` blocks still keep `+ 新增` and
close/resolve actions per PM-Q3 γ (explicit deviation from design,
documented in the plan). Verification has been rerun on the v2 shape,
including the wizard flow, read-only promise block, overdue badge,
blocker resolve, and project-switch scoping smoke checks.

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
  `seed-cli`, `today-page-skeleton`, and `knowledge-capture-inline`
  plans
- `docs/plans/daily-log-flow.md` remains the active slice plan and now
  records v2 implementation progress through M8, with M9 doc sync in
  this change and fresh-context review next
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
  existing open-item/blocker inline action children
- the superseded `DailyLogCompose`, `DailyLogSummary`,
  `CarryForwardButton`, and `ChipEditor` files have been deleted
- `web/app/today/page.tsx` now wires the wizard into the `.page-head`,
  keeps the `今日 · {ISO}` plan block read-only, renders the read-only
  `昨日之承诺` block in the left column, and keeps `最近动静`,
  `未清账`, and `阻塞` project-scoped
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

As of 2026-04-22 after `daily-log-flow` v2 implementation:

- `cd web && npm run typecheck` - green
- `cd web && npm run lint` - green
- `cd web && npm test` - green; 106 tests
- `cd web && npm run build` - green; `/knowledge` and `/today` build as
  dynamic routes, while `/`, `/_not-found`, `/artifacts`, `/plan`,
  `/retros`, and `/settings` remain static
- Manual smoke against a seeded temp SQLite DB - green for plan items
  1-6 on the built app (`next start` preview): fresh-day wizard create,
  edit/update of the same row, read-only `昨日之承诺` + step-2 prefill,
  `+10d` drift badge, blocker resolve, and cross-project scoping all
  passed
- Note: the plan asked for `npm run dev` smoke, but this workspace
  already had a separate `next dev` process holding the repo lock, so
  the preview was run on `next start` against the fresh production
  build instead

## Known Open Questions

- `export-json-cli` is still required before dogfood trust per PRD §10
- the Today fact-strip's `累计 commits` read remains parked even though
  `knowledge-capture-inline` now writes `Artifact(kind = "commit")`
- global `N` routing and Tweaks-axis resurrection remain parked until
  dogfood proves them necessary

## Recommended Next Step

**Open the fresh-context review session for `daily-log-flow` v2.**
Review focus: wizard surface contract compliance, anti-pattern
compliance (especially restrained submit/complete states), the
read-only `昨日之承诺` shape, overdue badge rendering, and clean
deletion of the superseded inline-compose / carry-forward surfaces.

## Blockers

None.

## Deferred / Upcoming

- `weekly-review-flow`
- `retro-flow`
- `export-json-cli`
- v2-only AI roles (Coach / Historian / Scout / Principle mirror)
- multi-user, cloud sync, mobile, and collaboration remain out of scope
