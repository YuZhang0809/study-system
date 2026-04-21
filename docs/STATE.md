# Project State

Last updated: 2026-04-21

## Current Phase

**`knowledge-capture-inline` is implementation-complete; fresh-context review is pending.**

The active slice now lands a real `/knowledge` surface on top of the
existing scaffold, schema, and Today page. The app can server-render a
type-filtered knowledge ledger, open an inline compose card for all four
`knowledge_item` types, validate and write new rows through a Next.js 16
server action, derive collision-safe slugs, optionally attach one
pointer-style `Artifact`, and revalidate both `/knowledge` and `/today`
after submit.

`/today` is no longer fully static in its right-hand column: the
`最近动静` block now reads the active project's 5 most-recent
`KnowledgeItem` rows and renders a live feed with type badge, title, and
relative date. The other Today blocks remain intentionally empty-state
until `daily-log-flow`.

The dogfood deadline is still **2026-05-03**. With
`knowledge-capture-inline` implemented on `main`, the remaining v1 slices
are `daily-log-flow`, `weekly-review-flow`, `retro-flow`, and
`export-json-cli`, plus the fresh-context review and any follow-up fixes
it finds.

## What Is True Now

### Repository contents

- `PRD.md` v1.0 remains the product source of truth
- `AGENTS.md` + `web/AGENTS.md` remain the operating contract and command map
- `docs/decisions/0001-design-handoff-reference.md` still locks the visual system
- `docs/plans/archive/` holds the closed `scaffold-and-schema`,
  `seed-cli`, and `today-page-skeleton` plans
- `docs/plans/knowledge-capture-inline.md` is the active execution plan
  and now contains the implementation progress log through M6
- `web/lib/knowledge/` now holds the knowledge slice server/data layer:
  `queries.ts`, `slug.ts`, `artifact-kind.ts`, and `actions.ts`
- `web/components/knowledge/` now holds the knowledge slice UI
  primitives: `TypeTag`, `TypePillbar`, `KnowledgeList`, `SearchBox`,
  and `InlineCompose`
- `web/app/knowledge/page.tsx` plus
  `web/app/knowledge/_NewButtonRow.tsx` replace the `/knowledge`
  placeholder with the inline capture surface
- `web/components/today/RecentKnowledgeList.tsx` and
  `web/lib/today/relative-days.ts` light up `/today`'s `最近动静` block
- `web/tests/knowledge-create.test.ts` covers direct server-action calls
  and slug/artifact write behavior against a temp SQLite DB
- `web/tests/knowledge-list.test.ts` covers list filtering, ordering,
  artifact counts, and the 200-row cap against a temp SQLite DB
- `web/tests/knowledge-page.test.tsx` renders `/knowledge` through RTL
  and covers counters, type-filter links, filtered rows, and empty state
- `web/tests/today-page.test.tsx` now also covers the populated
  `最近动静` state in addition to the earlier Today-shell assertions

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

As of 2026-04-21 after the implementation milestones for
`knowledge-capture-inline` landed locally on `main`:

- `cd web && npm run typecheck` - green
- `cd web && npm run lint` - green
- `cd web && npm test` - green; 26 test files and 98 tests
- `cd web && npm run build` - green; `/knowledge` and `/today` build as
  dynamic routes, while `/`, `/_not-found`, `/artifacts`, `/plan`,
  `/retros`, and `/settings` remain static

Manual browser verification for the new `/knowledge` compose flow was
not re-run in this implementation session. That is still appropriate
follow-up work for the fresh-context review / fix pass, alongside any
issues the reviewer finds.

## Known Open Questions

- `export-json-cli` is still required before dogfood trust per PRD §10
- `daily-log-flow` still owns the remaining Today blocks
  (`昨日之承诺`, `未清账`, `阻塞`)
- the Today fact-strip's `累计 commits` read remains parked even though
  this slice now writes `Artifact(kind = "commit")`
- global `N` routing and Tweaks-axis resurrection remain parked until
  dogfood proves them necessary

## Recommended Next Step

**Open a fresh-context Codex review session against the current `main`
head and this slice's active plan.**

The review should check:

- anti-pattern compliance on the `/knowledge` form and `/today` feed
- server-action correctness at the Zod boundary
- slug collision handling and single-artifact writes
- the in-memory SearchBox behavior versus the locked surface contract
- verification quality and any missed edge cases in the new tests

If review finds defects, fix them in a short follow-up slice before
declaring `knowledge-capture-inline` closed and moving on to
`daily-log-flow`.

## Blockers

No active implementation blocker. The current blocker is procedural:
fresh-context review has not happened yet.

## Deferred / Upcoming

- `daily-log-flow`
- `weekly-review-flow`
- `retro-flow`
- `export-json-cli`
- v2-only AI roles (Coach / Historian / Scout / Principle mirror)
- multi-user, cloud sync, mobile, and collaboration remain out of scope
