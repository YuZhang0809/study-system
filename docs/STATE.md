# Project State

Last updated: 2026-04-22

## Current Phase

**`retro-flow` code slice is closed (2026-04-22) at approved head
`9a52828`. The orthogonal local-runtime-DB repair chore ran
2026-04-22 via drop + rebuild (Option B); `/retros`, `/retros?tab=weekly`,
and `/today` all return 200 with no Prisma error against the real
`DATABASE_URL`. `export-json-cli` — the final v1 slice — is now
unblocked and awaiting scoping.**

Fresh-context review at `9a52828` returned `approve` after three
follow-up commits cleared an initial block: `PhaseRetroEntry.tsx`
now uses `router.replace` instead of `window.location.href`
(`fb2e98d`), `schema-roundtrip.test.ts` / `seed-cli.test.ts` retro
fixtures were updated to the design-authoritative
`{q1,q2,q3}` / `{change,reason}` shapes (`b2bdb9f`), and
`web/vitest.config.ts` no longer excludes `lib/retro/**/*.ts` so
the in-source `presentation.ts` / `metrics.ts` helper tests
actually run (`d07ec1d`). Plan progress log + worktree cleanup
landed in `9a52828`. Verification at close: 140/140 tests green,
build / typecheck / lint green, `prisma migrate diff` empty
against the committed schema, git status clean, seven-step manual
smoke green on a temp-migrated DB, and repo grep confirmed no
remaining `{kept,changed,killed}` or `{from,to}` retro fixtures.

**The runtime-DB chore was orthogonal to the retro-flow code
diff.** After review approval, Codex discovered that
`web/prisma/dev.db` had never had `_prisma_migrations` populated
— no prior slice's migration had actually been applied to that DB.
Its existing rows were created via an earlier `prisma db push` or
direct write. `retro-flow` was simply the first slice whose new
column is queried by a default page render, so it was the first
slice where the runtime drift manifested as a user-visible error
(P2022 on opening `/retros` against the real DATABASE_URL). Prior
slices had the same gap silently. See
`docs/decisions/0002-schema-slice-runtime-probe.md` for the
verifier-process fix that prevents a repeat.

The chore ran 2026-04-22 via Option B (drop + rebuild): the
pre-drop DB was dumped to `web/prisma/backups/dev.db.20260422-194951.sql`
(gitignored), `dev.db` was removed, and `npx prisma migrate
deploy` reapplied all four committed migrations from scratch
against an empty DB. No seed: no canonical prod yaml exists — the
Agentic 90-day yaml for dogfood is authored separately. Only
in-repo change from the chore: `web/.gitignore` gained
`prisma/backups/`. The runtime-probe rule from decision 0002 ran
for the first time here and passed.

The dogfood deadline is still **2026-05-03**. With
`daily-log-flow`, `weekly-review-flow`, and `retro-flow`
implemented and the local runtime baseline clean, `export-json-cli`
is the final v1 slice before dogfood and is ready to scope.

## What Is True Now

### Repository contents

- `PRD.md` v1.0 remains the product source of truth
- `AGENTS.md` + `web/AGENTS.md` remain the operating contract and command map
- `docs/decisions/0001-design-handoff-reference.md` still locks the visual system
- `docs/plans/archive/` holds the closed `scaffold-and-schema`,
  `seed-cli`, `today-page-skeleton`, `knowledge-capture-inline`,
  `daily-log-flow`, `weekly-review-flow`, and `retro-flow` plans
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

As of 2026-04-22 at `retro-flow` close (fresh-context review
returned `approve` at head `9a52828`):

- `cd web && npm run build` - green; `/knowledge`, `/retros`, and
  `/today` build as dynamic routes, while `/`, `/_not-found`,
  `/artifacts`, `/plan`, and `/settings` remain static
- `cd web && npm run typecheck` - green
- `cd web && npm run lint` - green
- `cd web && npm test` - green; 140/140 tests (the previously
  excluded in-source tests for `web/lib/retro/presentation.ts` and
  `web/lib/retro/metrics.ts` now run after `vitest.config.ts` was
  un-excluded in `d07ec1d`)
- `npx prisma migrate diff --from-migrations prisma/migrations
  --to-schema prisma/schema.prisma --script --exit-code` — empty
- `git status` — clean
- Seven-step manual smoke green against a temp-migrated DB during
  the review pass: phase-default eligible state, submit validation
  bounce to step 2, current-segment create, committed-card render,
  previous-phase score reference line without prefill, cross-project
  rerendering on `/retros`, and the weekly-tab surface staying intact
  after the phase-default flip.

**Real-runtime baseline (added 2026-04-22 post-chore):**

- `npx prisma migrate status` against the real `DATABASE_URL` —
  "Database schema is up to date!" with all four committed
  migrations applied
- `npx prisma migrate diff --from-config-datasource --to-schema
  prisma/schema.prisma` — "No difference detected"
- `next start` + HTTP probe: `/retros` → 200, `/retros?tab=weekly`
  → 200, `/today` → 200; server stdout/stderr clean of
  P2022 / Prisma / Error / Unhandled / Exception

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
- Prisma 7 renamed `migrate diff`'s `--from-schema-datasource`
  to `--from-config-datasource`. The chore surfaced this; decision
  0002's Open items note it. Any future verifier template that
  diffs schema against the real datasource must use the new flag.

## Recommended Next Step

**Scope `export-json-cli`.** `retro-flow` is closed at `9a52828`;
the local-DB chore is done; the real runtime boots clean. This is
the final v1 slice before the 2026-05-03 dogfood deadline.
`export-json-cli` does not add a Prisma migration, so decision
0002's two extra verifier lines don't apply to it; it will,
however, be the first slice whose handoff template gets reviewed
against decision 0002's reviewer-check rule (rule 4).

## Blockers

None.

## Deferred / Upcoming

- `export-json-cli` — final v1 slice before dogfood
- v2-only AI roles (Coach / Historian / Scout / Principle mirror)
- multi-user, cloud sync, mobile, and collaboration remain out of scope
