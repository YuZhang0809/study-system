# ExecPlan — weekly-review-flow

**Status:** closed
**Owner (impl):** Codex
**Owner (PM):** Claude / human PM
**Opened:** 2026-04-22
**Closed:** 2026-04-22
**Target close:** 2026-04-25 — **actually closed 2026-04-22**, same
day as drafting, after M1–M5 + review-polish follow-up landed
within one working session.

## Outcome

Shipped. `/retros` now hosts the live weekly-review surface:

- Page-head `本周复盘 ⌘↵` / `修改本周 ⌘↵` primary button opens a
  single-screen modal form. Six reflection textareas (all required,
  1–2000 chars trimmed) on the left; six ink-tally segmented
  score rows (clarity / honesty / output / depth / discipline /
  energy, each 1–5) on the right. Submit upserts one `WeeklyLog`
  per `(projectId, weekStart)`.
- Modal header renders `{weekStartISO} → {weekEndISO}` only — no
  `w{n}` ordinal (plan conflict resolved 2026-04-22; ordinals live
  only on read-only list cards).
- Q4 "上周留的钩子兑现了吗?" shows a muted `上周 Q6 · {text}`
  reference line ABOVE the textarea when a previous-week log with
  `weekStart === thisWeekStart - 7 days` exists. Textarea stays
  empty on create — not ghostwriting.
- `周记` tab renders a desc-by-weekStart card list matching the
  design's `WeeklyLogList`. Empty state:
  `还没写过周记 · 右上 本周复盘 开始`.
- `阶段复盘` tab renders a placeholder `阶段复盘 · 下一刀做` card.
  Phase retro surface is owned by `retro-flow`.
- All four anti-patterns still pass.

Fresh-context review verdict: **`approve`** (after two polish items
landed in the follow-up commit `ea6c8ed`: `Sidebar.tsx`
`ProjectListFallback` is no longer an interactive `/today?project=...`
link; `WeeklyReviewModal.tsx` header no longer carries a duplicate
`取消` button — close action is footer-only, matching the Surface
contract).

### Final verification

At head `ea6c8ed`:

- `cd web && npm run build` — green; `/retros` builds as `ƒ`
  (dynamic) alongside `/today` and `/knowledge`
- `cd web && npm run typecheck` — green
- `cd web && npm run lint` — green
- `cd web && npm test` — green; 119/119 tests (+11 from the
  `daily-log-flow` 108 baseline)
- Manual smoke on `next start` preview covered all six plan items
  during implementation; re-smoke was skipped for the polish
  follow-up because the diff was display-only (fallback markup +
  modal header layout), touching no data flow, server action,
  render logic, or routing.

## Goal

After this slice lands:

1. `/retros` replaces the current `PlaceholderPane` with a live two-tab
   page (`阶段复盘` / `周记`). `阶段复盘` is a read-only placeholder
   reserved for the next slice; `周记` carries the full weekly-log
   surface.
2. The page-head carries a primary `本周复盘 ⌘↵` button. Clicking opens
   a single-screen modal form. The button label flips to
   `修改本周 ⌘↵` when the current ISO-week's `WeeklyLog` already
   exists. The modal upserts one `WeeklyLog` per `(projectId, weekStart)`.
3. The modal renders two columns: left = six reflection textareas
   (Q1–Q6, all required); right = six segmented score controls
   (clarity / honesty / output / depth / discipline / energy, each
   1–5). This is the writable version of the only-read
   `WeeklyLogList` card layout in the design.
4. Q4 ("上周留的钩子兑现了吗?") shows a muted reference line above
   the textarea containing last week's Q6 ("下周第一件事") — when a
   previous-week `WeeklyLog` exists. No pre-fill of the textarea
   itself.
5. The `周记` tab renders a desc-by-weekStart card list matching the
   design's `WeeklyLogList` shape. Empty state:
   `还没写过周记 · 右上 本周复盘 开始`.
6. The `阶段复盘` tab renders a placeholder `阶段复盘 · 下一刀做`
   card. No list, no wizard. The phase retro is `retro-flow`'s job.

