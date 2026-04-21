# Project State

Last updated: 2026-04-21

## Current Phase

**`daily-log-flow` is implementation-complete; fresh-context review is
next.**

`/today` now renders the working day ledger instead of daily-log-flow
placeholder copy. The page server-renders the active project's
`今日日志` compose card, yesterday-promise carry-forward block,
open-item list, and active-blocker list alongside the existing
driving-seat sentence, timeline, fact strip, and `最近动静` feed. Daily
log writes upsert on `(projectId, date)`, carry-forward is idempotent
per the locked de-dup rule, and all four mutation surfaces validate at
the Zod boundary before Prisma writes through Next.js 16 server
actions.

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
- `docs/plans/daily-log-flow.md` is the active execution plan, now with
  implementation progress logged through M4 and doc sync pending
- `web/lib/knowledge/` now holds the knowledge slice server/data layer:
  `queries.ts`, `slug.ts`, `artifact-kind.ts`, and `actions.ts`
- `web/components/knowledge/` now holds the knowledge slice UI
  primitives: `TypeTag`, `TypePillbar`, `KnowledgeList`, `SearchBox`,
  and `InlineCompose`
- `web/app/knowledge/page.tsx` plus
  `web/app/knowledge/_NewButtonRow.tsx` replace the `/knowledge`
  placeholder with the inline capture surface
- `web/lib/daily-log/` now holds the daily-log slice server/data layer:
  `queries.ts`, `actions.ts`, and `presentation.ts`
- `web/components/daily-log/` now holds the day-ledger UI primitives:
  compose card, chip editor, carry-forward button, open-item/blocker
  blocks, and their inline action children
- `web/app/today/page.tsx` now wires all four daily-log surfaces into
  the left and right columns while keeping the fact strip and
  `最近动静` feed unchanged
- `web/components/today/RecentKnowledgeList.tsx` and
  `web/lib/today/relative-days.ts` light up `/today`'s `最近动静` block
- `web/tests/knowledge-create.test.ts` covers direct server-action calls
  and slug/artifact write behavior against a temp SQLite DB
- `web/tests/knowledge-list.test.ts` covers list filtering, ordering,
  artifact counts, and the 200-row cap against a temp SQLite DB
- `web/tests/knowledge-page.test.tsx` renders `/knowledge` through RTL
  and covers counters, type-filter links, filtered rows, and empty state
- `web/tests/daily-log-upsert.test.ts`,
  `web/tests/daily-log-carry-forward.test.ts`,
  `web/tests/open-items-actions.test.ts`, and
  `web/tests/blockers-actions.test.ts` cover the new server actions
  against temp SQLite DBs
- `web/tests/today-page.test.tsx` now also covers the populated
  `今日日志` / `昨日之承诺` / `未清账` / `阻塞` states in addition to the
  earlier Today-shell assertions

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

As of 2026-04-21 after `daily-log-flow` implementation completed
locally:

- `cd web && npm run typecheck` - green
- `cd web && npm run lint` - green
- `cd web && npm test` - green; 107 tests
- `cd web && npm run build` - green; `/knowledge` and `/today` build as
  dynamic routes, while `/`, `/_not-found`, `/artifacts`, `/plan`,
  `/retros`, and `/settings` remain static

Manual browser verification was not run on this head. That is
appropriate follow-up for the fresh-context reviewer and PM dogfood
pass, not a blocker for opening review.

## Known Open Questions

- `export-json-cli` is still required before dogfood trust per PRD §10
- the Today fact-strip's `累计 commits` read remains parked even though
  `knowledge-capture-inline` now writes `Artifact(kind = "commit")`
- global `N` routing and Tweaks-axis resurrection remain parked until
  dogfood proves them necessary

## Recommended Next Step

**Open the fresh-context review session for `daily-log-flow`.** Review
focus should be anti-pattern compliance on `/today`, server-action
validation boundaries, idempotent carry-forward behavior, and whether
the page wiring stays within the locked surface contract.

## Blockers

None.

## Deferred / Upcoming

- `weekly-review-flow`
- `retro-flow`
- `export-json-cli`
- v2-only AI roles (Coach / Historian / Scout / Principle mirror)
- multi-user, cloud sync, mobile, and collaboration remain out of scope
