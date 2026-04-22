# ExecPlan — export-json

**Status:** drafted
**Owner (impl):** Codex
**Owner (PM):** Claude / human PM
**Opened:** 2026-04-22
**Closed:** —
**Outcome:** —

## Goal

After this slice lands, the Settings page carries a functional
「导出 JSON」 button. A click downloads
`study-system-<ISO-timestamp>.json` to the browser's default
downloads folder. The file contains the eight user-authored tables
(`daily_log` / `weekly_log` / `retro` / `knowledge_item` /
`artifact` / `open_item` / `blocker` / `bookmark`) plus the
`_prisma_migrations` bookkeeping rows as a version marker, wrapped
in a flat envelope. The UI, after the download resolves, renders
one restrained line summarizing the per-table counts and the file
size. There is no CLI in this slice and no restore path. This is
the final v1 slice before the 2026-05-03 dogfood deadline.

## Context

- **Preceding slice**: [`retro-flow`](./archive/retro-flow.md) closed
  2026-04-22 at `9a52828`; fresh-context review returned `approve`.
  The local `web/prisma/dev.db` was rebuilt the same day via drop +
  rebuild (Option B); all four committed migrations apply against a
  clean DB and `/retros` renders without a Prisma error.
- **PRD anchors**:
  - §10 risk red line: currently says the v1 mitigation is
    specifically an export-JSON **CLI**. M1 of this slice amends
    that line. See the PRD edit below.
  - §1 anti-patterns: all four pass (not a tutor: outputs JSON;
    not a ghostwriter: reads user rows verbatim; not a cheerleader:
    restrained stats line, no emoji or "完成！"; not a planner:
    reads, doesn't generate).
  - §9 design handoff: the Settings page mockup at
    `docs/design/study-system/project/index.html:326` already shows
    a 「导出 JSON」 button alongside two parked buttons
    (「导入 YAML」, 「打开目录」). This slice wires up the export
    button only; the other two remain out of scope.
- **No Prisma schema change.** No migration under
  `web/prisma/migrations/`. Decision 0002's two additional
  schema-changing-slice verifier steps therefore do NOT apply to
  this slice.
- **No new npm deps.** The route handler uses the existing
  Prisma client and Next.js primitives. The client component uses
  browser-standard `Blob` + `URL.createObjectURL`.
- **Dogfood deadline 2026-05-03.** After this slice closes, v1
  is feature-complete per PRD §7 / §8.

### PM-confirmed choices (resolved before Codex handoff)

1. **Settings-only, no CLI.** The PRD §10 literal "CLI" wording is
   relaxed in M1. CLI form is v1.1 backlog; if the user ever can't
   boot `next start`, `sqlite3 dev.db .dump` is the manual fallback.
2. **Delivery mechanism: browser download.** The route handler
   returns `application/json`; the client fetches, parses for
   counts, constructs a `Blob`, and triggers a programmatic anchor
   click with `download="study-system-<ISO-timestamp>.json"`. The
   file lands in the browser's default downloads folder. No server
   writes to disk.
3. **Scope: eight user-authored tables + `_prisma_migrations`.**
   - Included: `daily_log`, `weekly_log`, `retro`,
     `knowledge_item`, `artifact`, `open_item`, `blocker`,
     `bookmark`.
   - Excluded: `project`, `plan_segment`, `plan_day` — these are
     recoverable by re-running the seed CLI against a plan yaml,
     and the user already owns the yaml separately.
   - `_prisma_migrations` rows are included under a separate
     top-level key (`schema_version`), not inside `tables`. They
     are not user content but a version marker: a future restore
     tool needs them to know whether the backup is compatible with
     the current schema.
4. **Envelope shape (flat, per-table):**

   ```jsonc
   {
     "schema_version": {
       "migrations": [
         { "id": "...", "migration_name": "...", "finished_at": "..." },
         ...
       ],
       "committed_migrations_count": 4
     },
     "exported_at": "2026-04-22T12:34:56.789Z",
     "tables": {
       "daily_log":     [ ...rows... ],
       "weekly_log":    [ ...rows... ],
       "retro":         [ ...rows... ],
       "knowledge_item":[ ...rows... ],
       "artifact":      [ ...rows... ],
       "open_item":     [ ...rows... ],
       "blocker":       [ ...rows... ],
       "bookmark":      [ ...rows... ]
     }
   }
   ```

5. **Determinism contract.** Two exports against the same DB must
   produce byte-for-byte identical JSON text. Rules:
   - Rows within each table sorted by `id` ascending (cuid lex order).
   - `schema_version.migrations` sorted by `finished_at` ascending,
     then `id`.
   - Top-level object keys written in the fixed order
     `schema_version` → `exported_at` → `tables`.
   - `tables` keys written in the fixed order listed in item 4
     above (NOT alphabetical — this order is authoritative and
     matches the schema reading order).
   - Within each row, field order matches Prisma's default (schema
     declaration order; already stable).
   - Pretty-print: 2-space indent, trailing newline, no trailing
     commas.
   - `exported_at` is the only field guaranteed to differ between
     two consecutive exports; everything else must match exactly.
   The determinism contract is tested in M4 against a fixed temp DB.

