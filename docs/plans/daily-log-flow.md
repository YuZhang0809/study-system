# ExecPlan — daily-log-flow

**Status:** open (direction change 2026-04-22 — rework in flight)
**Owner (impl):** Codex
**Owner (PM):** Claude / human PM
**Opened:** 2026-04-21
**Target close:** 2026-04-25 (≈ 1 more working session on top of
the 355e704 baseline)

## Change log

- **2026-04-21** — Plan drafted (v1). Codex landed M1–M4 at head
  `355e704` (107 tests green). Shape: inline compose card on
  `/today` left column, `[记为未清账]` carry-forward button on
  `昨日之承诺`, `+ 新增` + `[关闭]` / `[解除]` on 未清账 / 阻塞.
- **2026-04-22** — PM direction change. Design prototypes
  `docs/design/study-system/project/src/EndOfDay.jsx` +
  `Today.jsx` were **not read** before v1 drafting. The product
  intent per design is a **four-step wizard modal** triggered by
  a top-right `今日收工 ⌘↵` button, not an inline card; the
  `昨日之承诺` block is **read-only** (no carry-forward button —
  the flow-forward happens inside wizard step 2). This plan is
  now v2: the data layer and OpenItem/Blocker write UX survive;
  the compose surface and `[记为未清账]` path are superseded.
  Milestones M5–M8 below carry the rework. M1–M4 Progress log is
  preserved at the bottom for git history alignment.

## Goal (v2)

After this slice lands, `/today` gains:

1. A top-right `今日收工 ⌘↵` primary button that opens a four-step
   `EndOfDay` wizard modal. On final submit, the wizard upserts
   one `DailyLog` row per `(projectId, date)`.
2. Step 1 ("做了什么") pre-populates from today's
   `PlanDay.plannedTasks` as a checklist. Checked rows → `whatDone`;
   unchecked rows → `whatSkipped`. User can add off-plan rows via
   `+ 加一条(计划外的也写上)`.
3. Step 2 ("偏离") is a text-only list (no reason field, per
   PM-Q2). Pre-filled with one row = yesterday's
   `tomorrowFirstThing` if yesterday's log exists and its text is
   non-empty. All entries append to `whatSkipped` on submit.
4. Step 3 ("时间") is a number input + quick-preset chips
   (`30 / 60 / 90 / 120 / 150 / 180 / 240`). No analytics
   (7-day average / median are parked per PM-Q4).
5. Step 4 is `明日第一件事` (required) + optional `诚实便签`.
6. `昨日之承诺` block becomes **read-only**: renders yesterday's
   `tomorrowFirstThing` + muted `未兑现` label. No button, no
   carry-forward action. The forward-flow happens via wizard
   step 2 (pre-population) or via `未清账` `+ 新增` (manual).
7. `未清账` + `阻塞` blocks keep `+ 新增` inline row + per-row
   `[关闭]` / `[解除]` (PM-Q3 γ: explicit deviation from design,
   which shows these blocks as read-only — reason documented in
   the anti-pattern check below).
8. Top-right `+ 记一条 N` button is rendered but **inert** (global
   `N` shortcut stays parked from `knowledge-capture-inline`).

The existing `DrivingSeat` / `Timeline` / `FactStrip` / `最近动静`
wiring stays as-is. The fact-strip's `累计 commits` /
`连续写 log` reads remain parked.

## Context

- Preceding slice:
  [`knowledge-capture-inline`](./archive/knowledge-capture-inline.md)
  closed 2026-04-21. `/today` has live project resolution via
  `?project=<id>`, a sidebar switcher, and a populated `最近动静`
  feed.
- v1 implementation (355e704) stands on top of the above. This v2
  plan reshapes the v1 compose surface but keeps everything else.
