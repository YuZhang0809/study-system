# ExecPlan — seed-cli

**Status:** open
**Owner (impl):** Codex (to be handed off)
**Owner (PM):** Claude / human PM
**Opened:** 2026-04-21
**Target close:** 2026-04-23 (≈ 2 working sessions)

## Goal

After this slice lands, `cd web && npm run seed -- <path-to-plan.yaml>`
imports a plan yaml into the local SQLite DB, producing exactly the
rows sketched in PRD §4 (project + segments + days). Rerunning the
same yaml against the same DB is a no-op on user-authored tables and
a safe upsert on plan-structure tables. `--dry-run` prints the
intended inserts/updates without writing. The CLI is the only
supported path to create a project in v1; no UI import lands in this
slice.

## Context

- Preceding slice: [`scaffold-and-schema`](./archive/scaffold-and-schema.md)
  closed 2026-04-21. Prisma schema, Zod boundary, and the
  `@prisma/adapter-better-sqlite3` runtime are in place. `PlanDay`
  already has `@@unique([projectId, date])` — the CLI relies on it
  for upserts.
- PRD anchors: §4 (plan import shape + idempotency contract), §3
  (data model — only `Project` / `PlanSegment` / `PlanDay` are in
  scope for the CLI), §1 (anti-patterns).
- Downstream dependency: `today-page-skeleton` and every subsequent
  feature slice assume a project exists. The seed CLI is the only
  way to create one, so this slice unblocks the entire feature
  pipeline.
- Dogfood deadline: 2026-05-03. The 90-day plan yaml (90 days × 3
  phases) must seed cleanly before Day 1 of dogfood.

### PM-confirmed choices (resolved before Codex handoff)

1. **CLI lives at `web/scripts/seed.ts`**, invoked via
   `npm run seed -- <path> [--dry-run]`. Executed with `tsx` in dev;
   no separate build step. `tsx` is added as a dev dep.
2. **YAML parser: `yaml` (eemeli/yaml)** — 0 deps, actively
   maintained, safe-load by default.
3. **Natural keys for upsert**:
   - `Project` keyed on `name` (unique within a DB; if a second
     project happens to share the name the CLI refuses and surfaces
     the conflict).
   - `PlanSegment` keyed on `(projectId, order)`.
   - `PlanDay` keyed on `(projectId, date)` via the existing unique
     constraint.
