# ExecPlan — scaffold-and-schema

**Status:** closed
**Owner (impl):** Claude (direct, by human-authorized role switch)
**Owner (PM):** Claude / human PM
**Opened:** 2026-04-21
**Closed:** 2026-04-21
**Outcome:** all M1–M9 verification green; see Progress Log

## Goal

After this slice lands, the repository has a working Next.js app at
`web/`, a Prisma + SQLite schema covering every entity in PRD §3, a
frozen six-surface UI shell that matches decision 0001's visual
system, and a green smoke test proving the schema round-trips. Every
later slice (seed CLI, Today page content, knowledge capture, etc.)
builds inside this shell rather than reshaping it.

## Context

- Repository is pre-scaffold at open time. `PRD.md`, `AGENTS.md`,
  `CLAUDE.md`, the `docs/` tree, and the vendored design bundle at
  `docs/design/study-system/` all exist; there is no code, no
  `package.json`, no git history, no database.
- The frontend's visual system and information architecture are
  locked by [`docs/decisions/0001-design-handoff-reference.md`](../decisions/0001-design-handoff-reference.md).
  This slice is that decision's first concrete consumer.
- Product constraints come from [`PRD.md`](../../PRD.md) — especially
  §3 (data model), §1 (anti-patterns), and §6 (target stack).
- Subsequent slices in the intended order (per `docs/STATE.md`):
  `seed-cli` → `today-page-skeleton` → `knowledge-capture-inline` →
  `daily-log-flow` → `weekly-review-flow` → `retro-flow` →
  `export-json-cli`. None of them should need to touch the shell
  chrome, the design tokens, or the base schema shape after this
  slice closes.

### PM-confirmed choices

Locked with the human PM on 2026-04-21 before this plan opened:

1. Next.js app lives at `web/` (subdirectory, not repo root). Leaves
   room for a future `cli/`, `desktop/`, or `scripts/` sibling.
2. Design tokens live as CSS variables in
   `web/app/globals.css`; Tailwind's `theme.extend.colors` references
   them via `oklch(var(--paper))` (and equivalents). Every future UI
   slice uses Tailwind utilities that resolve through these vars.
3. Slice scope is scaffold + schema + **empty** six-surface shell +
   one schema round-trip smoke test. Seed CLI, page content beyond
   placeholder panes, and rendered shadcn components are out of
   scope (shadcn is initialized but no components are generated yet).
4. `npm` as the package manager; `vitest` as the test framework.
5. Branching: `main` only. PRs are not required. Branches or git
   worktrees are fine when parallel work starts, but this slice is a
   single-thread commit stream on `main`.
6. Prisma DB lives at `web/prisma/dev.db` and is gitignored; the
   `schema.prisma` and the `migrations/` tree are checked in.

## Constraints

### Anti-pattern check (PRD §1)

- **not a tutor** — no explainer copy; placeholder panes show only
  the surface label
- **not a ghostwriter** — no generated body text anywhere
- **not a cheerleader** — no emoji, no encouragement copy; shell
  footer copy is flat status text per decision 0001
- **not a planner** — this slice adds no plan-generation code path

Trivially passes all four.

### Preserved invariants

- No runtime LLM. No external API calls at build or request time.
- No Google Fonts or any other web-font loader — the Apple system
  font stack is hard-coded per decision 0001.
- No italics anywhere in any style rule or component.
- `knowledge_item` is a single table with `type` + `metadata`; do
  not split into per-type tables (PRD §3 D-2).
- `daily_log` has only structured columns; no free-form "overflow"
  text field (PRD §3 D-3).
- `artifact` stores pointers only, no blob columns (PRD §3 D-4).
- Weekly / phase-exit checklist state is NOT modeled in the DB;
  only the structured fields on `weekly_log` / `retro` persist
  (PRD §3 D-5).
- Every Chinese string that appears is UI copy. Code identifiers,
  migration names, file names, and comments stay in English.

### Non-goals for this slice

- No seed CLI, no yaml parsing, no data import path.
- No API route handlers. Zod schemas exist but are not wired into
  any `/api/*` endpoint yet.
- No real content in any of the six surfaces. No Today timeline,
  no knowledge-item list, no retro form, no project switcher logic.
