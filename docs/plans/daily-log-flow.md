# ExecPlan — daily-log-flow

**Status:** open
**Owner (impl):** Codex (to be handed off)
**Owner (PM):** Claude / human PM
**Opened:** 2026-04-21
**Target close:** 2026-04-24 (≈ 1–2 working sessions)

## Goal

After this slice lands, `/today` stops relying on empty-state copy in
its main ledger and becomes the working driving seat for the day. The
page gains four live surfaces:

1. **`今日日志` inline compose** — an inline compose card on `/today`
   for the day's `daily_log` row. Not filled today → expanded form;
   already filled → collapsed one-line summary that can re-expand for
   edits. Upsert keyed on `(projectId, date)`.
2. **`昨日之承诺` block** — reads yesterday's
   `daily_log.tomorrowFirstThing`, renders it as a read-only string
   with one adjacent action button `[记为未清账]` that creates an
   `OpenItem` row carrying that text forward. No "done / not done"
   checkmarks.
3. **`未清账` block** — lists the project's `status = "open"`
   `OpenItem` rows with inline `+ 新增` (creates a new row) and
   `[关闭]` per row (sets `status = "done"`).
4. **`阻塞` block** — lists the project's unresolved `Blocker` rows
   (`resolvedAt IS NULL`) with inline `+ 新增` and `[解除]` per row
   (sets `resolvedAt = now()`).

The existing `DrivingSeat` / `Timeline` / `FactStrip` / `最近动静`
wiring stays as-is. The fact-strip's `累计 commits` read remains
parked.

## Context

- Preceding slice:
  [`knowledge-capture-inline`](./archive/knowledge-capture-inline.md)
  closed 2026-04-21 with a narrow fix-up review cycle. `/today`
  already has live project resolution via `?project=<id>`, a sidebar
  switcher, and a populated `最近动静` feed. This slice extends the
  same per-block pattern to three more blocks and adds the
  `今日日志` compose.
- Design anchors:
  - No dedicated design prototype for the `/today` compose card.
    Visual tokens are inherited from
    [`docs/decisions/0001-design-handoff-reference.md`](../decisions/0001-design-handoff-reference.md)
    — paper-ledger aesthetic, amber-only accent, `drift = dusty
    brick` muted copy, `done = muted sage`. Compose chrome mirrors
    the knowledge-capture card: `card` class, amber top rule, 12/16
    padding.
  - `web/components/knowledge/InlineCompose.tsx` is the reference
    implementation for an inline compose client component with a
    server action submit path. This slice does not share code with
    it directly (the field shapes differ) but mirrors the shape.
- PRD anchors:
  - §3 D-3 — `daily_log` columns are fixed: `whatDone`,
    `whatSkipped`, `timeSpentMinutes`, `tomorrowFirstThing`,
    `honestyNote`. Explicitly no free-form overflow field.
  - §3 D-4 — `open_item` / `blocker` / `bookmark` are the
    driving-seat surfaces. This slice wires two of the three; the
    `bookmark` surface is deferred.
  - §1 anti-patterns — the carry-forward button is named
    `记为未清账`, not `✓ 做到了 / ✗ 没做到`, to stay on the
    non-cheerleader side of the line. The form has zero pre-fill.
    There is no "streak kept" / "great honesty!" copy.
  - §5 — v1 has **no LLM**. No suggestion chips, no AI-assisted
    anything.
  - §7 MVP item 2 — "每日 log 必须结构化"; MVP item 4 — "未清账 /
    阻塞 要能在 /today 上看到".
  - §8 acceptance — "能每天记一条 daily_log"; "/today 能展示未清账
    与阻塞"; "昨日承诺滚动展现".
- Downstream dependency: `retro-flow` will read `DailyLog` rows by
  segment range to populate the phase retro's "what actually
  happened" column. No reshape is needed — the `DailyLog` table is
  already the durable record.

### PM-confirmed choices (locked before Codex handoff)

_All confirmed by PM 2026-04-21._