- Design anchors (**both are authoritative**):
  - `docs/design/study-system/project/src/EndOfDay.jsx` — the
    four-step wizard. Implementation target is the
    `EndOfDayWizard` function only; the sibling `EndOfDaySingle`
    (single-page variant) is a Tweaks-axis alternative and is
    explicitly dropped for v1 (same rule as
    `knowledge-capture-inline`: Tweaks axis is out for v1).
  - `docs/design/study-system/project/src/Today.jsx` — layout is
    the `"ledger"` variation (the `stacked` and `column`
    variations are also Tweaks-axis alternatives, dropped).
    Today.jsx is the source for the top-right
    `今日收工 ⌘↵` + `+ 记一条 N` button pair and the
    `TodayBlockPromises` (read-only) shape.
  - [`docs/decisions/0001-design-handoff-reference.md`](../decisions/0001-design-handoff-reference.md)
    — visual tokens. Card chrome, amber accent, `drift = dusty
    brick`, `done = muted sage`, `check`/`check--done`/`check--drift`
    classes, no italics, no emoji.
  - `web/components/knowledge/InlineCompose.tsx` — reference for
    the client-component + server-action pattern; the wizard
    mirrors the same boundary (no Prisma in client, submit via a
    `"use server"` module).
- PRD anchors:
  - §3 D-3 — `daily_log` columns are fixed. The wizard's four
    steps map to the same five columns:
    `whatDone` (step 1 checked + step 1 added), `whatSkipped`
    (step 1 unchecked + step 2 entries), `timeSpentMinutes`
    (step 3), `tomorrowFirstThing` (step 4a), `honestyNote`
    (step 4b). No new columns.
  - §3 D-4 — `open_item` / `blocker` are the
    driving-seat surfaces. `/today` wires both with
    create+close/resolve per PM-Q3 γ.
  - §1 anti-patterns — detailed re-check below.
  - §5 — no v1 LLM.
  - §7 MVP item 2 — "每日 log 必须结构化"; MVP item 4 — "未清账 /
    阻塞 要能在 /today 上看到".
  - §8 acceptance — "能每天记一条 daily_log"; "/today 能展示未清账
    与阻塞"; "昨日承诺滚动展现".
- Downstream dependency: `retro-flow` reads `DailyLog` by segment
  range. No reshape needed.

### PM-confirmed choices (v2 — locked 2026-04-22)

_Supersedes v1 choices 1–9. Numbering restarts._

1. **Input mode is the four-step wizard** (PM-Q1 = confirmed).
   Trigger: top-right `今日收工 ⌘↵` primary button on `/today`'s
   page-head. Click opens a full-scrim modal (width ≈ 760 per
   design). Esc closes without saving. Click-outside the modal
   card also closes without saving. Step breadcrumb renders all
   four titles across the top; past steps carry a muted check
   mark (`done` color per decision 0001). Footer has `← back`
   (disabled on step 1) and `next →` (steps 1–3) / `Commit log
   ⌘↵` (step 4).
   If today already has a `DailyLog`, the button label flips to
   `修改今日 ⌘↵` and the wizard opens with existing values
   pre-filled.

2. **`昨日之承诺` block is read-only** (Q2 revised). Render
   yesterday's `tomorrowFirstThing` string with a muted `未兑现`
   drift label (right-aligned). No button. No carry-forward
   affordance. If the user wants the text tracked as debt, they
   either (a) edit / keep it in wizard step 2 when they 收工, or
   (b) type it into `未清账 + 新增` row manually.

3. **`未清账` / `阻塞` keep `+ 新增` + `[关闭]` / `[解除]`**
   (PM-Q3 = γ). **Deviation from design** (which shows these as
   read-only). Reason: the design leaves OpenItem / Blocker
   lifecycle unspecified; v1 needs a concrete, testable write
   path for dogfood. Behavior: inline text-only add row per
   block (Enter or `[添加]` submits); per-row `[关闭]` sets
   `OpenItem.status = "done"`; per-row `[解除]` sets
   `Blocker.resolvedAt = now()`. `status = "dropped"` stays
   parked. No edit / reopen flow.

4. **Step 1 checklist source = today's `PlanDay.plannedTasks`.**
   For each planned task, render one unchecked row. The
   `+ 加一条(计划外的也写上)` row appends a user-typed entry
   that defaults to **checked** (post-hoc capture = presumed
   done). If today has no `PlanDay` row, step 1 opens with just
   the add row. If `plannedTasks` is an empty array, same.