- No authentication, no session layer.
- No CI configuration, no deploy target, no Dockerfile.
- No `shadcn` components generated. `npx shadcn init` runs so the
  `cn()` helper, `components.json`, and dependency baseline exist;
  `components/ui/*` stays empty until a later slice needs a
  concrete primitive.
- No JSON export CLI (its own slice).

## Milestones

Each milestone is a reviewable commit (or a small cluster of
commits). Later milestones depend on earlier ones.

### M1 — repo init

- `git init` at repository root. Default branch `main`.
- Root `.gitignore` covering `node_modules/`, `web/.next/`,
  `web/prisma/dev.db`, `web/prisma/migrations/dev/` (only the dev
  DB file itself, not the migration SQL), `.env*.local`,
  `coverage/`, `.DS_Store`, editor droppings.
- Root `README.md` with a one-paragraph "what this is" and a link
  to `PRD.md` + `docs/STATE.md`. No marketing copy.
- No root `package.json` and no workspace manifest. The `web/` app
  is self-contained. Optional thin convenience script
  `scripts/dev.ps1` and `scripts/dev.sh` that `cd web && npm run
  dev` — include only if trivial; skip if it adds friction.

### M2 — Next.js scaffold in `web/`

- Run `npx create-next-app@latest web` with: TypeScript, App Router,
  Tailwind, ESLint on, no `src/` directory (keep `app/` at
  `web/app/`), default import alias `@/*`.
- Confirm the generated `package.json` pins Next ≥ 14 and React 19
  (whatever create-next-app ships at run time is fine — record the
  versions in the Progress Log).
- `web/tsconfig.json`: strict mode on (default). No exceptions.
- `web/next.config.*`: unchanged beyond scaffold defaults.
- Delete the demo homepage content; keep `web/app/layout.tsx` as
  the root layout scaffold for M4 to build on.
- Delete `web/public/next.svg` / `vercel.svg` and any other demo
  assets. No favicon churn — leave whatever create-next-app gives.

### M3 — design tokens + global stylesheet

Read
[`docs/design/study-system/project/styles.css`](../design/study-system/project/styles.css)
as the source spec.