1. **Input mode is `inline` only** (Q1 = B). The `今日日志` compose
   is a card at the top of `/today`'s left column. No separate
   `/today/log/new` route. Collapsed state is a one-line summary
   (`今日 · {minutes} 分 · {doneCount} 做 · {skippedCount} 跳过`); a
   small `[展开修改]` link re-expands the form. Expanded state shows
   the five PRD-fixed fields. Submit upserts on
   `(projectId, date)`.
2. **`昨日之承诺` carry-forward is a single `[记为未清账]` button**
   (Q2 = B). The button sits next to the rendered string. On click,
   the server action creates one `OpenItem` row with:
   - `text = yesterday.tomorrowFirstThing`
   - `openedAt = startOfLocalDay(today)`
   - `source = "daily_log"`
   - `status = "open"`
   
   The row immediately appears in the `未清账` block below. The
   button is **not** a "done" affordance — there is no
   `[✓ 做到了]` counterpart. If the user did it, they reference it
   in today's `whatDone` themselves. This is deliberate and covered
   by the anti-pattern check.
3. **`未清账` / `阻塞` are read + new + close only** (Q3 = B). No
   edit-text flow, no reopen flow, no filter/sort UI, no pagination.
   Each block renders an inline `+ 新增` row (one text input +
   `[添加]` button; Enter submits) and a `[关闭]` / `[解除]` button
   per row. `OpenItem` close uses `status = "done"` (not "dropped",
   which is reserved for "give up on this entirely" and is a later
   slice's UI). `Blocker` close writes `resolvedAt = now()`.
4. **`whatDone` / `whatSkipped` are chip editors.** Same shape as
   the knowledge-capture tag chip editor: `+ 一项 ↵` input pushes
   a chip on Enter; `×` removes a chip. Max 20 chips per list.
   Each chip 1–200 chars after trimming. No comma-split, no
   auto-dedupe. The list is stored as a plain string array
   (`Json`) — matches the existing `dailyLogCreate` Zod shape.
5. **`timeSpentMinutes` is a plain `number` input** with min=0,
   step=15. Placeholder `120`. No time-tracker UI, no
   start/stop — the user types their own number honestly.
6. **`honestyNote` is an optional textarea** (3 rows, compact).
   Placeholder copy `{无则留空} · 今日有什么没讲出来的?`. No
   prompt suggestions.
7. **Date semantics.** "Today" = `startOfLocalDay(new Date())` —
   reuse the existing helper in `web/lib/today/driving-seat.ts`.
   "Yesterday" = today − 1 day. No timezone config: same machine,
   same user. Yesterday-promise query is
   `DailyLog.findUnique({ projectId_date: { projectId, date:
   yesterday } })`.
8. **Empty states.**
   - No today log → compose card expanded, summary hidden.
   - No yesterday log OR yesterday log had empty
     `tomorrowFirstThing` → block body shows muted
     `昨日未留下第一件事`. Button does not render.
   - Zero open items → block body shows muted `无未清账`. `+ 新增`
     row still renders.
   - Zero active blockers → block body shows muted `无阻塞`.
     `+ 新增` row still renders.
9. **Layout.** Left column of `today-ledger`, top-to-bottom:
   (a) `今日日志` compose card, (b) `昨日之承诺`, (c) existing
   `今日 YYYY-MM-DD` (planned tasks, unchanged). Middle column
   stays `最近动静`. Right column stays `未清账` + `阻塞` (now
   populated). No other restructure.

## Constraints

### Anti-pattern check (PRD §1)

- **not a tutor** — the page renders the user's own typed strings
  and lets them type more. No canonical definitions, no "how to
  reflect" copy, no coaching prompts.
- **not a ghostwriter** — `whatDone` / `whatSkipped` start empty;
  `tomorrowFirstThing` starts empty; `honestyNote` starts empty. No
  prior-day carry-forward into today's `whatDone`. The
  `[记为未清账]` button carries an exact user-typed string from
  yesterday into `OpenItem.text` verbatim — no rewording, no
  normalization. No LLM.
- **not a cheerleader** — no streak counters, no "great honesty
  today!" copy, no done-row celebration. The `[关闭]` button fades
  the row (muted sage) per decision 0001 and removes it from the
  `status = "open"` list on next render; there is no animated check
  or colored success state. `[记为未清账]` names the debt, does not
  celebrate completion.
- **not a planner** — the form does not recommend what to do
  tomorrow, does not summarize today, does not score the day. The
  user types every content field.

Passes all four.

### Preserved invariants

- No runtime LLM. No network calls. All data comes from Prisma.
- No schema changes. This slice writes to `DailyLog`, `OpenItem`,
  and `Blocker` using the columns already shipped in the init
  migration.
- Apple system font stack, amber-only accent, drift = dusty brick,
  done = muted sage, no italics, no emoji (decision 0001).
- UI copy in Simplified Chinese; code, comments, identifiers in
  English.
- `/today` remains a server component at the page level. The
  compose card and the inline `+ 新增` rows are the only client
  boundaries in this slice; all of them take data as props and do
  no Prisma imports.
- Submit paths write through Next.js 16 server actions — no new
  API routes. Every server action validates input at the Zod
  boundary before Prisma write.
- `web/AGENTS.md` signals "This is NOT the Next.js you know";
  Codex must read `web/node_modules/next/dist/docs/` before
  writing server actions, async page components, or client
  boundaries.

### Non-goals for this slice

- No edit flow for `DailyLog` beyond same-day upsert. Past-day
  logs are not editable from `/today`.
- No past-day view (no `/today/history`, no `/today?date=…`). The
  `最近动静` block is the only window backward.
- No edit / reopen flow for `OpenItem` or `Blocker`. Write a new
  row if you mis-typed.
- No `Bookmark` UI. The schema stays unused by this slice.
- No `+ 新增` variant with type-badge, source-dropdown, or priority
  field. Text-only.
- No "link an artifact to this daily log" UI. (Artifact pointers
  are scoped to `KnowledgeItem` for now.)
- No global `N` shortcut wiring. The slice adds its own buttons.
- No population of the fact-strip's `累计 commits` / `连续写 log`
  reads. These remain `—`; they are a later Today-polish slice.
- No toast / banner confirmation. Success is conveyed by the form
  collapsing and the list refreshing.

## Surface contract (authoritative for this slice)

Render `/today` as follows, layering on top of the existing
`TodayPage` shell.

### 0. Routing & project scoping

- `/today` continues to accept `?project=<id>`. Project resolution
  via `resolveActiveProject` is unchanged.
- All four new server actions take `projectId` as an explicit
  argument (never infer from cookie or session). The page passes
  the resolved project id down via props.

### 1. `今日日志` compose card (new block)

- Placement: first child of the left `today-column`, above the
  existing `昨日之承诺` block.
- Card chrome: `card` class, top border `2px solid var(--amber)`,
  12/16 padding — mirrors the knowledge-capture compose card.
- Header row: `今日日志 · {ISO date}` left; right-aligned muted
  status: `今日还未写` (bold ink) or `今日已写 · {HH:mm 提交时间}`
  (muted).
- **State A: today has no `DailyLog` row.** Form is expanded by
  default:
  - `今天做了什么` — chip editor, autofocus, placeholder
    `+ 一项 ↵`.
  - `今天没做什么` — chip editor, placeholder `+ 一项 ↵`.
  - `用时` — number input, suffix `分钟`, placeholder `120`,
    min=0, step=15.
  - `明天第一件事` — single-line text input, placeholder
    `一句话 · 明天开工就干这个`. Required, trimmed, 1–240 chars.
  - `诚实笔记` — 3-row textarea, optional, placeholder
    `{无则留空} · 今日有什么没讲出来的?`, max 2000 chars.
  - Footer: muted `AI 不参与` (mirror the knowledge card's flipped
    copy) + `[提交]` primary button. Keyboard `⌘↵` submits.
- **State B: today already has a `DailyLog` row.** Form is
  collapsed by default into a summary line:
  `今日 · {minutes} 分 · {whatDone.length} 做 · {whatSkipped.length}
  跳过` + a `[展开修改]` text button. Click re-expands the form
  pre-filled with the existing row's values.
- Submit: `upsertDailyLog({ projectId, date: today, ...fields })`.
  On success, the card re-renders in State B (collapsed summary).
  On Zod error, card stays expanded with field-level errors in
  drift color.

### 2. `昨日之承诺 · 未结清` block (replaces empty-state)

- Heading stays `昨日之承诺 · 未结清`.
- Query: `DailyLog.findUnique({ projectId_date: { projectId,
  date: yesterday } })` where `yesterday = today − 1 day`.
- **Case A: no yesterday log OR `tomorrowFirstThing` is
  empty-string after trim.** Render muted
  `昨日未留下第一件事`. Nothing else in the block.
- **Case B: yesterday log exists and has text.** Render two rows:
  - Line 1: the `tomorrowFirstThing` string as plain serif text.
  - Line 2 (right-aligned, small): `[记为未清账]` button (muted
    outline; hover → ink border).
- Clicking `[记为未清账]` calls the server action. On success the
  block is revalidated and the button disappears once an
  `OpenItem` with `source = "daily_log"` and matching
  `text = yesterday.tomorrowFirstThing` exists for today (see
  §3 below for de-dup rule).

### 3. `未清账` block (replaces empty-state)

- Heading stays `未清账`.
- Query: `OpenItem.findMany({ where: { projectId, status: "open"
  }, orderBy: { openedAt: "desc" } })`. Cap at 50; if the project
  has more than 50 open items, render a muted footer
  `仅显示 50 条 · 先关几条再加`.
- Row rendering, top to bottom:
  - Each open-item row: `text` (serif) left + small mono date
    `MM-DD` (openedAt) + `[关闭]` button right (muted outline).
  - Empty state: muted `无未清账` in place of rows.
  - Always-present `+ 新增` row at the bottom:
    - Text input (placeholder `+ 新增未清账 ↵`, max 500 chars).
    - `[添加]` button right. Enter key also submits.
- Close action: `closeOpenItem({ id })` writes
  `status = "done"`. Row fades on re-render (muted sage).
- Add action: `createOpenItem({ projectId, text, source: "manual"
  })` — server fills `openedAt = startOfLocalDay(today)` and
  `status = "open"`.
- `记为未清账` de-dup: the server action in §2 checks whether an
  `OpenItem` with matching `(projectId, text, source: "daily_log",
  status: "open")` already exists; if yes, no-op and return
  `{ ok: true, deduped: true }`. This keeps the button idempotent.

### 4. `阻塞` block (replaces empty-state)

- Heading stays `阻塞`.
- Query: `Blocker.findMany({ where: { projectId, resolvedAt: null
  }, orderBy: { openedAt: "desc" } })`. Cap at 50, same footer
  rule as §3.
- Row rendering:
  - Each active blocker row: `text` (serif) + small mono `MM-DD`
    + `[解除]` button right.
  - Empty state: muted `无阻塞`.
  - `+ 新增` row identical to §3 (placeholder `+ 新增阻塞 ↵`).
- Resolve action: `resolveBlocker({ id })` writes
  `resolvedAt = new Date()`. Row disappears from the block on
  next render (it falls out of the `resolvedAt IS NULL` filter).
- Add action: `createBlocker({ projectId, text })` — server fills
  `openedAt = startOfLocalDay(today)` and `resolvedAt = null`.

### 5. Revalidation

- Every server action calls `revalidatePath("/today")` on success.
- `upsertDailyLog` ALSO calls `revalidatePath("/today")` — the
  `昨日之承诺` block on any future "tomorrow" depends on today's
  `tomorrowFirstThing`.
- No need to revalidate `/knowledge` from this slice.

## Milestones

### M1 — server-side data layer

- `web/lib/daily-log/queries.ts`
  - `getTodayLog(projectId, today, prisma)` →
    `DailyLog | null`.
  - `getYesterdayPromise(projectId, today, prisma)` → `{ text:
    string } | null`. Returns null if no yesterday row or empty
    trim.
  - `listOpenItems(projectId, prisma)` → up to 50 rows,
    `status = "open"`, ordered by `openedAt` desc.
  - `listActiveBlockers(projectId, prisma)` → up to 50 rows,
    `resolvedAt IS NULL`, ordered by `openedAt` desc.
  - `findCarriedForwardOpenItem(projectId, text, prisma)` →
    `OpenItem | null` for the §3 de-dup check.
- `web/lib/daily-log/actions.ts`
  - `"use server"` module. Exports:
    - `upsertDailyLog(formData)` — Zod-validates via
      `dailyLogCreate`, then `prisma.dailyLog.upsert` on
      `projectId_date`.
    - `carryForwardYesterdayPromise({ projectId })` — reads
      yesterday, guards for presence + non-empty, runs de-dup
      check, creates `OpenItem` with `source = "daily_log"`.
    - `createOpenItem({ projectId, text })` — source `"manual"`.
    - `closeOpenItem({ id })` — writes `status = "done"`.
    - `createBlocker({ projectId, text })`.
    - `resolveBlocker({ id })` — writes `resolvedAt = new Date()`.
  - Each action validates at the Zod boundary, calls
    `revalidatePath("/today")`, and returns
    `{ ok: true }` / `{ ok: false, fieldErrors }` /
    `{ ok: true, deduped: true }` as applicable.
- No new Zod schemas needed — `dailyLogCreate`, `openItemCreate`,
  `blockerCreate` already exist. Extend inline if a partial
  variant proves cleaner.
- Commit per milestone as usual.

### M2 — UI primitives

- `web/components/daily-log/DailyLogCompose.tsx` — client
  component. Holds the five-field state, submits to
  `upsertDailyLog`. Takes `initialValues: DailyLog | null`,
  `projectId`, `today: Date` as props.
- `web/components/daily-log/DailyLogSummary.tsx` — server
  component (or inline in the parent); renders the collapsed
  summary line. Clicking `[展开修改]` toggles the client wrapper.
- `web/components/daily-log/YesterdayPromiseBlock.tsx` — server
  component. Reads the query result; if present, renders the
  string + a small `CarryForwardButton.tsx` client child that
  calls `carryForwardYesterdayPromise`.
- `web/components/daily-log/OpenItemsBlock.tsx` — server; renders
  rows + the inline add row. `CloseOpenItemButton.tsx` and
  `AddOpenItemRow.tsx` are the client children.
- `web/components/daily-log/BlockersBlock.tsx` — server; same
  shape as `OpenItemsBlock` for `Blocker`.
- `web/components/daily-log/ChipEditor.tsx` — client component
  shared by `whatDone` / `whatSkipped`. Internal state array of
  strings; exposes `name` and `values` as controlled from the
  parent compose form.
- Decision: do not factor `AddOpenItemRow` and the blocker add
  row into one component for v1; their server actions differ and
  the two files are short. Revisit if dogfood shows duplication
  pain.

### M3 — page assembly

- Update `web/app/today/page.tsx`:
  - Add parallel queries to the existing `Promise.all`:
    `getTodayLog`, `getYesterdayPromise`, `listOpenItems`,
    `listActiveBlockers`.
  - Render the new `DailyLogCompose` / `DailyLogSummary` at the
    top of the left column.
  - Replace the `昨日之承诺` empty-state with
    `<YesterdayPromiseBlock>`.
  - Replace the `未清账` empty-state with `<OpenItemsBlock>`.
  - Replace the `阻塞` empty-state with `<BlockersBlock>`.
- No change to the fact-strip, the driving-seat sentence, the
  timeline, or the `最近动静` block.

### M4 — tests

- In-source unit tests (guarded by `if (import.meta.vitest)`):
  - Any small pure helpers added (e.g. collapsed-summary
    formatter, yesterday-date computation if factored out).
- Temp-DB integration tests (mirror
  `web/tests/knowledge-create.test.ts`):
  - `web/tests/daily-log-upsert.test.ts`
    - Seeds a `Project`, calls `upsertDailyLog` with full fields,
      asserts row exists.
    - Calls `upsertDailyLog` again for the same `(projectId,
      date)`, asserts update (not duplicate row).
    - Rejects malformed input (negative minutes,
      empty `tomorrowFirstThing`).
  - `web/tests/daily-log-carry-forward.test.ts`
    - Seeds a yesterday `DailyLog` with a non-empty
      `tomorrowFirstThing`, calls
      `carryForwardYesterdayPromise`, asserts one new
      `OpenItem` row with `source = "daily_log"` and the
      expected `text`.
    - Calls the action a second time, asserts no duplicate row
      (`deduped: true`).
    - Seeds a yesterday log with empty `tomorrowFirstThing`,
      asserts the action is a no-op (or returns an ok-no-row
      shape — lock the shape in the test).
  - `web/tests/open-items-actions.test.ts`
    - `createOpenItem` writes the right fields; `closeOpenItem`
      sets `status = "done"`; `listOpenItems` no longer returns
      the closed row.
  - `web/tests/blockers-actions.test.ts`
    - `createBlocker` writes the right fields; `resolveBlocker`
      sets `resolvedAt` to a non-null date;
      `listActiveBlockers` no longer returns the resolved row.
- Integration render test:
  - Extend `web/tests/today-page.test.tsx` (already exists):
    - Seed a `DailyLog` for today → `今日日志` card renders in
      collapsed summary state.
    - Seed a `DailyLog` for yesterday with
      `tomorrowFirstThing = "X"` → `昨日之承诺` renders "X" +
      the `[记为未清账]` button.
    - Seed two `OpenItem(status="open")` rows → `未清账` block
      renders both.
    - Seed one `Blocker(resolvedAt=null)` → `阻塞` block renders
      it.
    - Do NOT assert the submit flow through RTL — the direct
      server-action tests above cover correctness.

### M5 — doc sync

- `docs/STATE.md`:
  - current phase flips to "`daily-log-flow`
    implementation-complete; fresh-context review pending"
  - `What Is True Now / Repository contents` gains
    `web/lib/daily-log/`, `web/components/daily-log/`, the four
    new test files
  - `Verification Snapshot` gets the new test count
  - `Recommended Next Step` points to the review session
- No PRD change.
- No decision-record change.

## Verification

All must pass before close-out.

- `cd web && npm run typecheck` — green
- `cd web && npm run lint` — green
- `cd web && npm test` — green, new tests included
- `cd web && npm run build` — green; `/today` stays `ƒ`
  (dynamic), other routes unchanged
- Manual on `npm run dev` (preview against a seeded project):
  1. Fresh day (no today log): `/today` shows the compose card
     expanded. Submit a log; card collapses to summary; refresh
     the page — summary persists.
  2. Expand the summary via `[展开修改]`, change `用时`, submit
     again — same row is updated, not duplicated.
  3. Backdate a `DailyLog` to yesterday with
     `tomorrowFirstThing = "写完 retro plan"`; reload `/today`
     → `昨日之承诺` renders that string + `[记为未清账]`; click
     the button → a row appears in `未清账` with that text;
     click again → no duplicate.
  4. `+ 新增` a未清账 and a阻塞; close one and resolve one;
     verify they disappear from their blocks.
  5. Switch projects via the sidebar — every block should
     re-render scoped to the new project (no bleed).

## Open questions

_All PM-level open questions were resolved 2026-04-21 before
handoff; see PM-confirmed choices above. Parked items below are
intentionally deferred to later slices._

### Parked for later slices (not required for this slice to land)

- **Past-day view.** If dogfood shows a real need to see or edit
  prior-day `daily_log` rows from the UI, open a follow-up slice
  after `retro-flow`. The durable records exist in the DB.
- **`Bookmark` driving-seat surface.** Schema present, UI absent.
  Roll into a Today-polish slice post-dogfood.
- **`OpenItem.status = "dropped"` flow.** Only `"open" → "done"`
  is wired in v1. A `[放弃]` variant waits on dogfood demand.
- **Blocker severity / grouping.** Schema has no severity
  column; adding one is a schema change and a later decision.
- **`累计 commits` / `连续写 log` fact-strip reads.** These live
  in the fact-strip, not in the ledger blocks this slice touches.
  Roll into a post-dogfood Today-polish slice.
- **Global `N = 新建` shortcut.** Still parked from
  `knowledge-capture-inline`.

## Progress log

_Codex appends one entry per milestone as it lands. Keep entries
short: milestone id, commit sha, one-line outcome._

- M1 @ d9a06d5: Added daily-log queries and server actions.
- M2 @ f281e0e: Added compose and block UI primitives.
- M3 @ 43798b8: Wired daily-log surfaces into /today.
- M4 @ b6b6be8: Added daily-log action and page tests.