5. **Step 1 output mapping.** On submit:
   - Every row whose check box is TRUE → text → `whatDone[]`
     (trimmed).
   - Every row whose check box is FALSE → text → `whatSkipped[]`
     (trimmed).
   - Step 2 entries append to `whatSkipped[]` after step 1
     contributions.
   - No auto-dedup across step 1 unchecked + step 2 entries.
   - Each row's text is 1–200 chars after trim; empty rows
     silently dropped.

6. **Step 2 has NO reason field** (PM-Q2 = no). Each step-2 row
   is a single text input. Pre-populated state:
   - If yesterday's daily_log exists AND
     `yesterday.tomorrowFirstThing.trim().length > 0`, step 2
     starts with one row whose text = yesterday's
     `tomorrowFirstThing`. User can edit or delete.
   - Otherwise step 2 starts empty.
   - `+ 再加一条` appends an empty row.
   - The design's hint line `昨日承诺 2 条未兑现 · 会被自动归入
     这里的"推迟"` is **adapted** to a single-line pre-population
     for v1 (v1 has no weekly promise source; the only
     yesterday-carry candidate is `tomorrowFirstThing`).

7. **Step 3: preset chips kept, analytics parked** (PM-Q4).
   - Number input, right-aligned, large mono font, suffix
     `分钟` per design.
   - Preset row below: 7 chip buttons `30m / 60m / 90m / 120m /
     150m / 180m / 240m`. Clicking sets the number value.
   - **Do not render** the design's `最近 7 天均值 · 中位数`
     line. Parked (needs an analytics read layer).
   - Value is `timeSpentMinutes: z.number().int().nonnegative()`
     per existing Zod schema.

8. **Step 4 fields.**
   - `明日第一件事 · 具体动作` — single-line text input,
     autofocus when step 4 opens, placeholder per design
     (`09:00 打开 particles/bench.ts,先跑 baseline 再改代码`).
     Required, trimmed, 1–240 chars.
   - `诚实日记 · 写给明早的自己 · 可以留空` — 3-row textarea,
     optional, placeholder per design
     (`今天我没做到 X,因为… / 我在逃避 Y / 这个节奏还能扛几天?`),
     max 2000 chars.
   - Design's hint line under `明日第一件事`
     (`会钉在明早 Today 页顶 · 晚上 app 会问你做了没`) is **not
     implemented**. The "晚上 app 会问你做了没" behavior is a
     future notification surface; the "钉在明早 Today 页顶"
     behavior is already how the `昨日之承诺` block works. Render
     a shorter muted hint: `明早 /today 顶部会看到这句话`.

9. **`+ 记一条 N` top-right button is rendered but INERT.**
   Button HTML exists; `disabled` attribute is set; tooltip
   reads `N 快捷键待定 · 先从 /knowledge 新建`. Do not wire a
   global `N` keyboard listener.

10. **Date semantics unchanged from v1.** "Today" =
    `startOfLocalDay(new Date())`. "Yesterday" = today − 1 day.

11. **Layout.** `today-ledger` stays three-column. Left column
    top-to-bottom: (a) `昨日之承诺` (read-only variant),
    (b) existing `今日 · {ISO}` block (PlanDay.plannedTasks; stays
    **read-only**, no mid-day checkbox — see §Non-goals).
    Middle column: `最近动静`. Right column: `未清账` + `阻塞`
    (both with `+ 新增` + close buttons per PM-Q3 γ).
    **Remove the inline compose card** that M1–M4 put at the top
    of the left column — superseded.

12. **Wizard state persistence.** None. Closing the modal mid-way
    discards wizard state. Revisit if dogfood shows pain.

13. **Wizard as client component.** The wizard is a client
    component mounted from `/today/page.tsx` via a thin client
    wrapper (`EndOfDayEntry.tsx`) that holds the open/close
    state and the `今日收工` button. All submit calls go through
    `upsertDailyLog` in `web/lib/daily-log/actions.ts`. No new
    API routes.

## Constraints

### Anti-pattern check (v2)

- **not a tutor** — the wizard renders the user's own typed text
  and lets them type more. No glossary, no coaching prompts.
- **not a ghostwriter** — step 1 pre-fills from
  `PlanDay.plannedTasks` which the user authored via
  `npm run seed`. Step 2 pre-fills from yesterday's user-typed
  `tomorrowFirstThing`. Both are re-surfacing the user's own
  prior authorship, not system-generated text. No LLM, no network
  call. Still passes.
- **not a cheerleader** — wizard submit closes the modal without
  confetti, toast, or congratulatory copy. Step 1 check
  strike-through is a factual mark-as-done (same visual as the
  `未清账` `[关闭]` fade), not celebration. No streak counter,
  no "great honesty" copy. The `未兑现` label on 昨日之承诺 is
  explicitly drift-colored (dusty brick), the opposite of
  celebration. Still passes.
- **not a planner** — wizard does not recommend what to do
  tomorrow, does not summarize today, does not score the day.
  The `明日第一件事` placeholder is an example-shape, not a
  recommendation. Still passes.

Passes all four.

### Preserved invariants

- No runtime LLM. No network calls. All data comes from Prisma.
- No schema changes. All writes use the columns already shipped
  in the init migration.
- Apple system font stack, amber-only accent, drift = dusty
  brick, done = muted sage, no italics, no emoji.
- UI copy in Simplified Chinese; code, comments, identifiers in
  English.
- `/today` remains a server component at the page level. Client
  boundaries in this slice: `EndOfDayEntry.tsx` (wrapper),
  `EndOfDayWizard.tsx` (modal), the four step components, and
  the existing `AddOpenItemRow` / `CloseOpenItemButton` /
  `AddBlockerRow` / `ResolveBlockerButton` from M1–M4. None
  import Prisma.
- Submit writes through Next.js 16 server actions — no new API
  routes. Every server action validates at the Zod boundary.
- `web/AGENTS.md` signals "This is NOT the Next.js you know";
  Codex must read `web/node_modules/next/dist/docs/` before
  writing server actions, async page components, or client
  boundaries.

### Non-goals for this slice (v2)

- No inline checkbox on `/today` `今日 · {ISO}` planned-tasks
  block. (Design shows it; v1 ships the block read-only. Only
  the wizard step 1 has checkboxes. Revisit if dogfood shows
  mid-day interactivity pain.)
- No draft persistence for an in-progress wizard — closing the
  modal discards state.
- No 7-day time average / median (parked per PM-Q4).
- No active `N` keyboard shortcut wiring. `+ 记一条` is inert.
- No past-day view of daily_log.
- No `Bookmark` UI.
- No edit / reopen flow for `OpenItem` / `Blocker`.
- No `OpenItem.status = "dropped"` UI.
- No Tweaks-axis toggling (single-page variant of EndOfDay, or
  `stacked` / `column` variants of Today layout).
- No fact-strip changes; `累计 commits` and `连续写 log` stay
  `—`.
- No "link an artifact to this daily log" UI.
- No wizard-side notification scaffolding. Design's
  `晚上 app 会问你做了没` is not implemented.
- No auto-dedup between step 1 unchecked rows and step 2
  entries. User is responsible.

## Surface contract v2 (authoritative)

Render `/today` as follows, layering on top of the 355e704
baseline.

### 0. Routing & project scoping

- `/today` continues to accept `?project=<id>`. Project
  resolution via `resolveActiveProject` is unchanged.
- Every server action takes `projectId` explicitly.

### 1. Page-head buttons

- Add a right-aligned button pair to the existing `.page-head`:
  - `+ 记一条 N` — small, muted, **disabled**. Tooltip
    `N 快捷键待定 · 先从 /knowledge 新建`.
  - `今日收工 ⌘↵` — primary (amber-accented). Label flips to
    `修改今日 ⌘↵` when today's `DailyLog` row already exists.
    Clicking opens the wizard modal.
- No keyboard-shortcut binding in v1 despite the `⌘↵` kbd glyph —
  the glyph documents intent but the listener is parked (same
  rationale as `N`). The button is clickable.

### 2. EndOfDay wizard modal

- Implemented via client component `EndOfDayWizard.tsx`. Structure
  per `EndOfDayWizard` in `docs/design/study-system/project/src/EndOfDay.jsx`,
  with the adaptations in PM choices §6, §7, §8.
- Modal header row: `收工 · 向导` (mono caps muted) +
  `daily_log · d{day_index} · {ISO}` (serif).
  - `day_index` is the 1-based day count within the project's
    span — reuse `snap.day_index` computation from the existing
    driving-seat builder in `web/lib/today/driving-seat.ts` if
    already exposed; otherwise factor it out of
    `buildDrivingSeatState` into a pure helper.
- Step breadcrumb: 4-column grid, each column shows `{n}/4` +
  step title. Active step has amber top rule; past step has ink
  top rule + `done`-colored `✓`; future step has muted rule.
  Clicking any past/future step heading jumps to that step
  **without** validation gating (user can fill out of order).
- Step 1 body:
  - Subtitle per design:
    `一条一个动作。『学了东西』不算。`
  - Rendered inside a `card--ruled card` frame.
  - For each entry in the step-1 list, render a row with a
    `check` / `check--done` toggle and the entry's text. Text
    strikes through when checked.
  - Initial state constructor:
    ```
    todayPlannedTasks.map(text => ({ text, checked: false,
      origin: "plan" }))
    ```
  - `+ 加一条(计划外的也写上)` row at the bottom: text input
    that, on Enter or blur with non-empty trimmed value, appends
    `{ text, checked: true, origin: "adhoc" }` and clears the
    input.
- Step 2 body:
  - Subtitle per design:
    `承认。说原因,不找借口。`  **No reason field** (per PM-Q2)
    — design's copy is kept but the second column input is
    **omitted**.
  - Rows render as a single-column text input + a `[×]` remove
    button per row.
  - Initial state constructor: if
    `yesterdayPromiseText !== null`, start with
    `[{ text: yesterdayPromiseText }]`; otherwise `[]`.
  - `+ 再加一条` button appends `{ text: "" }`.
  - No `check--drift` icon prefix on rows (design showed it for
    visual symmetry with the reason column; without reason it's
    noise).
  - Muted line at bottom: `昨日承诺会预填第一行 · 不想承认就删掉`.
- Step 3 body:
  - Label: `今日时长 · 分钟` (mono caps muted).
  - Right-aligned large-font number input, `min=0`, no `max`
    (Zod rejects negative). Default value: existing
    `timeSpentMinutes` if editing, else empty.
  - Preset chip row: 7 buttons
    `30 / 60 / 90 / 120 / 150 / 180 / 240` each suffixed `m`.
    Click sets the input value (replaces, does not add).
  - **No** 7-day average line.
- Step 4 body:
  - First field label: `明日第一件事 · 具体动作` (mono caps).
  - Single-line input, autofocus on step entry, required.
  - Hint: `明早 /today 顶部会看到这句话`.
  - Second field label: `诚实日记 · 写给明早的自己 · 可以留空`.
  - 3-row textarea, optional.
- Footer (all steps):
  - Left: muted mono `不写自由文本『今天想说什么』 ·
    结构化字段,就事论事`.
  - Right:
    - `[← back]` — disabled on step 1, else previous step.
    - If step < 4: `[next →]` (primary). Keyboard: right-arrow
      when focus is on the footer also advances; not required
      if it complicates a11y.
    - If step == 4: `[Commit log ⌘↵]` (primary). On click,
      collect wizard state and call `upsertDailyLog`.
- Submit:
  - Client assembles `{ projectId, date: today, whatDone,
    whatSkipped, timeSpentMinutes, tomorrowFirstThing,
    honestyNote }` per PM §5.
  - Calls the `"use server"` action. On `{ ok: true }`, close
    modal and let `revalidatePath("/today")` refresh the page.
  - On `{ ok: false, fieldErrors }`, jump to the step owning the
    first error and render field-level error text in drift
    color.

### 3. `昨日之承诺 · 未结清` block (read-only)

- Heading: `昨日之承诺 · 未结清` (same string the existing M3
  code uses — adjust if needed).
- Query: `DailyLog.findUnique({ projectId_date: { projectId,
  date: yesterday } })`.
- Case A — no yesterday log OR `tomorrowFirstThing` is empty
  after trim: render muted `昨日未留下第一件事`.
- Case B — yesterday log exists with text:
  - Row shape per `TodayBlockPromises` in Today.jsx, simplified
    for a single-source v1:
    - Left: unchecked `check` icon (read-only — no click
      handler; purely visual to match design).
    - Middle: the `tomorrowFirstThing` in serif, in quotes:
      `"{text}"`. Muted attribution line below:
      `来自 昨日 daily_log · {yesterday ISO}`.
    - Right: `未兑现` drift-colored mono label.
- **No button. No server action called from this block.**

### 4. `未清账` block (keep from v1)

- Unchanged from M1–M4 except for wording and placement:
  - Query, cap, and close-action logic unchanged.
  - Heading stays `未清账`.
  - Read per-row day-overdue badge `+{Nd}` per Today.jsx
    design — where `N = floor((today − openedAt) /
    1 day)` for the open item. Ink-3 if `≤ 7`, drift
    color if `> 7`. **This is new UX** on top of M1–M4's rows;
    add a helper `daysOpen(openedAt, today): number`.
  - `+ 新增` inline row unchanged.
  - Remove the `[关闭]` button's de-dup hint path (was tied to
    `记为未清账` — which is now gone).

### 5. `阻塞` block (keep from v1)

- Unchanged from M1–M4:
  - Query, cap, and resolve-action logic unchanged.
  - Heading stays `阻塞`.
  - Row shape: `text` + small mono `MM-DD` + `[解除]`.
  - `+ 新增` inline row.

### 6. Revalidation

- Every mutating server action calls
  `revalidatePath("/today")`. No other paths need
  revalidation.

## Milestones

**M1–M4 landed at 355e704** (see Progress log at the bottom).
They shipped the v1 inline-compose shape. M5–M8 below rework
toward v2.

### M5 — data layer reshape

- **Delete** `carryForwardYesterdayPromise` from
  `web/lib/daily-log/actions.ts`.
- **Delete** `findCarriedForwardOpenItem` from
  `web/lib/daily-log/queries.ts`.
- **Keep** `upsertDailyLog`, `createOpenItem`, `closeOpenItem`,
  `createBlocker`, `resolveBlocker`, `listOpenItems`,
  `listActiveBlockers`, `getTodayLog`.
- **Rename / reshape** `getYesterdayPromise` → keep the same
  name and return shape `{ text: string } | null` (already
  correct for read-only consumption). If the existing impl
  returns a larger shape, trim to just `{ text }`.
- **Add** `getTodayPlannedTasks(projectId, today, prisma)` →
  `string[]`. Reads `PlanDay.findUnique({ projectId_date })`
  and extracts the `plannedTasks` JSON array safely (filter to
  `string`, ignore others). Return `[]` if no row.
- **Add** helper `daysOpen(openedAt: Date, today: Date): number`
  in `web/lib/daily-log/presentation.ts` (M1–M4 already created
  `presentation.ts`; extend). Use `startOfLocalDay` for both
  bounds. In-source tests guarded by `if (import.meta.vitest)`.
- Commit: `daily-log-flow M5: data-layer reshape for wizard`.

### M6 — UI rework

- **Delete** the M1–M4 inline-compose surface:
  - `web/components/daily-log/DailyLogCompose.tsx`
  - `web/components/daily-log/DailyLogSummary.tsx` (or whatever
    M1–M4 named it)
  - `web/components/daily-log/CarryForwardButton.tsx` (the
    `[记为未清账]` client child)
  - Chip editor component — **keep only if reused by the new
    step 2**; simpler to write a purpose-built step-2 list
    component and delete the chip editor.
- **Reshape** `YesterdayPromiseBlock.tsx`:
  - Remove the button child.
  - Add the muted `未兑现` label and the quoted-text + attribution
    layout per Surface §3.
- **Reshape** `OpenItemsBlock.tsx`:
  - Add the `+{Nd}` days-overdue badge per row per Surface §4.
  - Keep everything else.
- **Keep** `BlockersBlock.tsx`, `AddOpenItemRow`,
  `CloseOpenItemButton`, `AddBlockerRow`, `ResolveBlockerButton`
  as-is.
- **Add** the wizard:
  - `web/components/daily-log/EndOfDayEntry.tsx` — client
    wrapper: renders the `今日收工` button and the inert
    `+ 记一条` button; manages wizard open state; renders
    `<EndOfDayWizard>` when open.
  - `web/components/daily-log/EndOfDayWizard.tsx` — client
    component: scrim + modal shell, step breadcrumb, footer
    buttons, step-switch. Owns the full wizard form state.
  - `web/components/daily-log/wizard/Step1Checklist.tsx`
  - `web/components/daily-log/wizard/Step2SkippedList.tsx`
  - `web/components/daily-log/wizard/Step3TimeInput.tsx`
  - `web/components/daily-log/wizard/Step4TomorrowNote.tsx`
  - Each step component is a client component with pure
    prop-driven rendering and change handlers. No Prisma, no
    fetch.
- Commit: `daily-log-flow M6: EndOfDay wizard + read-only promise`.

### M7 — page rework

- Update `web/app/today/page.tsx`:
  - **Remove** the inline compose card render from the left
    column.
  - **Add** the new button pair to the `page-head` right side
    via `<EndOfDayEntry>` (client).
  - Pass props to `<EndOfDayEntry>`:
    - `projectId`
    - `today` (Date)
    - `existingLog: DailyLog | null` — result of `getTodayLog`
    - `todayPlannedTasks: string[]` — result of
      `getTodayPlannedTasks`
    - `yesterdayPromiseText: string | null` — result of
      `getYesterdayPromise` (unwrapped to the string or null).
  - Left column new shape: `<YesterdayPromiseBlock>`, then the
    existing `<Block heading={todayLabel}>` block (unchanged).
  - Middle column: `<RecentKnowledgeList>` (unchanged).
  - Right column: `<OpenItemsBlock>` + `<BlockersBlock>` (both
    unchanged from M6 reshape).
  - Keep the `Promise.all` parallel fetches; add
    `getTodayPlannedTasks` to the list.
- Commit: `daily-log-flow M7: wire wizard into /today`.

### M8 — test reshape

- **Delete** `web/tests/daily-log-carry-forward.test.ts`.
- **Keep** `web/tests/daily-log-upsert.test.ts`. Add one test
  case covering the wizard-shape input assembled in the client
  (the action still receives a `DailyLogCreateInput` — the test
  just builds that payload with realistic step-1-derived
  `whatDone` + `whatSkipped`).
- **Keep** `web/tests/open-items-actions.test.ts` and
  `web/tests/blockers-actions.test.ts`. No change.
- **Update** `web/tests/today-page.test.tsx`:
  - Remove assertions that require the inline compose card or
    the `[记为未清账]` button.
  - Add an assertion that the `今日收工` button renders on the
    page-head.
  - Add an assertion that when yesterday's log with
    `tomorrowFirstThing = "X"` exists, the `昨日之承诺` block
    renders the quoted text and a `未兑现` label, and does NOT
    render any button.
  - Keep the open-item / blocker rendering assertions (they
    stay valid through the reshape).
  - Do NOT attempt to drive the wizard through RTL. Wizard
    behavior is covered by the direct server-action tests in
    `daily-log-upsert.test.ts`.
- **Add** in-source test cases for `daysOpen(openedAt, today)`
  in `web/lib/daily-log/presentation.ts` — zero-day, one-day,
  multi-day, timezone-boundary safety.
- Commit: `daily-log-flow M8: test reshape for wizard`.

### M9 — doc sync

- `docs/STATE.md`:
  - current phase flips to "`daily-log-flow` v2 implementation
    complete; fresh-context review pending".
  - `What Is True Now / Repository contents` updated: mention
    the wizard components, remove any reference to the
    deleted inline-compose files.
  - `Verification Snapshot` updated with the new test count.
  - `Recommended Next Step` points to the review session.
- No PRD change. No decision-record change.
- Commit: `daily-log-flow M9: doc sync`.

## Verification

All must pass before review hand-off.

- `cd web && npm run typecheck` — green
- `cd web && npm run lint` — green
- `cd web && npm test` — green; test count should be **106** or
  lower than 107 (M8 deletes the carry-forward file; exact
  count depends on how many cases that file held — Codex reports
  the delta).
- `cd web && npm run build` — green; `/today` stays `ƒ`
  (dynamic), other routes unchanged.
- Manual on `npm run dev` (preview against a seeded project):
  1. Fresh day (no today log): `/today` shows `今日收工` as
     primary. Click it → wizard opens on step 1 with
     `PlanDay.plannedTasks` as unchecked rows. Check two, add
     one off-plan row, advance to step 4, submit. `/today`
     refreshes; `今日收工` label flips to `修改今日`.
  2. Click `修改今日` → wizard opens with today's log
     pre-filled. Change the time, submit — same row updated.
  3. Backdate a `DailyLog` to yesterday with
     `tomorrowFirstThing = "写完 retro plan"`; reload `/today`
     → `昨日之承诺` renders the quoted text + `未兑现` label,
     no button. Open 收工 → step 2 starts with one pre-filled
     row matching that text.
  4. `+ 新增` a 未清账 item dated 10 days ago (direct DB or
     older-openedAt seed); verify the `+10d` badge renders in
     drift color.
  5. `+ 新增` a 阻塞; `[解除]` it; it disappears.
  6. Switch projects via the sidebar — every block rerenders
     scoped to the new project. No bleed.

## Open questions / parked

_All v2 PM-level questions were resolved 2026-04-22 before
handoff; see PM-confirmed choices v2 above. Parked items below
are intentionally deferred to later slices._

### Parked for later slices

- **Inline checkbox on `今日 · {ISO}` block** (mid-day progress
  tracking). Design shows it; v1 keeps that block read-only,
  only the wizard has checkboxes. Revisit if dogfood shows
  value.
- **7-day time average / median** in wizard step 3. Needs an
  analytics read layer v1 doesn't have.
- **Global `N = 新建` shortcut.** Still parked from
  `knowledge-capture-inline`.
- **Wizard draft persistence.** Modal state is lost on close.
  Revisit if dogfood shows pain.
- **Past-day view** of daily_log rows from the UI.
- **`Bookmark` driving-seat surface.** Schema present, UI
  absent.
- **`OpenItem.status = "dropped"` UI.**
- **Blocker severity / grouping.** Needs schema change.
- **`累计 commits` / `连续写 log` fact-strip reads.** A later
  Today-polish slice.
- **Wizard submit notification scaffolding** (`晚上 app
  会问你做了没` hint in the design).

## Progress log

_Codex appends one entry per milestone as it lands. Keep entries
short: milestone id, commit sha, one-line outcome._

- M1 @ d9a06d5: Added daily-log queries and server actions.
- M2 @ f281e0e: Added compose and block UI primitives.
- M3 @ 43798b8: Wired daily-log surfaces into /today.
- M4 @ b6b6be8: Added daily-log action and page tests.
- _(v1 shape complete at head 355e704; v2 rework starts below)_
- M5 @ 1050b8b: Reshaped queries/actions for the wizard and added `daysOpen`.
- M6 @ b515e97: Replaced inline compose with the EndOfDay wizard and read-only promise UI.
- M7 @ 2ce6f6c: Wired the wizard, read-only promise block, and planned-task fetch into `/today`.
- M8 @ 72f3b4d: Reshaped tests, removed carry-forward coverage, and fixed step-2 promise prefill found during smoke.
- M9 @ see final handoff: Synced repo state docs; the commit's own sha is reported in handoff to avoid a self-referential amend.