6. **No Zod on the write path.** Export reads from the DB (already
   validated at write-time) and produces a file. No boundary to
   guard. A future `import.ts` slice will layer Zod on the read
   path. In-source TypeScript types in `web/lib/export/shape.ts`
   document the envelope shape.

7. **UI feedback.** After the download resolves, the button row
   renders a single line of restrained text:

   ```
   导出 · 3 份日志 · 0 份周记 · 0 份复盘 · 0 条 knowledge · 0 个 artifact · 0 个未清账 · 0 个阻塞 · 0 个 bookmark · 文件 4.2 KB
   ```

   If the DB is empty, every count is zero and the file is still
   written (envelope is valid with empty arrays). On error, the
   line becomes:

   ```
   导出失败 · <短句原因>
   ```

   Neutral Chinese copy. No emoji. No "成功 / 完成 / 已备份" language.

## Constraints

### Anti-pattern check (PRD §1)

- **Not a tutor**: the UI shows one statistics line; the file is
  JSON; no explanatory copy is generated.
- **Not a ghostwriter**: every row is copied verbatim from the DB;
  no field is synthesized or auto-filled.
- **Not a cheerleader**: the statistics line uses nouns + numbers
  only; no 🎉/✓/完成/成功; no "太棒了". Restrained ledger tone.
- **Not a planner**: export dumps state; it does not suggest
  anything.

Passes all four.

### Preserved invariants

- No runtime LLM. No network calls outside localhost (the browser
  `fetch` to the same-origin `/api/export` endpoint).
- UI copy Simplified Chinese. File name and JSON keys English.
- `docs/decisions/0001-design-handoff-reference.md` visual system:
  no emoji, no traffic-light colors, monospace for numeric readouts.
- No Prisma schema change. No new migration. Decision 0002 extra
  verifier lines do not apply.
- No new npm dep. `@prisma/client` + built-in browser APIs only.

### Non-goals for this slice

- **No CLI.** `web/scripts/export.ts` is explicitly deferred to v1.1.
- **No restore / import path.** The envelope is designed to be
  round-trippable in principle, but ingestion is a separate slice.
- **No auto-scheduled backup.** The design mockup's "last backup ·
  2026-04-20 23:01" and "next auto-backup · tonight 23:00" copy is
  aspirational and stays mocked out.
- **No Settings page UX polish beyond this button.** The other two
  design-mocked buttons (「导入 YAML」, 「打开目录」) and the "数据库
  路径 / size" readouts are out of scope. This slice replaces the
  Settings placeholder with just enough shell to house the export
  button.
- **No encryption / password-protection of the export file.**
- **No backup history listing, no "last export" timestamp persisted
  anywhere.** Each export is ephemeral.
- **No export-progress UI.** v1 DB size is KB-scale; a plain
  "button → download" flow is fine. If a future export exceeds
  streaming-needed size, revisit.

## PRD §10 edit (M1)

Existing line 295 in `PRD.md`:

```
- **数据丢失**：本地 SQLite 需要定时备份机制（v1 至少有导出 JSON 的 CLI）
```

After M1:

```
- **数据丢失**：本地 SQLite 需要定时备份机制（v1 至少有 JSON 导出路径；
  2026-04-22 定在 Settings 页「导出 JSON」按钮，CLI 形态作为 v1.1 backlog）
```

This is the only edit to `PRD.md` in this slice. No other PRD
sections change.

## Envelope shape (authoritative for this slice)

Module: `web/lib/export/shape.ts`

```ts
export interface ExportEnvelope {
  schema_version: {
    migrations: Array<{
      id: string;
      checksum: string;
      finished_at: string; // ISO-8601, nullable-safe via null when in-progress; in practice always set after migrate deploy
      migration_name: string;
      logs: string | null;
      rolled_back_at: string | null;
      started_at: string;
      applied_steps_count: number;
    }>;
    committed_migrations_count: number;
  };
  exported_at: string; // ISO-8601 UTC
  tables: {
    daily_log: DailyLogRow[];
    weekly_log: WeeklyLogRow[];
    retro: RetroRow[];
    knowledge_item: KnowledgeItemRow[];
    artifact: ArtifactRow[];
    open_item: OpenItemRow[];
    blocker: BlockerRow[];
    bookmark: BookmarkRow[];
  };
}
```