4. **Idempotency contract** — product anchor is PRD §0 ("让你不能
   对自己的学习状态自欺"). The CLI can align the DB to the yaml, but
   it must **never silently erase evidence of drift**. Concretely:
   - Plan-structure columns on existing rows are **overwritten** from
     yaml (name, dates, goals, title, plannedTasks). Yaml is the
     authoring source of truth.
   - BUT every update must be **loud**: before writing, the CLI
     computes a diff and, for each changed `PlanSegment` /
     `PlanDay`, counts the user rows already tied to that structure
     (`DailyLog` on the same `(projectId, date)`, `Retro` on the
     same `segmentId`). The stdout report flags these specifically
     — see M3 / M4 output format. A segment-date edit that shifts
     the boundary under existing daily_logs prints as, e.g.,
     `segment order=1 UPDATE  endDate 2026-06-01 → 2026-06-15
      (touches 14 daily_logs whose phase membership will shift)`.
     Silent overwrites are a bug.
   - Rows in user tables (`DailyLog`, `WeeklyLog`, `Retro`,
     `KnowledgeItem`, `Artifact`, `OpenItem`, `Blocker`, `Bookmark`)
     are **never written** by the CLI. The CLI reads them only to
     count blast radius for the update diff.
   - Deletion: if a yaml run omits a segment or day that was present
     on a previous run, the CLI **does not delete**. It logs a
     warning listing the orphaned rows and exits cleanly. The DB's
     job is to remember what was planned, even after you change
     your mind. Deletion is a destructive action and lives outside
     this slice (future: `seed-prune` or manual DB edit).
5. **Validation flows through existing Zod schemas**
   (`web/lib/schemas/`). The yaml shape is a new composite schema
   that reuses `projectCreate` / `planSegmentCreate` / `planDayCreate`
   (minus their foreign-key fields — those are resolved by the CLI).

## Constraints

### Anti-pattern check (PRD §1)

- **not a tutor** — the CLI emits structured status text only; no
  explainer copy.
- **not a ghostwriter** — yaml is human-authored; the CLI never
  fabricates missing fields. Missing required fields fail loudly.
- **not a cheerleader** — output is `inserted N / updated M /
  skipped K`; no "done!" / emoji / encouragement.
- **not a planner** — the CLI parses a plan, it does not generate
  one. If the yaml is empty or degenerate the CLI exits with an
  error, it does not invent content.

Passes all four.

### Preserved invariants

- No runtime LLM. No network calls. The CLI runs fully offline.
- UI copy stays in Simplified Chinese; CLI stdout is **English**
  (CLI is a developer-facing tool, not end-user UI).
- `knowledge_item` / `daily_log` / `retro` / `weekly_log` /
  `artifact` / `open_item` / `blocker` / `bookmark` are out of scope
  for the seed CLI. It touches `Project`, `PlanSegment`, `PlanDay`
  only.
- No Prisma schema changes. If the CLI discovers a missing column
  or mis-modeled relation, stop and escalate to the PM layer —
  don't silently reshape the schema.

### Non-goals for this slice

- No UI for plan import (upload / preview / confirm). Still parked
  per PRD §9.
- No `--prune` / delete path.
- No multi-project yaml (one yaml file = one project).
- No seed-from-existing-DB (reverse direction — owned by the
  `export-json-cli` slice).
- No progress bar, no colored output, no TUI. Plain stdout / stderr.
- No watch mode.
- No env-var for DB path override (reads `DATABASE_URL` from
  `web/.env` through the existing `prisma.config.ts` loader).

## YAML shape (authoritative for this slice)

Schema matches PRD §4 with explicit field names. All dates are
ISO-8601 `YYYY-MM-DD`.

```yaml
project:
  name: "90 天 Agentic AI Product Builder"   # required, string, unique key
  start_date: 2026-05-03                      # required
  end_date: 2026-07-31                        # optional (null if omitted)
  has_plan_structure: "full"                  # required, one of: full | segments | open
  status: "active"                            # optional, default "active"

segments:                                     # required iff has_plan_structure ∈ {full, segments}
  - order: 1                                  # required, non-negative int, unique per project
    name: "Phase 1 - Web App 基础"
    start_date: 2026-05-03
    end_date: 2026-06-01
    goals:                                    # required, array of non-empty strings (may be empty array)
      - "跑通 Task App v1"
      - "掌握 Next.js + Prisma 基础"

days:                                         # required iff has_plan_structure == "full"
  - date: 2026-05-03                          # required, unique per project
    segment_order: 1                          # required when segments exist; references segment.order
    title: "Day 1 - 环境 & Hello World"
    planned_tasks:
      - "装 Node / VS Code / Git"
      - "create-next-app"
```

Validation rules beyond Zod defaults:

- Each `segments[i].order` is unique within the yaml.
- Each `days[i].date` is unique within the yaml and falls inside
  the project's `[start_date, end_date]` range (if `end_date` is
  set).
- Each `days[i].segment_order` matches some `segments[i].order`.
- If `has_plan_structure == "open"`, `segments` and `days` must be
  absent or empty. If `has_plan_structure == "segments"`, `days`
  must be absent or empty.
- Zod schema lives at `web/lib/seed/plan-yaml-schema.ts` and is
  tested in-source with `if (import.meta.vitest)` per the existing
  pattern.

## Milestones

### M1 — CLI entrypoint + deps

- Add dev deps: `yaml` (parser), `tsx` (runner).
- `web/scripts/seed.ts` — argv parsing (no `commander` dep;
  `process.argv` is enough for one positional + one flag).
- `package.json` script: `"seed": "tsx scripts/seed.ts"`.
- Exit codes: `0` success, `1` yaml-not-found / parse error,
  `2` validation error, `3` DB error, `4` upsert conflict
  (e.g., project name collision).