- Replace `web/app/globals.css` with:
  - CSS custom properties in `:root` for the full token set from
    decision 0001 (`--paper`, `--paper-2/3/edge`, `--ink`,
    `--ink-2/3/4`, `--rule`, `--rule-strong`, `--amber`,
    `--amber-ink`, `--amber-wash`, `--drift`, `--drift-wash`,
    `--done`, `--done-wash`, and the `--t-*` type scale).
  - Root `body` rules: Apple system font stack for body,
    `font-variant-numeric: tabular-nums slashed-zero` on numeric
    runs (applied via a `.num` utility class or via
    `font-feature-settings` on a scoped selector — mirror the
    bundle's choice).
  - `body::before` paper-ruling overlay:
    `repeating-linear-gradient` at ~23.5px stride, 0.35 opacity,
    `mix-blend-mode: multiply`, `pointer-events: none`. Exactly
    what the bundle does.
  - A `.mono` utility for the SF Mono stack. A `.num` utility
    applying `tabular-nums slashed-zero`.
  - Explicit rule: `* { font-style: normal !important; }` is
    overkill, but at minimum document in a comment that italics
    are banned and audit any third-party CSS (Tailwind reset, any
    shadcn base layer) for residual italic rules. No emoji /
    decorative runs.
- `web/tailwind.config.ts`:
  - `theme.extend.colors` exposes named tokens that resolve to the
    CSS vars, e.g.
    `paper: 'oklch(var(--paper))'`,
    `ink: 'oklch(var(--ink))'`,
    `amber: 'oklch(var(--amber))'`,
    `drift: 'oklch(var(--drift))'`,
    `done: 'oklch(var(--done))'`,
    plus the `-2`/`-3`/`-edge`/`-wash` variants.
  - `theme.extend.fontSize` mirrors the `--t-*` scale so
    `text-base` resolves to 13.5px per decision 0001 rather than
    Tailwind's default 16px.
  - `theme.extend.fontFamily` sets `sans` to the Apple system
    stack and `mono` to the SF Mono stack, strictly to the values
    in decision 0001.
  - `content` globs cover `web/app/**/*.{ts,tsx}` and
    `web/components/**/*.{ts,tsx}`.
- Initialize shadcn: `npx shadcn@latest init` inside `web/`,
  accepting defaults that match the token set. Remove any
  shadcn-added color variables that conflict with our own — our
  variables win. Do **not** generate any components
  (`components/ui/` stays empty).

Verification for this milestone: `npm run dev` loads a blank page
with the paper background, ink text, and the faint ruling overlay
visible. Save a screenshot to the Progress Log.

### M4 — six-surface shell

The shell is the deliverable for every later slice. Implement it
as a client-friendly server component hierarchy (no state beyond
what Next.js gives by default — routing is the navigation).

- `web/app/layout.tsx` renders the chrome: 208px left sidebar +
  main column. Main column contains a 44px sticky header, a
  scrollable body, and a 26px footer strip. Dimensions match
  decision 0001.
- Sidebar contents:
  - brand slot at top (plain text, no logo asset)
  - project-list slot — for this slice renders a single muted row
    "还没有项目" (no state, no click behavior)
  - nav list with six items, each showing the Chinese label, a
    hand-drawn-style icon (port the icon set from the bundle's
    `primitives.jsx` as inline SVG components — keep the
    proportions and stroke weights), and a kbd chip with the
    shortcut key. Active state highlights the current route using
    amber.
  - footer meta slot — plain status text: "本地 · SQLite · 尚未
    配置备份 · DB 0KB". Values are placeholder strings for this
    slice.
- Header: breadcrumb that reads "<surface label>" for the current
  route; disabled search input (decoration); disabled "新建"
  button. No handlers wired.
- Footer strip: flat text line "AI 关闭 (v1 只预览)" plus a
  right-aligned clock slot showing the current date in `YYYY-MM-DD`
  format. Date is rendered server-side from `new Date()` — OK to
  be non-reactive for this slice.
- Six routes, each a `page.tsx` under
  `web/app/<surface>/page.tsx`, where `<surface>` is one of
  `today`, `plan`, `knowledge`, `retros`, `artifacts`, `settings`.
  Each renders a single centered `<h2>` with the Chinese label
  ("今日" / "计划" / "知识库" / "复盘" / "产出" / "设置") and a
  small muted note "本页面将在后续 slice 中落地". No skeleton,
  no fake data.
- Root redirect: `web/app/page.tsx` redirects to `/today` via
  Next.js `redirect()`.
- Keyboard shortcuts: a client component near the root (e.g.,
  `web/components/shell/KeyboardNav.tsx`) listens for `1`–`5` and
  `,` (with modifier — default to bare key for now; revisit if
  typing into inputs conflicts once inputs exist in a later slice)
  and calls `router.push('/<surface>')`. Pressing `N` or `⌘↵` is
  out of scope for this slice (no targets to create, no day to
  end).

Verification for this milestone: `npm run dev` renders the shell,
all six nav items route correctly, keyboard shortcuts work, active
state tracks the route. Screenshot each surface to the Progress
Log.

### M5 — Prisma schema covering PRD §3

Create `web/prisma/schema.prisma`:

```
generator client { provider = "prisma-client-js" }
datasource db    { provider = "sqlite"; url = env("DATABASE_URL") }
```

Models, matching PRD §3 and decision 0001 on UI-visible project
fields. Every model has `id String @id @default(cuid())`,
`createdAt DateTime @default(now())`,
`updatedAt DateTime @updatedAt` unless noted.

- `Project`: `name`, `startDate DateTime`, `endDate DateTime?`,
  `hasPlanStructure String` (enum values `"full"` / `"segments_only"`
  / `"open"` — SQLite doesn't support native enums; enforce at the
  Zod layer in M7), `status String` (enum values `"pre_start"` /
  `"active"` / `"done"` / `"paused"`). `segments`, `dailyLogs`,
  `weeklyLogs`, `knowledgeItems`, `openItems`, `blockers`,
  `bookmarks` relations.
- `PlanSegment`: `projectId`, `order Int`, `name`,
  `startDate DateTime`, `endDate DateTime`, `goals Json` (string
  array). `days` relation. `retros` relation.
- `PlanDay`: `segmentId String?`, `projectId`, `date DateTime`,
  `title`, `plannedTasks Json` (string array). The optional
  `segmentId` models the `has_plan_structure = "open"` case where
  a day belongs to a project but no segment.
- `DailyLog`: `projectId`, `date DateTime`, `whatDone Json`
  (string array), `whatSkipped Json` (string array),
  `timeSpentMinutes Int`, `tomorrowFirstThing String`,
  `honestyNote String?`. Unique composite index on
  `(projectId, date)`.
- `WeeklyLog`: `projectId`, `weekStart DateTime`,
  `reflections Json` (6-question map), `selfScores Json`. Unique
  composite index on `(projectId, weekStart)`.
- `Retro`: `segmentId`, `metrics Json`, `selfScores Json`,
  `threeQuestions Json`, `scopeChanges Json`. Unique on
  `segmentId` (one retro per segment).
- `KnowledgeItem`: `projectId String?` (knowledge can be
  project-less — confirm against PRD before implementing; current
  reading of PRD §3 binds it to a project, so keep non-null unless
  the implementation needs the null path), `type String` (enum
  `"learning"` / `"concept"` / `"bug"` / `"prompt"`), `title`,
  `slug`, `bodyMd String`, `tags Json`, `metadata Json`. Unique
  index on `(projectId, slug)`.
- `Artifact`: `ownerType String`, `ownerId String`, `kind String`,
  `urlOrPath String`, `title String?`, `note String?`. Index on
  `(ownerType, ownerId)`. **No foreign key** — this is a
  deliberate polymorphic pointer with no DB-level referential
  integrity. Decision recorded here, not a separate decision
  record.
- `OpenItem`: `projectId`, `text`, `openedAt DateTime`,
  `source String`, `status String` (enum `"open"` / `"done"` /
  `"dropped"`).
- `Blocker`: `projectId`, `text`, `openedAt DateTime`,
  `resolvedAt DateTime?`.
- `Bookmark`: `projectId`, `label`, `targetType String`,
  `targetId String`.

**UI-derived fields, NOT stored:** `today_index`, `total_days`,
`today_snapshot`, and the `stats` bag from decision 0001 are
**computed at read time** from `startDate` / `endDate` + today's
date + aggregation queries. They do not live on the `Project`
model. The later seed-CLI and Today-page slices will own those
query helpers; this slice just establishes the rule.

### M6 — first migration + smoke test

- `DATABASE_URL="file:./prisma/dev.db"` in `web/.env` (committed template
  at `web/.env.example`; `web/.env` gitignored).
- `npx prisma migrate dev --name init` from inside `web/`, which
  generates `web/prisma/migrations/<timestamp>_init/migration.sql`
  and creates `web/prisma/dev.db`. Commit the migration SQL.
- Add `vitest` + `@types/node` as dev dependencies. Configure
  `web/vitest.config.ts` with Node environment, setup file that
  loads `.env.test`, and a test glob matching
  `web/{app,lib,components}/**/*.test.ts(x)?` plus
  `web/tests/**/*.test.ts`.
- Write `web/tests/schema-roundtrip.test.ts`:
  - Before each test: point `DATABASE_URL` to a temp SQLite file
    (e.g., `file:./tmp-${Date.now()}.db`), run `prisma db push`
    (or apply migrations) against that URL, construct a fresh
    `PrismaClient` bound to it.
  - Insert one row per entity with realistic shapes (use a
    `Project` as the anchor for every FK-bearing row).
  - Query each entity back and assert core fields round-trip.
  - For `Artifact`, insert one with `ownerType = "knowledge_item"`
    and `ownerId` pointing at the `KnowledgeItem` inserted above,
    and assert the index lookup returns it. Do **not** assert
    cascade or FK behavior — there is none by design.
  - After each test: `$disconnect` and delete the temp DB file.
- This is the "smoke test". It is not an exhaustive model test;
  it is the round-trip guarantee every later slice relies on.

### M7 — Zod schemas mirroring the models

- Create `web/lib/schemas/` (one file per entity).
- Each file exports:
  - a `z.object({ ... })` matching the writable fields of the
    Prisma model (omit `id`, `createdAt`, `updatedAt`)
  - narrower enum schemas for fields that live as strings in
    Prisma — `projectStatus`, `projectHasPlanStructure`,
    `knowledgeItemType`, `openItemStatus`
  - an update schema (`.partial()` where appropriate)
- No API route yet. Just the schemas + a unit test per file
  asserting one well-formed input parses and one deliberately
  malformed input is rejected. Keep the test fixtures in the same
  file as a co-located `describe` block.
- Do **not** introduce a runtime dependency on Prisma enum types
  for these schemas — the enums live in Zod as the source of
  truth for now; Prisma's `String` columns validate through Zod
  at the boundary (per PRD §6). When Prisma adds native SQLite
  enum support or we migrate to Postgres, reconcile then.

### M8 — scripts and doc updates

- `web/package.json` scripts (add to whatever create-next-app
  generated):
  - `dev` — already present
  - `build` — already present
  - `start` — already present
  - `lint` — already present
  - `typecheck` — `tsc --noEmit`
  - `test` — `vitest run`
  - `test:watch` — `vitest`
  - `prisma:migrate` — `prisma migrate dev`
  - `prisma:generate` — `prisma generate`
  - `prisma:studio` — `prisma studio` (optional convenience)
- Update [`AGENTS.md`](../../AGENTS.md) "Current Commands" section
  to reflect reality: note that commands run from `web/`, list the
  scripts above, and remove "intended shape" hedging from the
  items that now work.
- Update [`docs/STATE.md`](../STATE.md):
  - "Current Phase" → "Scaffold landed, pre-feature". Still
    pre-dogfood.
  - "What Is True Now" → describe the running app, DB, and test
    suite.
  - "Recommended Next Step" → point at the `seed-cli` slice and
    list its anchor constraints (idempotent, dry-run flag, reads
    the yaml schema sketched in PRD §4).
- No PRD edit expected from this slice; surface one if something
  in §3 proved wrong during implementation.

### M9 — verification + close-out

Full verification before declaring the slice done:

- `cd web && npm run typecheck` — green
- `cd web && npm run lint` — green
- `cd web && npm run test` — green (includes the schema
  round-trip + every Zod unit test)
- `cd web && npm run build` — green
- `cd web && npm run dev` — manually confirm:
  - `/` redirects to `/today`
  - Each of the six tabs renders its Chinese label + placeholder
    note
  - Keyboard `1`–`5` switch tabs; `,` lands on `/settings`
  - Sidebar active state follows the route
  - Paper ruling visible on every surface
  - No italic text anywhere in the shell (inspect with browser
    devtools)
  - No Google Font network request (inspect Network tab)
- Append screenshots (Today + one other) and the command outputs
  to the Progress Log.
- Move this plan to `docs/plans/archive/scaffold-and-schema.md`
  with a closing status line and the final commit SHA.

## Verification

See M6 smoke test + M9 verification sweep. Success criteria in one
line: every later slice can assume a working `web/` Next.js app
with the six-surface shell, a migrated SQLite DB, Zod schemas at
the API boundary, and a test harness that spins up a temp DB per
test.

## Open questions

Parked, with a default so execution is not blocked:

- **`KnowledgeItem.projectId` nullability.** PRD §3 lists
  `project_id` without marking optional; decision 0001 does not
  constrain. Default: non-null. If the seed CLI or knowledge
  capture slice finds a real need for project-less knowledge,
  relax via migration.
- **Keyboard shortcut conflicts inside inputs.** The shell's
  `1`–`5` / `,` handlers will fire on bare keydown. Once any
  surface renders a real text input, we will need to guard against
  shortcuts firing while the user types. Default for this slice:
  bare key binding, no guard. Revisit when the first input lands
  (probably the end-of-day wizard).
- **Tailwind `text-base = 13.5px`.** This diverges from Tailwind's
  default 16px baseline, which breaks assumptions in copy-pasted
  component snippets from the wider Tailwind ecosystem (including
  shadcn starter code). Default: accept the divergence; decision
  0001 sets 13.5px and design density depends on it. Surface any
  shadcn component that breaks visibly in a later slice.
- **Root convenience scripts.** `scripts/dev.ps1` / `scripts/dev.sh`
  that wrap `cd web && npm run dev`. Default: skip unless trivial.
  Non-blocking.

## Progress / Decision Log

### 2026-04-21 — slice executed end-to-end in one session

- **Role switch:** human explicitly asked Claude to implement directly
  (not via Codex prompt). Acknowledged and kept the change narrow per
  `CLAUDE.md` "When The Human Asks Claude To Code Directly".
- **Codex review at M4:** before M5, human had Codex review the M1–M4
  implementation (via a PM-authored review prompt — see
  `docs/code_review.md`). Verdict: ship with minor fixes.
  - Fixed before M5: `web/prisma/migrations/dev/` noise line removed
    from root `.gitignore`; `.env.example` exempted from `web/.gitignore`
    (`.env*` narrowed to `.env`/`.env.local`/`.env.*.local`); six
    surface pages derive their title from `web/lib/surfaces.ts` via a
    new `surfaceById()` helper (strengthens the SSOT).
  - Deferred-as-expected: footer date reactivity (parked — needs client
    state anyway); `web/README.md` boilerplate cleanup (done at M8).

### Toolchain drift that forced plan-level adjustments

- **Prisma 7.7.0** removed `url` from schema-file datasources. Added
  `web/prisma.config.ts` with `dotenv/config` preload (Prisma 7 does
  NOT auto-load `.env` in config files). The schema's datasource now
  only declares `provider = "sqlite"`.
- **Prisma 7 runtime** requires a driver adapter on SQLite. Installed
  `@prisma/adapter-better-sqlite3` + `better-sqlite3` as runtime deps
  (added on top of the PM-confirmed Prisma+SQLite choice — the
  adapter is a mandatory consequence of picking Prisma 7 on SQLite,
  not a new framework choice). Also added `@types/better-sqlite3`
  (dev).
- **`web/.env` + `web/.env.example`** created at M5 (plan scheduled
  them at M6) so `prisma validate` could resolve `DATABASE_URL`
  before the migration run.
- **Next.js 16 + Tailwind v4** already landed at M3. No
  `tailwind.config.ts`: tokens defined as CSS vars in `:root` and
  exposed to Tailwind via `@theme inline` blocks in
  `web/app/globals.css`. This diverges from the plan's wording (which
  referenced `theme.extend.colors`) but matches Tailwind v4 reality.