Per-table row types mirror the Prisma-client output shape 1:1.
`DateTime` columns serialize to ISO-8601 strings via the default
`JSON.stringify` on `Date`. `Json` columns (e.g.
`dailyLog.whatDone`) pass through as already-deserialized
JavaScript objects / arrays — NOT re-stringified.

## Surface contract

- Settings page (`/settings`) replaces its current
  `PlaceholderPane` with:
  - Page head: `<h1 class="page-title">设置</h1>` (existing shell
    already provides the chrome).
  - One section titled 「数据库」 (or similar neutral label, left
    to implementer).
  - One functional button「导出 JSON」.
  - One output line below the button: initially empty; fills with
    the统计 line after export; turns into error copy on failure.
- The client component is opt-in client-side only (`"use client"`
  directive); no server action needed since the route handler is
  fine.
- New internal route: `GET /api/export` returns
  `application/json` with body = the full envelope (pretty-printed
  + deterministic per the contract above).
- No URL or query string contract for `/api/export` — it always
  exports the full DB. Future query params (e.g.
  `?since=<date>`) are not part of this slice.

## Milestones

### M1 — PRD §10 edit

- Edit the single bullet at `PRD.md` line 295 per the wording in
  the "PRD §10 edit" section above.
- No other files change in this commit.
- Commit message: `export-json M1: relax PRD §10 CLI wording`.

### M2 — Data + serializer layer

- New: `web/lib/export/shape.ts` — the `ExportEnvelope`
  TypeScript type and per-table row types (aliased from
  Prisma-client output types, not duplicated).