- On any non-zero exit, print a single-line summary to stderr
  followed by structured details; no stack traces unless
  `SEED_DEBUG=1` is set.

### M2 — YAML → typed plan

- `web/lib/seed/plan-yaml-schema.ts` — Zod schema composing the
  entity `Create` schemas. Date coercion matches the rest of the
  schema layer. In-source tests cover the positive path and every
  validation rule listed above.
- Parse errors from `yaml` are wrapped into a `SeedError` with the
  yaml path (line/column if the parser provides it).

### M3 — resolver + upsert + blast-radius count

- `web/lib/seed/resolver.ts` — pure function: takes the parsed yaml,
  the existing `Project` / segments / days for that project name,
  and a snapshot of user-row counts keyed by natural key, and
  returns a `SeedPlan`:

  ```ts
  type FieldDiff = { field: string; from: unknown; to: unknown };

  type SeedPlan = {
    project: {
      action: "insert" | "update" | "noop";
      data: ...;
      diffs: FieldDiff[];
    };
    segments: Array<{
      action: "insert" | "update" | "noop";
      key: { order: number };
      data: ...;
      diffs: FieldDiff[];
      userImpact: { retros: number; daysInRange: number; daysInRangeWithDailyLogs: number };
    }>;
    days: Array<{
      action: "insert" | "update" | "noop";
      key: { date: string };
      data: ...;
      diffs: FieldDiff[];
      userImpact: { dailyLogs: number };
    }>;
    orphans: {
      segments: Array<{ order: number; name: string; daysInRangeWithDailyLogs: number }>;
      days:     Array<{ date: string; title: string; dailyLogs: number }>;
    };
  };
  ```
  Pure, no DB calls — the caller (writer / dry-run) hands in the
  counts. `daysInRange` for a segment is the count of `PlanDay`
  rows whose date falls inside either the old or the new segment
  date range (the union, so a date-shift is fully reflected).
  `userImpact` is the blast-radius signal the CLI output uses to
  make drift visible per the idempotency contract above.
- `web/lib/seed/reader.ts` — DB read layer: given a project name,
  returns the current plan structure plus the user-row counts
  needed by the resolver. One query per user table, scoped to the
  project. No writes.
- `web/lib/seed/writer.ts` — applies a `SeedPlan` inside a single
  Prisma transaction. All writes go through Prisma (not raw SQL).
  Does NOT touch user tables. Asserts at the start of the
  transaction that `orphans` rows still exist and are unchanged
  (defensive — we never want to accidentally delete).
- `web/lib/seed/prisma.ts` — thin factory returning a
  `PrismaClient` configured with the `better-sqlite3` adapter,
  matching `web/tests/schema-roundtrip.test.ts`. Exposed so the
  CLI entrypoint and tests share the same setup.

### M4 — dry-run mode + blast-radius output

- `--dry-run` flag skips the writer but runs the reader + resolver.
- Output format (same shape for dry-run and live; live adds a
  summary line at the end):

  ```
  project "90 天 Agentic AI Product Builder"  UPDATE
    endDate  2026-07-31 → 2026-08-15

  segments:
    order=1  UPDATE   "Phase 1 - Web App 基础"
      endDate  2026-06-01 → 2026-06-15
      (touches 14 daily_logs whose phase membership will shift;
       touches 0 retros)
    order=2  INSERT   "Phase 2 - Agent 基础"

  days:
    2026-05-03  UPDATE   "Day 1 - 环境 & Hello World"
      title  "Day 1 - Hello World" → "Day 1 - 环境 & Hello World"
      (1 daily_log already written for this date)
    2026-05-04  INSERT   "Day 2 - ..."

  orphans (present in DB, absent from yaml — NOT touched, NOT deleted):
    segment order=3  "Phase 3 - ..."   (0 daily_logs in range)
    day     2026-07-30                 (1 daily_log already written)

  DRY RUN — no writes performed.
  ```

- Live run appends:
  `summary: inserted N / updated M / noop K / orphans K (see above)`.
- Any update that lists `(N daily_logs)` or `(N retros)` in its
  blast-radius line is the CLI making drift visible. No silent
  overwrites — if the resolver emits an `update` action without a
  matching `diffs` entry, that is a bug.
