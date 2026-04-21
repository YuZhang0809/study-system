# Project State

Last updated: 2026-04-21

## Current Phase

**`today-page-skeleton` implementation-complete; fresh-context review pending.**

Scaffold-and-schema and seed-cli are both archived under
[`docs/plans/archive/`](./plans/archive/). Seed-cli's fresh-context
review returned `ship`; closure commit
`bb2180a8c3726b0130e54a05487e9fead3d0e835`.

[`today-page-skeleton`](./plans/today-page-skeleton.md) has now landed
on `main` in six milestones. `/today` is no longer a placeholder: it
resolves the active project from seeded `Project` rows, reads
`PlanSegment` and `PlanDay` server-side, renders the driving-seat
ledger chrome from the design handoff, and exposes URL-driven project
selection through the sidebar (`/today?project=<id>`).

The repository now holds a runnable Next.js app at `web/`, the full
PRD section 3 data model in Prisma, a migrated SQLite dev DB, a Zod
validation boundary, a seed parser/resolver/writer stack for
`Project` / `PlanSegment` / `PlanDay`, a Today-specific server data
layer under `web/lib/today/`, Today surface primitives under
`web/components/today/`, and a Vitest harness covering schema
round-trip, in-source validation, resolver logic, seed CLI
integration, and the new `/today` server-rendered assembly.

The first user-visible feature has landed: `/today` now shows the
locked ledger layout against real seeded data. The other five surfaces
still render the shell and placeholder pane.

The seed-cli contract remains unchanged: yaml wins on plan-structure
columns, every update is loud, blast radius is reported for changed
segments/days, and orphans are preserved and logged instead of
deleted.

**Dogfood deadline remains 2026-05-03.** The 12-day window has shrunk
to roughly 11 days (2026-04-22 -> 2026-05-02).

## What Is True Now

### Repository contents

- `PRD.md` v1.0 - product definition unchanged
- `AGENTS.md` - updated Current Commands to reflect reality
- `CLAUDE.md` - unchanged
- `docs/decisions/0001-design-handoff-reference.md` - accepted
- `docs/plans/archive/scaffold-and-schema.md` - closed archive record
  for the scaffold-and-schema slice
- `docs/plans/archive/seed-cli.md` - closed archive record for the
  seed-cli slice (fresh-context review verdict `ship`, closure commit
  `bb2180a`)
- `docs/design/study-system/` - vendored Claude Design bundle
- `web/` - Next.js 16.2.4 + React 19.2.4 + Tailwind v4 app
- `web/prisma/schema.prisma` - 11 models matching PRD section 3
- `web/prisma/migrations/` - init, `planday-unique-day`, and
  `natural-keys-unique` migrations checked in as SQL
- `web/prisma/dev.db` - local SQLite DB, gitignored
- `web/README.md` - app-local quick start, script, and layout notes
- `web/prisma.config.ts` - Prisma 7 datasource + migrations config
- `web/lib/prisma.ts` - shared app Prisma singleton for server
  surfaces and the seed stack
- `web/lib/schemas/` - Zod schemas (11 entity files + enums + index)
- `web/lib/seed/` - seed parser, resolver, DB reader/writer, and
  shared Prisma factory
- `web/lib/today/` - active-project resolution plus pure driving-seat
  and timeline builders for `/today`
- `web/lib/surfaces.ts` - six-surface map (single source of truth for
  labels, paths, shortcuts)
- `web/components/shell/` - Sidebar, Header, Footer, KeyboardNav,
  Icon, PlaceholderPane, and the thin client project-highlight child
- `web/components/today/` - Today ledger primitives (driving seat,
  fact strip, timeline, ruled blocks)
- `web/app/today/page.tsx` - real server-rendered Today surface
  assembly with async `searchParams`
- `web/tests/schema-roundtrip.test.ts` - boots a temp DB, inserts one
  row per entity, verifies round-trip + polymorphic Artifact lookup
- `web/tests/seed-cli.test.ts` - temp-DB integration coverage for
  first seed, project natural-key upserts, idempotent re-seed, drift
  visibility, and orphan preservation
- `web/tests/today-active-project.test.ts` - temp-DB coverage for
  active-project resolution and sidebar ordering
- `web/tests/today-page.test.tsx` - integration coverage for `/today`
  empty state, project switching, and seeded ledger rendering
- `web/tests/fixtures/seed-smoke.yaml` - 3-segment / 5-day smoke
  fixture used by the integration test and manual verification

### Runtime shape

- Next.js 16.2.4 (App Router, Turbopack) on port 3000
- React 19.2.4
- Tailwind v4 via `@tailwindcss/postcss`; design tokens live as CSS
  vars in `web/app/globals.css`, mapped into Tailwind via `@theme
  inline` blocks (v4 pattern, no `tailwind.config.ts`)