- **Vitest 4 + in-source testing** (`includeSource`) used for the Zod
  schema tests, honoring the plan's "co-located `describe` block".
  The `import.meta.vitest` guard is resolved to `undefined` in the
  Next.js build so test code tree-shakes cleanly.

### Resolved versions as of 2026-04-21

- Next.js 16.2.4 / React 19.2.4 / Tailwind v4
- Prisma 7.7.0 / @prisma/client 7.7.0 /
  @prisma/adapter-better-sqlite3 7.7.0 / better-sqlite3 12.9.0
- Zod 4.3.6 / Vitest 4.1.4

### M9 verification (2026-04-21)

- `cd web && npm run typecheck` — green
- `cd web && npm run lint` — green
- `cd web && npm test` — 13 files, 25 tests, all green
- `cd web && npm run build` — green (all 8 routes prerendered static)
- Manual on running dev server:
  - `/` → 307 → `/today` (from dev-server logs)
  - `/today` renders "今日"; sidebar `aria-current="true"` matches
    the route
  - All 6 surfaces route correctly via keyboard `1`–`5` + `,`
  - Computed `font-family` on `body` is the Apple system stack
    (no `next/font/google`, no `<link>` to fonts.google / gstatic
    present in the DOM)
  - `document.querySelectorAll('*')` with
    `getComputedStyle().fontStyle in {italic, oblique}` returns 0