- Exit code stays `0` even when updates have non-zero user impact
  — the CLI reports, it does not gate. Gating is a later UX call.
- `SEED_DEBUG=1` env var adds the raw `SeedPlan` JSON after the
  human-readable report. Off by default to keep stdout scannable.

### M5 — tests

- Unit tests for yaml schema (M2) — valid + every rejection path.
- Unit tests for resolver (M3) — cover:
  - first run on empty DB → all inserts
  - second run on identical data → all noops
  - second run with edited segment name → one update
  - second run with added day → one insert, others noop
  - second run with removed day → one orphan entry, zero writes to
    that row
  - mismatched `segment_order` → validation error (caught at M2,
    but resolver asserts)
- Integration test at `web/tests/seed-cli.test.ts`:
  - uses a temp DB (same pattern as `schema-roundtrip.test.ts`)
  - seeds a small yaml, asserts row counts
  - re-seeds the same yaml, asserts zero change (idempotency) and
    stdout has no update lines
  - seeds a modified yaml, asserts update + orphan warning in stdout
  - **drift-visibility test**: insert a `DailyLog` row for a date
    that belongs to an existing `PlanDay`, then re-seed a yaml
    that shifts the containing `PlanSegment`'s `endDate` past that
    date. Assert:
    - the DailyLog row is unchanged
    - the segment update line in stdout contains
      `(touches N daily_logs whose phase membership will shift)`
      with `N >= 1`
  - **day-edit visibility test**: insert a `DailyLog` for
    `2026-05-03`, then re-seed with an edited title for that day.
    Assert the day update line contains
    `(1 daily_log already written for this date)`.
  - **orphan preservation test**: seed a yaml with Day 45, insert
    a `DailyLog` for Day 45, re-seed a yaml without Day 45. Assert
    the `PlanDay` for Day 45 still exists and the `DailyLog` is
    untouched; stdout orphan line shows
    `day 2026-06-16 (1 daily_log already written)`.
  - asserts user tables (DailyLog, WeeklyLog, Retro,
    KnowledgeItem, Artifact, OpenItem, Blocker, Bookmark) never
    gain or lose rows across any seed run.

### M6 — doc sync

- `AGENTS.md` "Current Commands" gains
  `cd web && npm run seed -- <path> [--dry-run]`.
- `web/README.md` quick-start gains the `seed` line.
- `docs/STATE.md` — move `seed-cli` from "Recommended Next Step" to
  "What Is True Now"; set the new next step to
  `today-page-skeleton`.
- No PRD change. The yaml shape matches PRD §4; if any drift is
  discovered during implementation, escalate to PM rather than
  silently fixing in the plan.

## Verification

All must pass before close-out.