- Prisma 7.7.0 with `@prisma/adapter-better-sqlite3` (Prisma 7
  requires an adapter for SQLite at runtime; `better-sqlite3` is the
  native driver)
- Zod 4.3.6 for boundary validation
- `tsx` 4.21.0 for the seed CLI runner
- `yaml` 2.8.3 for plan import parsing
- Vitest 4.1.4 with `includeSource` so pure helper modules can carry
  in-source tests, plus `jsdom` + React Testing Library for `/today`
  integration coverage
- Apple system font stack hardcoded; no Google Fonts; italics disabled
  at the base CSS layer

### Current commands (run from `web/`)

See `AGENTS.md` for the full list. The baseline verification sweep is
now `typecheck`, `lint`, `test`, and `build`, with the seed CLI manual
check still available via `npm run seed -- tests/fixtures/seed-smoke.yaml`.

### Locked-in product constraints

Unchanged from prior `STATE.md`: four anti-patterns, no v1 LLM,
`daily_log` structured-only, `knowledge_item` single-table
polymorphic, `artifact` pointers-only, checklists ephemeral, seed CLI
must be idempotent, UI in Simplified Chinese.

## Verification Snapshot

As of 2026-04-21 after `today-page-skeleton` review follow-ups:

- `cd web && npm run typecheck` - green
- `cd web && npm run lint` - green
- `cd web && npm test` - 20 test files, 76 tests, all green
- `cd web && npm run build` - green; `/today` now builds as dynamic
  while the other seven routes remain static
- Manual `/today` smoke on `npm run dev` against a freshly migrated
  empty DB - green; sidebar project section renders the no-project
  copy and the page points the user to `npm run seed`
- Manual `/today` smoke after
  `cd web && npm run seed -- tests/fixtures/seed-smoke.yaml` - green
  for the actual fixture dates on 2026-04-21: the page renders the
  pre-start driving-seat sentence, the 5-cell timeline band, fact-strip
  values `placeholder / placeholder / 13 days / 3 segments / 0 completed`, and the
  `Today 2026-04-21` block falls back to the contract's not-scheduled
  copy because the fixture starts on 2026-05-03
- Sidebar project selection was rechecked in a real browser:
  `/today?project=<id>` marks the active project link with
  `aria-current="page"` while keeping plain `<a>` navigation

The pre-existing shell keyboard shortcuts were not changed in this
slice. Playwright CLI could not reliably re-trigger that existing
`KeyboardNav` listener during the browser smoke run, so this close-out
reverified the Today surface itself rather than making new claims
about the unchanged shortcut layer.

## Known Open Questions

Unchanged from the prior state except where noted:

- Does v1 ship a JSON export CLI, and when? Still required per PRD
  section 10; owned by the `export-json-cli` slice
- Plan-yaml import UI vs CLI - still unresolved; the `seed-cli` slice
  explicitly defers the UI path, so v1 is CLI-only unless the PM pulls
  import into a later surface slice
- Tweaks variation axes - unchanged
- Drift coloring on past timeline cells still depends on future
  `DailyLog` data; parked for `daily-log-flow`

## Recommended Next Step

**Open the fresh-context review session for
[`today-page-skeleton`](./plans/today-page-skeleton.md).** The
implementation slice is complete on `main`, the Progress Log is up to
date, and `/today` is now the first live data-backed surface.

Review should focus on:

- active-project resolution and bogus / missing `?project=` handling
- server/component boundary compliance for the sidebar carveout
- `/today` contract fidelity against decision 0001 and the ExecPlan
- integration coverage for empty DB, project switching, and seeded
  pre-start / in-window branches

After that review, the intended slice order remains
`knowledge-capture-inline` -> `daily-log-flow` -> `weekly-review-flow`
-> `retro-flow` -> `export-json-cli` (PRD section 10 still requires
export before dogfood-trust).

## Blockers

No active execution blocker. The implementation slice is done; only
the fresh-context review gate remains before PM-side closure.

## Deferred / Upcoming

Explicitly deferred to v2 per PRD section 5:

- Coach / Historian / Scout / Principle-mirror LLM roles
- Plan-generator / plan-health-check
- Multi-user, cloud sync, mobile
- Complex permissions, sharing, collaboration

Deferred inside v1 but planned:

- `knowledge-capture-inline`
- `daily-log-flow`
- `weekly-review-flow`
- `retro-flow`
- `export-json-cli` (required before dogfood-trust)
- Footer date reactivity (currently server-rendered only, fine for v1
  preview but will need client refresh when real content lands)



