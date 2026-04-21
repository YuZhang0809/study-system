# Project State

Last updated: 2026-04-21

## Current Phase

**Scaffold landed; `seed-cli` slice open.** The `scaffold-and-schema`
slice closed out M1–M9 on 2026-04-21. Post-close review (M5–M8
findings from Codex) landed the same day: `DATABASE_URL` moved to
`file:./prisma/dev.db`, `PlanDay(projectId, date)` became a unique
constraint via a new migration, `dotenv` was added as an explicit
`web/` dev dep, and STATE / plan / README drift was cleaned up.

The repository now holds a runnable Next.js app at `web/`, the full
PRD §3 data model in a Prisma schema, a migrated SQLite dev DB, a
Zod schema layer at the validation boundary, and a vitest harness
with one round-trip smoke test plus per-entity unit tests.

No user-visible feature has landed yet. The six surfaces
(`/today`, `/plan`, `/knowledge`, `/retros`, `/artifacts`,
`/settings`) render the empty shell and a placeholder pane.

The [`seed-cli`](./plans/seed-cli.md) slice is now open (PM layer)
with the idempotency contract fully locked: yaml wins on all
plan-structure columns, but every update is **loud** — the CLI
reports the blast radius (daily_logs / retros tied to the row being
changed) before writing. Orphans (rows present in DB but absent
from yaml) are preserved and logged, never deleted. This aligns
the CLI with PRD §0 ("让你不能对自己的学习状态自欺"): seed can
align structure, but cannot silently erase evidence of drift. Ready
for Codex handoff.

**Dogfood deadline remains 2026-05-03.** 12-day window has shrunk
to roughly 11 days (2026-04-22 → 2026-05-02).

## What Is True Now

### Repository contents

- `PRD.md` v1.0 — product definition unchanged
- `AGENTS.md` — updated "Current Commands" to reflect reality
- `CLAUDE.md` — unchanged
- `docs/decisions/0001-design-handoff-reference.md` — accepted
- `docs/plans/archive/scaffold-and-schema.md` — closed archive
  record for the scaffold-and-schema slice
- `docs/design/study-system/` — vendored Claude Design bundle
- `web/` — Next.js 16.2.4 + React 19.2.4 + Tailwind v4 app
- `web/prisma/schema.prisma` — 11 models matching PRD §3
- `web/prisma/migrations/20260421*_init/` — first migration (SQL
  checked in)
- `web/prisma/dev.db` — local SQLite DB, gitignored
- `web/README.md` — app-local quick start, script, and layout notes
- `web/prisma.config.ts` — Prisma 7 datasource + migrations config
- `web/lib/schemas/` — Zod schemas (11 entity files + enums + index)
- `web/lib/surfaces.ts` — six-surface map (single source of truth
  for labels, paths, shortcuts)
- `web/components/shell/` — Sidebar, Header, Footer, KeyboardNav,
  Icon, PlaceholderPane
- `web/tests/schema-roundtrip.test.ts` — boots a temp DB, inserts
  one row per entity, verifies round-trip + polymorphic Artifact
  lookup

### Runtime shape

- Next.js 16.2.4 (App Router, Turbopack) on port 3000
- React 19.2.4
- Tailwind v4 via `@tailwindcss/postcss`; design tokens live as
  CSS vars in `web/app/globals.css`, mapped into Tailwind via
  `@theme inline` blocks (v4 pattern, no `tailwind.config.ts`)
- Prisma 7.7.0 with `@prisma/adapter-better-sqlite3` (Prisma 7
  requires an adapter for SQLite at runtime; `better-sqlite3` is
  the native driver)
- Zod 4.3.6 for boundary validation
- Vitest 4.1.4 with `includeSource` so each schema carries its own
  `if (import.meta.vitest)` describe block
- Apple system font stack hardcoded; no Google Fonts; italics
  disabled at the base CSS layer

### Current commands (run from `web/`)

See `AGENTS.md` for the full list. Typecheck, lint, test, build
all green as of 2026-04-21.

### Locked-in product constraints

Unchanged from prior STATE.md. Four anti-patterns, no v1 LLM,
`daily_log` structured-only, `knowledge_item` single-table
polymorphic, `artifact` pointers-only, checklists ephemeral, seed
CLI must be idempotent, UI in Simplified Chinese.

## Verification Snapshot

As of 2026-04-21 end-of-slice:

- `cd web && npm run typecheck` — green
- `cd web && npm run lint` — green
- `cd web && npm test` — 13 test files, 25 tests, all green
- `cd web && npm run build` — green (all 8 routes prerendered
  static)
- `/today` through `/settings` render correctly; keyboard shortcuts
  `1`–`5` and `,` route correctly; paper-ruling overlay visible

## Known Open Questions

Unchanged from prior STATE.md except where noted:

- ~~Is this repo initialized as a git repository~~ — **resolved.**
  Initialized on `main`; no remote; PRs not required.
- Does v1 ship a JSON export CLI, and when? Still required per
  PRD §10; owned by the `export-json-cli` slice.
- Plan yaml schema shape — locked in
  [`docs/plans/seed-cli.md`](./plans/seed-cli.md) "YAML shape"
  section. Open questions #1 and #2 resolved 2026-04-21.
- Plan-yaml import UI vs CLI — still unresolved; the `seed-cli`
  slice explicitly defers the UI path, so v1 is CLI-only unless
  the PM pulls import into a later surface slice.
- Tweaks variation axes — unchanged.
- Prisma 7 forced a few changes the plan did not anticipate:
  `url` moved from `schema.prisma` to `prisma.config.ts`, and
  runtime requires `@prisma/adapter-better-sqlite3` +
  `better-sqlite3`. These are infrastructure-level, not product
  scope, and are captured in the slice's Progress Log.

## Recommended Next Step

**Hand [`seed-cli`](./plans/seed-cli.md) to Codex.** Plan is
fully locked: yaml shape, natural keys, idempotency contract
(yaml-wins + loud blast-radius reporting), orphan preservation
rule, six milestones (M1 entrypoint → M2 yaml schema → M3 resolver
+ reader + writer → M4 dry-run + blast-radius output → M5 tests
including drift-visibility cases → M6 doc sync). Codex handoff
prompt pasted into chat on 2026-04-21.

After `seed-cli`, the intended slice order is
`today-page-skeleton` → `knowledge-capture-inline` →
`daily-log-flow` → `weekly-review-flow` → `retro-flow` →
`export-json-cli` (PRD §10 requires export before dogfood-trust).

## Blockers

None. The 12-day window is tight; the scaffold slice took roughly
one working session so the remaining 10–11 days for features is on
plan.

## Deferred / Upcoming

Explicitly deferred to v2 per PRD §5:

- Coach / Historian / Scout / Principle-mirror LLM roles
- Plan-generator / plan-health-check
- Multi-user, cloud sync, mobile
- Complex permissions, sharing, collaboration

Deferred inside v1 but planned:

- `seed-cli` (next slice)
- `export-json-cli` (required before dogfood-trust)
- The five feature surface slices (Today / knowledge /
  daily-log / weekly / retro)
- Footer date reactivity (currently server-rendered only, fine for
  v1 preview but will need client refresh when real content lands)