Data layer: pure additions. No schema change — `WeeklyLog` already
shipped in the init migration with `@@unique([projectId, weekStart])`,
and `web/lib/schemas/weekly-log.ts` already locks the Zod boundary.
The existing `weeklyLogCreate` schema is reused as-is; the
`selfScores` `Record<string, number>` shape is narrowed at the UI
layer to the six fixed dimension keys.

Project scoping via `?project=<id>` continues to work the same way
as `/today`; `resolveActiveProject` is reused.

## Context

- Preceding slice:
  [`daily-log-flow`](./archive/daily-log-flow.md) closed 2026-04-22
  at head `60feb88` with fresh-context review `approve`. Its page-head
  `今日收工` + single modal pattern is the reference for the weekly
  entry point.
- Design anchors (authoritative):
  - `docs/design/study-system/project/src/Retros.jsx` — the two-tab
    page, page-head buttons, pill-bar, and `WeeklyLogList` card
    shape. Implementation follows the `weekly` tab path; the
    `PhaseRetroList` / `PhaseRetroWizard` paths are out of scope
    (stub as placeholder). SCORE_LABEL and METRIC_LABEL maps at the
    top of this file are the authoritative Chinese label source.
  - `docs/design/study-system/project/seed.js` — authoritative
    reflection-question copy (L187–194) and self-score dimension
    keys (L186).
  - `docs/design/study-system/project/styles.css` L827–842 — the
    `.tally` + `.tally .seg` + `.seg.on` classes for the segmented
    score visual. These classes do **not** exist in
    `web/app/globals.css` yet; add them as part of M2 using the
    design's exact rule set (`height: 10px; flex: 1; gap: 2px;
    background = paper-3 off, ink on`). No new color tokens.
  - `docs/decisions/0001-design-handoff-reference.md` — visual
    tokens. Apple system stack, amber-only accent, no italics, no
    emoji.
- PRD anchors:
  - §3 entity table — `weekly_log` columns are `id, project_id,
    week_start, reflections(JSON, 6 题), self_scores(JSON)`.
  - §3 D-3 — weekly_log is structured; no free-form `今天想说什么`
    overflow field applies here too (no `freeNote` on the weekly
    form).
  - §3 D-5 — weekly / phase-exit checklist "勾选" 不进库. This
    slice does not add any checklist column; the six reflection
    textareas are the留痕 path.
  - §1 anti-patterns — detailed check below.
  - §5 — no v1 LLM.
  - §7 MVP item 4 — "每周写 weekly_log（结构化 6 题 + 自评分)".
  - §8 acceptance — "Day 7 结束能写 weekly_log".
- Existing infrastructure to reuse:
  - `WeeklyLog` table + unique index: `web/prisma/schema.prisma`
    L91–103.
  - `weeklyLogCreate` / `weeklyLogUpdate` Zod schemas:
    `web/lib/schemas/weekly-log.ts`.
  - `resolveActiveProject`, `startOfLocalDay`, `formatIsoDate`,
    `getPrismaClient` already in place.
  - `.pillbar` + `.pill` classes already in `web/app/globals.css`
    L595–625 — reused for the tab switcher.
  - `EndOfDayEntry.tsx` pattern — mirror for the
    `WeeklyReviewEntry.tsx` client wrapper.

### PM-confirmed choices (locked 2026-04-22)

1. **Entry point = `/retros` page-head primary button**
   (PM-Q1 = α). Label `本周复盘 ⌘↵` when today's ISO-week has no
   existing log; `修改本周 ⌘↵` when it does. `⌘↵` glyph renders
   but the keyboard listener is parked (same rule as
   `今日收工`). The secondary design button `周复盘 · 向导` /
   `阶段复盘 · 向导` renders but stays **disabled** with tooltip
   `下一刀做`.

2. **Form shape = single-screen modal, no wizard** (PM-Q2 = α).
   Full-scrim modal ≈ 860 wide. Layout mirrors the read-only
   `WeeklyLogList` card: left column = six textareas stacked;
   right column = six score rows stacked. Header: `本周复盘 ·
   {weekStart ISO} → {weekEnd ISO}` (serif). Footer muted line:
   `就事论事 · 不写『这周感觉怎样』这种自由文本`. Primary submit:
   `提交本周 ⌘↵`.

3. **Score control = 5-cell segmented per dimension** (PM-Q3 = α).
   One row per dimension: left label (mono caps, SCORE_LABEL
   Chinese — see §Context), middle 5-button segmented bar using
   `.tally` + `.tally .seg` + `.seg.on` classes, right mono
   numeric value. Clicking a segment sets that dimension's score
   to that index + 1 (1–5). Keyboard: arrow-left / arrow-right
   moves within the row when focused; space / enter selects the
   focused segment. Each row is keyboard-labeled via
   `aria-labelledby`.

4. **Q4 references last week's Q6** (PM-Q4 = yes).
   Server reads `getPreviousWeekLog(projectId, thisWeekStart)`
   which requires the previous log's `weekStart ===
   thisWeekStart - 7 days` (not "any recent one"). If such a log
   exists, render a muted reference line **above** the Q4
   textarea: `上周 Q6 · {previousLog.reflections.q6}`. The
   textarea itself stays empty. If no such log exists, do not
   render the line.

5. **Phase tab = placeholder for this slice** (PM-Q5 = α).
   Tab still renders; pill bar still shows it; clicking it
   switches `?tab=phase`. Its body renders a single card:
   `阶段复盘 · 下一刀做`. No list, no wizard. `retro-flow` will
   fill it.

6. **All six reflection questions are required** (PM-Q6 = α).
   Validation at the UI layer: each q1..q6 is 1–2000 chars after
   trim. Empty or whitespace-only fails client-side **and** at
   the Zod boundary — strengthen `weeklyLogCreate.reflections`
   from `z.string()` to `z.string().trim().min(1).max(2000)` per
   field during M1. Zod error copy stays neutral, e.g.
   `这一题不填,就写『没有』或『跳过本周』,但别空着`.

7. **Week boundary = ISO Mon–Sun, local time** (PM-Q7 = α).
   `weekStart = Monday of the week containing
   startOfLocalDay(new Date())`. `weekEnd = weekStart + 6 days`.
   Presentation helper `isoWeekStart(date: Date): Date` lives in
   `web/lib/weekly-log/presentation.ts` with in-source Vitest
   coverage for Monday boundary, Sunday boundary, week
   containing a DST crossing, and New-Year rollover.

## Constraints

### Anti-pattern check

- **not a tutor** — the modal only renders the user's own typed
  reflections and lets them type more. The Q4 reference line
  shows the user's own prior Q6, not a definition or hint.
- **not a ghostwriter** — no pre-fill of any textarea. Q4's
  reference line is a separate muted element **next to** the
  textarea, not inside it. Zero LLM, zero network, zero
  system-generated body text.
- **not a cheerleader** — modal submit closes without toast,
  confetti, or congratulatory copy. Tally segments are
  ink-colored "on" (factual mark, matching daily-log's step 1
  check-through). The weekly card list shows `提交于 {timestamp}`
  — a neutral audit line, not an accomplishment banner.
- **not a planner** — modal does not recommend a score, does not
  summarize the week, does not score the user. Q6's prompt
  ("下周第一件事") is a user-authored answer slot, not a
  system suggestion.

Passes all four.

### Preserved invariants

- No runtime LLM. No network calls. All data comes from Prisma.
- No schema change. `WeeklyLog` is used as shipped; `@@unique`
  constraint drives the upsert path.
- Apple system font stack, amber-only accent, drift = dusty
  brick, done = muted sage, no italics, no emoji.
- UI copy in Simplified Chinese; code, comments, identifiers in
  English.
- `/retros` remains a server component at the page level. Client
  boundaries in this slice: `WeeklyReviewEntry.tsx` (page-head
  wrapper), `WeeklyReviewModal.tsx` (modal), `WeeklyScoresRow.tsx`
  (score segments). `WeeklyLogCard.tsx` is pure render — keep it
  server-safe (no `"use client"`). None import Prisma.
- Submit writes through Next.js 16 server actions — no new API
  routes. Every action validates at the Zod boundary.
- `web/AGENTS.md` signals "This is NOT the Next.js you know";
  Codex must read `web/node_modules/next/dist/docs/` before
  writing server actions, async page components with
  `searchParams`, or client boundaries.

### Non-goals for this slice

- No phase retro surface (list or wizard). Placeholder only.
- No past-week edit flow (only the current ISO-week is editable
  via the page-head button; older logs render read-only in the
  list).
- No per-week `week_n` ordinal surfaced in the modal header (the
  design card list uses `第 N 周`; compute it at card render time
  from `(weekStart - project.startDate) / 7 + 1`, floor). Render
  it as a small mono tag on each list card; don't let it leak
  into the modal header, where the date span is clearer for the
  author.
- No `selfScores` key extensibility UI. The six dimension keys
  are fixed at the UI layer; the Zod schema's open `Record`
  shape is unchanged.
- No `reflections` text formatting (markdown / rich text). Plain
  textarea; preserve newlines on render but no HTML parsing.
- No weekly reminder / notification.
- No `/today` driving-seat hook for last-week Q6. (Later Today
  polish slice.)
- No global `W` keyboard shortcut. Button is clickable only.
- No delete / archive of weekly_logs.
- No multi-project comparison.
- No tab default preference persistence (default tab for this
  slice is `?tab=weekly`; documented below).

## Surface contract (authoritative)

### 0. Routing & project scoping

- `/retros` accepts `?project=<id>` (same semantics as `/today`)
  and `?tab=weekly|phase` (default `weekly` in this slice — will
  flip back to design-default `phase` in `retro-flow`).
- `searchParams` is a `Promise` per Next.js 16. Await it inside
  the page component. Use the same `getSearchParam` helper
  pattern currently in `web/app/today/page.tsx`.
- Server actions take `projectId` and `weekStart` explicitly.

### 1. Page-head

- Title: `复盘` (matches design L23).
- Subtitle (mono caps + num):
  `{phaseRetroCount} 份阶段复盘 · {weeklyLogCount} 份周记`.
  `phaseRetroCount` is `0` until `retro-flow` ships; keep the
  subtitle copy identical to the design anyway.
- Right-aligned button group:
  - `阶段复盘 · 向导` — **disabled**, tooltip
    `下一刀做`. Rendered to match design parity. No click
    handler.
  - `本周复盘 ⌘↵` (primary) or `修改本周 ⌘↵` — depends on
    whether `getWeeklyLog(projectId, thisWeekStart)` returns a
    row. Clicking opens the modal.

### 2. Pillbar (tab switcher)

- Below page-head, matches design L37–44.
- Two pills: `阶段复盘 · {phaseCount}` and `周记 · {weeklyCount}`.
- Each pill is an `<a>` wrapping `?tab=...&project=...` — server
  navigation, no client state.
- `aria-selected` reflects the current tab from `searchParams`.

### 3. Phase tab body

- Single card with copy `阶段复盘 · 下一刀做`.
- Centered mono caps, muted. No placeholder chrome beyond that.

### 4. Weekly tab body

- Case A — `weeklyLogs.length === 0`:
  muted empty-state line `还没写过周记 · 右上 本周复盘 开始`.
- Case B — non-empty: render `weeklyLogs` desc by `weekStart` as
  stacked cards per design L271–301. Each card:
  - Header row: serif `第 N 周` + mono ink-3
    `{weekStart ISO} → {weekEnd ISO} · 提交于 {createdAt local
    datetime, format "YYYY-MM-DD HH:mm"}`.
  - Grid `1.4fr 1fr`:
    - Left: six Q/A pairs. Each pair: mono caps ink-3
      `Q{n} · {QUESTION_COPY[n]}`, then serif answer with
      `white-space: pre-wrap` to preserve newlines. Top dashed
      rule between pairs (none on first).
    - Right: `BlockLabel` `自评` + six score rows. Row shape:
      90px label (mono caps ink-3, `SCORE_LABEL[key]`) + tally
      bar (5 seg, `on` count = score) + 24px mono num.
  - Read-only. No edit handler at this level. (To edit, user
    clicks `修改本周` on the current week; older weeks are
    archived.)

### 5. Modal (client component `WeeklyReviewModal.tsx`)

- Props: `projectId`, `weekStart: Date`, `weekEnd: Date`,
  `existingLog: { reflections: {...}, selfScores: Record<string,
  number> } | null`, `previousWeekQ6: string | null`,
  `onClose(): void`.
- Scrim: full-viewport, `rgba(ink, 0.5)` or existing scrim token.
  Click-outside closes without saving. Esc closes without saving.
- Card shell: max-width 860, `.card` class, padding per design.
- Header row:
  - Left: caps muted `复盘 · 本周`.
  - Right: serif `{weekStartISO} → {weekEndISO}`. **No week ordinal
    / no `w{n}` suffix** — the ordinal lives on the read-only
    list cards only (see §Non-goals + §4 case B). Rationale: for
    the author, the date span is clearer than `w4`; this is a
    deliberate divergence from the daily-log wizard's
    `daily_log · d{day_index}` pattern.
- Body grid `1.4fr 1fr` gap 24:
  - Left column — six stacked textareas:
    - Each field: `Q{n} · {QUESTION_COPY[n]}` label (mono caps
      ink-3) + 3-row textarea (grows to content, max 8 rows).
    - For `n === 4`, if `previousWeekQ6` is non-null render a
      muted reference line **between** label and textarea:
      `上周 Q6 · {previousWeekQ6}` (italic-free, mono ink-3,
      wraps). Textarea stays empty / pre-filled from
      `existingLog.reflections.q4` if editing.
    - Validation on submit only: each q1..q6 must be 1–2000
      chars trimmed. Inline error renders below the textarea
      in drift color with the neutral copy from PM §6.
  - Right column — six stacked score rows:
    - One `WeeklyScoresRow` per key, order:
      `clarity / honesty / output / depth / discipline / energy`.
    - Label = `SCORE_LABEL[key]`, e.g. `清晰度`.
    - Row body: 5 buttons in a `.tally` container. Button
      `i` (0-indexed) has class `.seg` + `.on` if
      `score >= i + 1`. `aria-label=`{SCORE_LABEL[key]} {i+1}`.
    - Current value mono to right of the tally.
    - Default value when creating new: `null` (no segment on).
      Submit requires every row to have 1–5. Inline error
      (drift) if unset.
    - When editing existing log: seed from
      `existingLog.selfScores[key]` if present; otherwise
      `null`.