- New: `web/lib/export/collect.ts` — `async function
  collectExportData(prisma: PrismaClient): Promise<ExportEnvelope>`.
  Queries the eight user tables with `orderBy: { id: "asc" }` each;
  queries `_prisma_migrations` via
  `prisma.$queryRaw` (since it's not in the schema); assembles the
  envelope with a fresh `exported_at = new Date().toISOString()`.
- New: `web/lib/export/serialize.ts` — `function
  serializeExport(envelope: ExportEnvelope): string`. Uses
  `JSON.stringify(envelope, null, 2)` with the top-level keys and
  `tables` keys already pre-ordered by `collectExportData`;
  appends a trailing newline. NO custom replacer needed as long as
  the envelope is built with deterministic key order.
- In-source tests via `if (import.meta.vitest)`:
  - `shape.test.ts`-analog: type-level smoke.
  - `collect.test.ts`-analog: against a temp SQLite DB with known
    rows, confirm all 8 tables appear, rows sorted by id,
    `schema_version.committed_migrations_count` matches the
    directory count.
  - `serialize.test.ts`-analog: round-trip a fixed envelope →
    string → `JSON.parse` → deep-equal. Determinism: two serialize
    calls on the same envelope produce byte-identical strings.
- Vitest config MUST NOT exclude `lib/export/**/*.ts`. This mirrors
  the `retro-flow` post-review fix (decision 0002 referenced
  commit `d07ec1d`) and is a review-prompt check.
- Commit message: `export-json M2: data + serializer`.

### M3 — Route handler + Settings button

- New: `web/app/api/export/route.ts` — exports a `GET` handler that
  calls `collectExportData` + `serializeExport`, returns a
  `new Response(body, { headers: { "Content-Type":
  "application/json; charset=utf-8" } })`. NO `Content-Disposition`
  header — the client constructs the filename and triggers the
  download from a Blob. (Keeping the route simple also makes it
  trivially testable: hit it and JSON.parse the body.)
- New: `web/components/settings/ExportJsonButton.tsx` — `"use
  client"` component. Click handler:
  1. Set local state `status = "exporting"`.
  2. `const res = await fetch("/api/export")`.
  3. If `!res.ok`, set `status = { error: await res.text() }` and
     return.
  4. `const text = await res.text();`
  5. `const envelope = JSON.parse(text) as ExportEnvelope;`
  6. Compute per-table counts from `envelope.tables`; compute
     `bytes = new Blob([text]).size`.
  7. Build `filename = 'study-system-<ISO-timestamp>.json'`
     where `<ISO-timestamp>` is `exported_at` with `:` and `.`
     replaced by `-` for filesystem friendliness.
  8. Construct `Blob` from `text`, `URL.createObjectURL`, create
     hidden `<a>` with `download={filename}`, click, revoke URL.
  9. Set `status = { counts, bytes }`.
- New: `web/lib/export/presentation.ts` — pure formatter
  `formatExportSummary(counts: Record<string, number>, bytes:
  number): string`. Returns the neutral-Chinese统计 line.
  Formats bytes as `N B` under 1 KB, else `N.N KB` / `N.N MB` —
  `formatFileSize` helper. In-source test for edge cases.
- New: `web/app/settings/page.tsx` — replaces `PlaceholderPane`
  with:
  - `<div className="page-head"><h1 className="page-title">设置</h1></div>`
  - A single section wrapping `<ExportJsonButton />` plus its
    output line rendered inside the client component.
- No changes to `surfaces.ts` or any shell navigation.
- Commit message: `export-json M3: /api/export route + Settings button`.

### M4 — Tests

- Unit / integration:
  - `web/tests/export-collect.test.ts` — against a temp SQLite DB
    seeded with a representative row in each of the 8 user tables
    plus a mocked `_prisma_migrations` row. Asserts:
    - Envelope has exactly the expected top-level keys in the
      declared order (test via `Object.keys(envelope)`).
    - `tables` has exactly the 8 expected keys in the declared
      order.
    - Rows within each table sorted ascending by `id`.
    - `project`, `plan_segment`, `plan_day` are NOT present as keys
      in `tables` (regression guard).
  - `web/tests/export-serialize.test.ts` — determinism: build a
    fixed envelope, serialize twice, assert byte-identical strings.
    Also `JSON.parse(serializeExport(env))` deep-equals `env`.
  - `web/tests/export-presentation.test.ts` — `formatExportSummary`
    covers zero-count / single-digit / KB / MB / empty-DB cases.
- UI:
  - `web/tests/settings-page.test.tsx` — RTL renders `/settings`,
    asserts the button exists, mocks `fetch` with a fake envelope,
    clicks the button, asserts the summary line renders and the
    download-trigger side-effect was called (via a spy on
    `URL.createObjectURL`).
- Commit message: `export-json M4: tests`.

### M5 — Doc sync + close

- Update `docs/STATE.md`:
  - Current Phase: `export-json` closed at `<head>`; v1 feature-
    complete per PRD §7 / §8.
  - Repository contents: add `docs/plans/archive/export-json.md`.
  - Verification Snapshot: refresh test count + capture smoke.
  - Recommended Next Step: dogfood 2026-05-03; post-dogfood
    backlog items (v1.1 CLI form of export, Settings page UX
    polish, auto-backup scheduling, import/restore slice).
  - Deferred / Upcoming: drop `export-json`; add the three v1.1
    items above.
- Move `docs/plans/export-json.md` → `docs/plans/archive/export-json.md`
  via `git mv` to preserve rename.
- Fill in this file's `Progress log` below.
- Commit message: `export-json M5: doc sync`.

## Verification

Build-time (the standing four):

- `cd web && npm run build` — green; `/settings` continues to build
  (likely as a dynamic route now that it fetches on click;
  confirm).
- `cd web && npm run typecheck` — green
- `cd web && npm run lint` — green
- `cd web && npm test` — green; test count strictly greater than
  current 140.

Schema verifiers (decision 0002 rules 1 & 2): **not applicable.**
This slice does not change `web/prisma/schema.prisma` and does not
add a migration. `prisma migrate diff --from-migrations
prisma/migrations --to-schema prisma/schema.prisma --script
--exit-code` should remain empty and unchanged.

Git cleanliness:

- `git status` — clean after M5.

Manual smoke (`next start` against the real `web/prisma/dev.db`):

1. Open `/settings`. Page head renders as「设置」. 「导出 JSON」
   button visible and enabled.
2. Click the button. Browser shows a downloaded file named
   `study-system-<ISO-ts>.json` in the Downloads folder.
3. The summary line below the button renders, e.g. `导出 · 0 份
   日志 · 0 份周记 · ... · 文件 0.4 KB`. No 🎉 / 完成 /
   success copy.
4. Open the downloaded file in a text editor. Confirm:
   - Top-level keys in order `schema_version`, `exported_at`,
     `tables`.
   - `tables` has exactly 8 keys in the declared order.
   - File is pretty-printed with 2-space indent.
   - Migration rows are present under `schema_version.migrations`
     and match `npx prisma migrate status` output.
5. Click the button again within the same session. Download a
   second file. `diff <first> <second>` shows ONLY the
   `exported_at` line differs (everything else is byte-identical).
6. Write one daily_log entry via `/today`, return to `/settings`,
   click export. New file has exactly one row in
   `tables.daily_log`, count line shows `1 份日志`.
7. Switch projects via `ProjectListActive` and run export again;
   the exported file is full-DB (not project-scoped) — daily_logs
   from both projects appear.

The manual smoke output (a short paragraph per step) goes into the
handoff report. This slice's smoke is NOT the decision-0002
runtime probe (that rule only fires for schema-changing slices),
but it IS the user-facing correctness check before review handoff.

## Open questions

None at scoping time. Any question that comes up during
implementation escalates via the Blockers field of this document.

## Progress log

- [M1] —
- [M2] —
- [M3] —
- [M4] —
- [M5] —
