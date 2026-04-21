# Project State

Last updated: 2026-04-21

## Current Phase

**`seed-cli` reviewed and implementation-complete; archive handoff is next.**
The `scaffold-and-schema` slice is closed. The follow-on `seed-cli`
slice now has the full locked plan-import contract in place at
`web/scripts/seed.ts` (`cd web && npm run seed -- <path> [--dry-run]`),
including schema-enforced natural keys on `Project.name` and
`PlanSegment(projectId, order)`, loud update output with blast-radius
reporting, preserved orphans, and structured Prisma uniqueness
translation on the live SQLite adapter stack. The fresh-context review
over `main` through the natural-key follow-up has run, returned
`ship`, and the remaining work is closure sync before Claude archives
the plan and opens `today-page-skeleton`.

The repository now holds a runnable Next.js app at `web/`, the full
PRD section 3 data model in a Prisma schema, a migrated SQLite dev DB,
a Zod schema layer at the validation boundary, a seed
parser/resolver/writer stack for `Project` / `PlanSegment` /
`PlanDay`, and a Vitest harness covering schema round-trip, in-source
validation, resolver logic, and seed CLI integration.

No user-visible feature has landed yet. The six surfaces
(`/today`, `/plan`, `/knowledge`, `/retros`, `/artifacts`,
`/settings`) render the empty shell and a placeholder pane.

The seed-cli contract as implemented: yaml wins on plan-structure
columns, every update is loud, blast radius is reported for changed
segments/days, and orphans are preserved and logged instead of
deleted.

**Dogfood deadline remains 2026-05-03.** The 12-day window has shrunk
to roughly 11 days (2026-04-22 -> 2026-05-02).

## What Is True Now

### Repository contents

- `PRD.md` v1.0 - product definition unchanged
- `AGENTS.md` - updated "Current Commands" to reflect reality
- `CLAUDE.md` - unchanged
- `docs/decisions/0001-design-handoff-reference.md` - accepted
- `docs/plans/archive/scaffold-and-schema.md` - closed archive record
  for the scaffold-and-schema slice
- `docs/design/study-system/` - vendored Claude Design bundle
- `web/` - Next.js 16.2.4 + React 19.2.4 + Tailwind v4 app
- `web/prisma/schema.prisma` - 11 models matching PRD section 3
- `web/prisma/migrations/` - init, `planday-unique-day`, and
  `natural-keys-unique` migrations checked in as SQL
- `web/prisma/dev.db` - local SQLite DB, gitignored
- `web/README.md` - app-local quick start, script, and layout notes
- `web/prisma.config.ts` - Prisma 7 datasource + migrations config
- `web/lib/schemas/` - Zod schemas (11 entity files + enums + index)
- `web/lib/seed/` - seed parser, resolver, DB reader/writer, and
  shared Prisma factory
- `web/lib/surfaces.ts` - six-surface map (single source of truth for
  labels, paths, shortcuts)
- `web/components/shell/` - Sidebar, Header, Footer, KeyboardNav,
  Icon, PlaceholderPane
- `web/tests/schema-roundtrip.test.ts` - boots a temp DB, inserts one
  row per entity, verifies round-trip + polymorphic Artifact lookup
- `web/tests/seed-cli.test.ts` - temp-DB integration coverage for
  first seed, project natural-key upserts, idempotent re-seed, drift
  visibility, and orphan preservation
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
- Vitest 4.1.4 with `includeSource` so each schema / seed module can
  carry its own `if (import.meta.vitest)` describe block
- Apple system font stack hardcoded; no Google Fonts; italics
  disabled at the base CSS layer

### Current commands (run from `web/`)

See `AGENTS.md` for the full list. The seed CLI is now part of that
baseline command set, and the verification sweep below was rerun after
the reviewed follow-ups landed.

### Locked-in product constraints

Unchanged from prior `STATE.md`: four anti-patterns, no v1 LLM,
`daily_log` structured-only, `knowledge_item` single-table
polymorphic, `artifact` pointers-only, checklists ephemeral, seed CLI
must be idempotent, UI in Simplified Chinese.

## Verification Snapshot

As of 2026-04-21 after the reviewed `seed-cli` follow-ups:

- `cd web && npm run typecheck` - green
- `cd web && npm run lint` - green
- `cd web && npm test` - 16 test files, 55 tests, all green
- `cd web && npm run build` - green (all 8 routes prerendered static)
- `cd web && npm run seed -- tests/fixtures/seed-smoke.yaml --dry-run`
  - green; prints 1 project insert, 3 segment inserts, 5 day inserts,
  no orphans
- Manual smoke steps 1-9 from
  [`docs/plans/seed-cli.md`](./plans/seed-cli.md) all executed against
  `web/prisma/dev.db`, including loud blast-radius output for segment /
  day updates, orphan preservation with an existing `DailyLog`, second
  project insertion by name, and same-name project UPDATE on rerun
- `/today` through `/settings` render correctly; keyboard shortcuts
  `1`-`5` and `,` route correctly; paper-ruling overlay visible

## Known Open Questions

Unchanged from prior `STATE.md` except where noted:

- ~~Is this repo initialized as a git repository~~ - **resolved.**
  Initialized on `main`; no remote; PRs not required.
- Does v1 ship a JSON export CLI, and when? Still required per PRD
  section 10; owned by the `export-json-cli` slice.
- Plan yaml schema shape - locked in
  [`docs/plans/seed-cli.md`](./plans/seed-cli.md) "YAML shape"
  section. Open questions #1 and #2 resolved 2026-04-21.
- Plan-yaml import UI vs CLI - still unresolved; the `seed-cli` slice
  explicitly defers the UI path, so v1 is CLI-only unless the PM pulls
  import into a later surface slice.
- Tweaks variation axes - unchanged.
- Prisma 7 forced a few changes the plan did not anticipate: `url`
  moved from `schema.prisma` to `prisma.config.ts`, and runtime
  requires `@prisma/adapter-better-sqlite3` + `better-sqlite3`. These
  are infrastructure-level, not product scope, and are captured in the
  slice's Progress Log.

## Recommended Next Step

1. **Archive the reviewed `seed-cli` plan and open
   `today-page-skeleton`.** The implementation, migration follow-up,
   verification sweep, manual smoke, and fresh-context review have all
   run. The next PM-layer action is closure + next-slice handoff.
2. **Carry the seeded data path forward into `today-page-skeleton`.**
   The UI skeleton can now rely on real `Project` / `PlanSegment` /
   `PlanDay` rows seeded through the locked CLI contract instead of
   inventing a project-creation path.

After `today-page-skeleton`, the intended slice order is
`knowledge-capture-inline` -> `daily-log-flow` -> `weekly-review-flow`
-> `retro-flow` -> `export-json-cli` (PRD section 10 requires export
before dogfood-trust).

## Blockers

No active execution blocker. `seed-cli` is reviewed and complete; the
remaining work is PM-layer archival plus the next feature slice. The
12-day window is tight; roughly 10 days (2026-04-22 -> 2026-05-02)
remain for the five feature surface slices and the export CLI.

## Deferred / Upcoming

Explicitly deferred to v2 per PRD section 5:

- Coach / Historian / Scout / Principle-mirror LLM roles
- Plan-generator / plan-health-check
- Multi-user, cloud sync, mobile
- Complex permissions, sharing, collaboration

Deferred inside v1 but planned:

- `export-json-cli` (required before dogfood-trust)
- The five feature surface slices (Today / knowledge / daily-log /
  weekly / retro)
- Footer date reactivity (currently server-rendered only, fine for v1
  preview but will need client refresh when real content lands)