- Screenshot: the `preview_screenshot` tool hung during M9 (renderer
  stall, unrelated to the app — logs show clean 200 responses);
  `preview_inspect` + `preview_eval` used instead to verify DOM and
  computed styles. Earlier M4 screenshots (Today + Knowledge) are
  sufficient evidence for the visual layer; re-capture will happen
  naturally when the first feature slice lands.

## Change Log

- 2026-04-21: M5–M8 review follow-up aligned `DATABASE_URL` to
  `file:./prisma/dev.db`, added direct `dotenv` as a dev dependency,
  and added `20260421162000_planday-unique-day` to enforce
  `PlanDay(projectId, date)` uniqueness. `prisma migrate diff`
  generated the SQL cleanly; `prisma migrate dev` / `prisma db push`
  returned a generic Prisma schema-engine error in this Windows
  environment, so `web/prisma/dev.db` was recreated by replaying the
  committed migration SQL directly.
- 2026-04-21: Prisma 7.7 required `prisma.config.ts` + SQLite driver
  adapter; captured in Progress Log above rather than opening a
  decision record, since it is forced-by-toolchain rather than a
  product choice. Revisit only if we swap ORM.
- 2026-04-21: Six surface pages now derive their Chinese title from
  `web/lib/surfaces.ts` via a new `surfaceById()` helper. Not a scope
  change — same observable output, stronger SSOT.