- `cd web && npm run typecheck` — green
- `cd web && npm run lint` — green
- `cd web && npm test` — green, new tests included
- `cd web && npm run build` — green (confirms the scripts/ path
  doesn't leak into the Next.js bundle)
- Manual smoke (run against `dev.db`):
  1. Craft a 3-segment / 5-day yaml fixture.
  2. `npm run seed -- fixtures/smoke.yaml --dry-run` — prints 1
     project insert, 3 segment inserts, 5 day inserts, no orphans.
  3. Drop `--dry-run`, re-run — writes; summary line shows
     `inserted 9 / updated 0 / noop 0 / orphans 0`.
  4. Re-run without edits — prints "noop" for every row (or omits
     noops and just shows summary `inserted 0 / updated 0 /
     noop 9 / orphans 0`, either is fine as long as it's quiet).
  5. Edit one day's title, re-run — prints 1 update line with the
     field diff; rest noop.
  6. Insert a DailyLog manually for one of the segment's dates,
     then edit that segment's endDate past the DailyLog's date
     and re-run. Stdout must show the segment update line AND a
     blast-radius line mentioning the daily_log. The DailyLog
     itself is unchanged.
  7. Remove a day from yaml, re-run — prints 1 orphan with the
     daily_log count if any; 0 writes; DB still has the orphan
     row.
  8. Attempt to seed a second yaml with a different project name
     that matches nothing existing — succeeds (two projects exist).
  9. Attempt to seed a yaml whose `name` matches an existing project
     but whose `start_date` differs — succeeds (name is the key);
     log shows project UPDATE with the new start_date.

## Open questions

1. **(resolved 2026-04-21)** Idempotency on segment edits. Chosen
   rule: yaml wins on all plan-structure columns, BUT every update
   is loud — the CLI computes and reports the blast radius
   (daily_logs / retros tied to the row being changed) before
   writing. This keeps the `seed-cli` aligned with PRD §0 ("让你不
   能对自己的学习状态自欺"): the CLI can align structure, but it
   cannot silently erase evidence of drift. Captured in PM-confirmed
   choice #4 and in M3 / M4 output specs.
2. **(resolved 2026-04-21)** Orphan handling. Chosen rule: log +
   preserve. The DB's job is to remember what was planned, even
   after the yaml is edited to pretend otherwise. Deletion is a
   separate, explicit action (future `seed-prune` or manual) — it
   is never a side effect of `npm run seed`.
3. **(parked, decide after M5)** Does the CLI need a
   `--verify-yaml` mode that only validates the yaml without
   reading the DB? Probably yes for CI / pre-commit, but adds no
   user value in the dogfood window. Defer unless we hit friction.
4. **(parked)** The PRD §4 sketch mentions goals at both project
   and segment level; the current schema has goals only on segment.
   This slice does not add project.goals. If a goals column on
   Project becomes desirable, that's a future migration slice, not
   seed-cli.

## Progress Log

- 2026-04-21 — Blocker before M1 commit stream: repository is on
  `main` but has no `HEAD` commit yet (`git rev-parse --verify HEAD`
  fails). The slice can still be implemented locally, but the
  instruction "Commit per milestone on main" cannot be satisfied
  cleanly because the first commit would have to include the entire
  pre-existing repo snapshot, not just `seed-cli`. PM question: should
  Codex create a baseline repository snapshot commit before M1, or
  proceed without milestone commits for this slice and leave commit
  orchestration to the PM layer?
- 2026-04-21 — PM unblocked the commit stream: baseline snapshot
  commit created first, then `seed-cli` milestone commits resume on
  top of that `HEAD`.
- 2026-04-21 — M1 landed: added `tsx` and `yaml` as dev dependencies,
  wired `npm run seed`, and created `web/scripts/seed.ts` with
  positional-path / `--dry-run` argv parsing plus the locked exit-code
  / stderr formatting shape for later milestones to fill in.
- 2026-04-21 — M2 landed: added `web/lib/seed/plan-yaml-schema.ts`
  with snake_case yaml parsing, validation, and in-source tests.
  Import-layer translation preserves the locked yaml contract
  (`has_plan_structure: segments`) while mapping to the already-landed
  DB enum value `segments_only`; no Prisma schema change required.
- 2026-04-21 — M3 landed: added the shared Prisma factory plus
  `reader` / `resolver` / `writer` modules. Resolver is pure and now
  computes diffs, blast-radius counts, and preserved orphans against
  the normalized DB snapshot that `reader` returns.
- 2026-04-21 — **Resolved by PM:** create a baseline snapshot commit
  **before M1**. Reasons:
  (a) The `scaffold-and-schema` slice is closed per STATE.md — its
  artifacts (Next.js app, Prisma schema + migrations, Zod layer,
  six-surface shell, post-review fixes) belong in git history as a
  single coherent starting point;
  (b) per-milestone commits are the slice's durability mechanism for
  review — Codex needs a non-empty `HEAD` to diff against;
  (c) `.claude/` was added to the root `.gitignore` (tooling state,
  not project state).
  Concrete instruction: stage everything currently in the working
  tree (excluding ignored paths), create one commit titled
  `chore: baseline — scaffold-and-schema slice closed + M5–M8 fixes`
  on `main`, then proceed with M1. Per-milestone commits for
  seed-cli start from M1 as originally planned.

## Change Log

_(Empty at open. Append entries as scope shifts.)_