- Footer row:
  - Left muted line from PM §2.
  - Right:
    - `[取消]` — ghost, closes without saving.
    - `[提交本周 ⌘↵]` or `[保存修改 ⌘↵]` — primary, triggers
      the submit action.
- Submit:
  - Client assembles `{ projectId, weekStart, reflections: {q1..q6},
    selfScores: {clarity..energy} }`.
  - Calls `upsertWeeklyLog` server action.
  - On `{ ok: true }`, close modal; `revalidatePath("/retros")`
    refreshes the page and flips the page-head button label.
  - On `{ ok: false, fieldErrors }`, keep modal open, surface
    errors inline, focus first errored field.

### 6. Revalidation

- `upsertWeeklyLog` calls `revalidatePath("/retros")`. No other
  paths need revalidation. `/today` does not depend on
  `WeeklyLog` in this slice.

## Milestones

### M1 — data layer

- New directory `web/lib/weekly-log/`:
  - `presentation.ts` — `isoWeekStart(date): Date` (Monday at
    local midnight), `isoWeekEnd(weekStart): Date` (Sunday),
    `weekIndexWithinProject(projectStartDate, weekStart):
    number` (1-based; floor of `(weekStart - projectStart) / 7`
    + 1; returns 1 even if `weekStart < projectStart`, so card
    render is always defined). In-source Vitest cases guarded
    by `if (import.meta.vitest)` covering: Mon input, Sun
    input, mid-week input, year rollover, DST-crossing week.
  - `queries.ts` — `getWeeklyLog(projectId, weekStart, prisma)`
    (unique lookup), `listWeeklyLogs(projectId, prisma)` (desc
    by weekStart, all), `getPreviousWeekLog(projectId,
    thisWeekStart, prisma)` (unique lookup against
    `thisWeekStart - 7 days`, returns `null` if missing).
  - `actions.ts` — `upsertWeeklyLog(input:
    WeeklyLogCreateInput)` `"use server"` module. Validates
    via the strengthened `weeklyLogCreate`, upserts on the
    composite unique, returns
    `{ ok: true } | { ok: false, fieldErrors: Record<string,
    string[]> }`. Calls `revalidatePath("/retros")` on
    success.
- Strengthen `web/lib/schemas/weekly-log.ts`:
  - `reflections` from `{ q1: z.string(), ... }` to
    `{ q1: z.string().trim().min(1).max(2000), ... }` for q1..q6.
  - `selfScores` stays open-keyed at the schema layer (UI
    narrows to the six). Keep the existing in-source test and
    add a case asserting the trim/min rejection.
- Commit: `weekly-review-flow M1: data-layer for weekly log`.

### M2 — UI primitives

- New directory `web/components/weekly/`:
  - `WeeklyReviewEntry.tsx` (client) — mirrors
    `EndOfDayEntry.tsx`. Renders the `阶段复盘 · 向导`
    disabled button, the primary `本周复盘` /
    `修改本周` button, and mounts `<WeeklyReviewModal>` when
    open.
  - `WeeklyReviewModal.tsx` (client) — scrim + card + body grid
    + footer per Surface §5. Owns full form state. Calls
    `upsertWeeklyLog` on submit.
  - `WeeklyScoresRow.tsx` (client) — one dimension row per
    Surface §5. 5-button tally, keyboard a11y, `aria-labelledby`.
  - `WeeklyLogCard.tsx` — server-safe render of one read-only
    card per Surface §4, case B. Pure props.
- New CSS in `web/app/globals.css` at the end of the file —
  copy the design's `.tally` + `.tally .seg` + `.seg.on`
  rules verbatim (styles.css L827–842). Don't add `.seg.drift`
  or `.seg.today` — those are unused in this slice; keep CSS
  surface minimal.
- Commit: `weekly-review-flow M2: weekly modal + tally primitives`.

### M3 — /retros page rework

- Replace `web/app/retros/page.tsx` with a server component
  that:
  - Accepts `{ searchParams: Promise<Record<string, string |
    string[] | undefined>> }`.
  - Awaits searchParams; reads `project` and `tab`
    (default `"weekly"`).
  - Resolves the active project via `resolveActiveProject`
    (reused from /today).
  - Renders the empty-state (`还没有项目 · 跑 npm run seed
    导入一个计划`) branch when no project exists.
  - Computes `today = startOfLocalDay(new Date())`,
    `thisWeekStart = isoWeekStart(today)`,
    `thisWeekEnd = isoWeekEnd(thisWeekStart)`,
    `previousWeekStart = thisWeekStart - 7d`.
  - In `Promise.all`: `existingLog = getWeeklyLog(...)`,
    `previousLog = getPreviousWeekLog(...)`,
    `weeklyLogs = listWeeklyLogs(...)`, `phaseRetroCount = 0`
    (hardcoded until `retro-flow`).
  - Renders the page-head, pillbar, tab body per Surface §1–§4.
  - Passes `existingLog`, `previousWeekQ6 =
    previousLog?.reflections?.q6 ?? null`, `thisWeekStart`,
    `thisWeekEnd`, `projectId` into `<WeeklyReviewEntry>`.
- Commit: `weekly-review-flow M3: live /retros page + weekly tab`.

### M4 — tests

- New `web/tests/weekly-log-upsert.test.ts`:
  - Creates a temp SQLite DB via the existing test harness.
  - Case: upsert creates a new row when none exists for
    `(projectId, weekStart)`; scores / reflections persisted
    correctly.
  - Case: upsert updates an existing row (second call with
    same key overwrites fields; `createdAt` stable,
    `updatedAt` changes).
  - Case: missing `weekStart` → `{ ok: false, fieldErrors }`.
  - Case: empty q3 (whitespace only) → `{ ok: false,
    fieldErrors.reflections.q3 }` after M1's schema tightening.
  - Case: `selfScores.clarity = 6` → rejected.
- New `web/tests/retros-page.test.tsx`:
  - Renders `/retros` with no project → empty-state copy.
  - Renders `/retros` with a seeded project but no weekly
    logs → page-head `本周复盘` button + empty-state line.
  - Renders `/retros` with one previous weekly log and no
    current-week log → pagehead still `本周复盘` (current
    week empty); weekly tab shows one card.
  - Renders `/retros` with a current-week log → pagehead shows
    `修改本周`.
  - Renders `?tab=phase` → phase placeholder card visible.
  - Does NOT drive the modal through RTL. Modal behavior is
    covered by the action test above and by manual smoke.
- In-source `isoWeekStart` tests from M1 should be picked up
  automatically by Vitest's `includeSource`.
- Commit: `weekly-review-flow M4: weekly log tests`.

### M5 — doc sync

- `docs/STATE.md`:
  - Flip current phase to "`weekly-review-flow` implementation
    complete; fresh-context review pending".
  - Add weekly-log files to `Repository contents`.
  - Refresh `Verification Snapshot` with the new test count.
  - Point `Recommended Next Step` at the fresh-context review.
- No PRD change. No decision-record change.
- Commit: `weekly-review-flow M5: doc sync`.

## Verification

All must pass before review hand-off. Run verifier order
`build → typecheck → lint → test` to sidestep the Next.js 16
`.next/types/routes.js` artifact noted in STATE.md Known Open
Questions.

- `cd web && npm run build` — green; `/retros` becomes dynamic
  (`ƒ`); other routes unchanged.
- `cd web && npm run typecheck` — green.
- `cd web && npm run lint` — green.
- `cd web && npm test` — green; Codex reports the count delta
  from 108.
- Manual smoke on `next build` + `next start` preview (dev port
  may be held; fall back to `next start`):
  1. Seeded project, no weekly logs. Open `/retros`. Tab
     defaults to `weekly`. Empty-state line renders. `本周复盘`
     primary button visible.
  2. Click `本周复盘`. Modal opens; header shows current-week
     span. Q4 has no reference line (no previous week yet).
     Leave q3 empty, submit → inline error, modal stays open.
     Fill all six + all six scores → submit. Modal closes;
     `/retros` reloads; weekly tab now has one card; page-head
     shows `修改本周`.
  3. Click `修改本周`. Modal reopens with all fields
     pre-filled. Change clarity score from 3 to 4; submit;
     card updates, only one row still.
  4. Backdate a WeeklyLog to last week with `q6 = "跑 benchmark"`.
     Reload `/retros`. Click `本周复盘`. Q4 shows
     `上周 Q6 · 跑 benchmark` reference line above the textarea.
     Textarea is empty.
  5. Switch to `?tab=phase`. Placeholder card visible. No
     button state leaks.
  6. Switch project via sidebar; list and button states
     rerender scoped to the new project, no bleed.

## Open questions / parked

All PM-level questions were resolved 2026-04-22; parked items
below are intentional follow-up.

- **Phase retro tab** — full surface owned by the next slice
  (`retro-flow`). Placeholder here.
- **`/today` hook for last-week Q6** — future Today-polish
  slice. Not blocking weekly write.
- **Global keyboard shortcut** for 本周复盘 — parked with the
  rest of the shortcut system (`N` / `⌘↵` / tab digits).
- **Weekly reminder / notification** — out of v1.
- **Weekly-log edit for older weeks** — only current week is
  writable via page-head. Older weeks render read-only.
  Revisit if dogfood shows friction.
- **Default tab preference** — defaulted to `weekly` in this
  slice; `retro-flow` revisits whether to flip back to phase.
- **Multi-project rollups** — out of v1.
- **Week-n ordinal in the modal header** — intentionally not
  rendered; date span is clearer for the author than `w4`.
  Card list still shows `第 N 周`.

## Progress log

_Codex appends one entry per milestone as it lands. Keep entries
short: milestone id, commit sha, one-line outcome._

- M1 · `a94db53` · Added weekly schema tightening, ISO-week helpers, weekly queries, and the weekly upsert action.
- M2 · `8e950b9` · Added weekly modal/card primitives, shared weekly copy, tally CSS, and neutral validation copy.
- M3 · `144a4e3` · Replaced `/retros` with the live weekly tab and phase placeholder.
- M4 · `9204812` · Added weekly action tests and `/retros` rendering tests.
- M5 · self-sha reported in handoff · A commit cannot embed its own hash without a follow-up mutation; the M5 sha is reported in the final handoff instead of here.
