# ExecPlan — today-page-skeleton

**Status:** closed
**Owner (impl):** Codex
**Owner (PM):** Claude / human PM
**Opened:** 2026-04-21
**Closed:** 2026-04-21
**Outcome:** fresh-context review returned `ship`; closure commit `14e4e4510dd6a0978ad7fb3233994e2070bf8be1`.

## Goal

After this slice lands, `/today` stops being a placeholder pane and
renders the **driving-seat chrome** defined by decision 0001 against
real seeded `Project` / `PlanSegment` / `PlanDay` rows from the DB.
The five data blocks (`昨日之承诺 · 未结清`, `今日 <date>`,
`最近动静`, `未清账`, `阻塞`) render as labeled skeletons with
empty-state copy where their source tables are not yet populated —
the feature slices that follow (`daily-log-flow`,
`knowledge-capture-inline`, etc.) each light up their block without
touching the shell.

## Context

- Preceding slice: [`seed-cli`](./archive/seed-cli.md) closed
  2026-04-21 with verdict `ship`. The `/today` route can now assume
  at least one `Project` row exists in the DB once a yaml is seeded,
  and can assume the PRD §3 schema and the Prisma 7 + better-sqlite3
  runtime are stable.
- Design anchor:
  [`docs/decisions/0001-design-handoff-reference.md`](../decisions/0001-design-handoff-reference.md)
  §"Today surface contract". The surface must render "你现在在..."
  sentence + full-project timeline (1 cell / day + phase tick-marks) +
  four-fact strip + five blocks. The prototype bundle at
  `docs/design/study-system/project/today.jsx` is the visual spec.
- PRD anchors: §0 (mirror, not tutor), §1 (four anti-patterns),
  §7 MVP item 2 ("每天打开 Today 页看驾驶舱"), §9 ("Today 页：驾驶
  舱一句话 + 全项目时间带 + 四事实条 + 五个 block").
- Downstream dependency: every feature slice after this one
  (`knowledge-capture-inline`, `daily-log-flow`, `weekly-review-flow`,
  `retro-flow`) lights up one or more of the five blocks. Those
  slices must not have to reshape the Today shell.

### PM-confirmed choices (locked before Codex handoff)

_All confirmed by PM 2026-04-21._

1. **Project selection is URL-driven.** `/today` reads an optional
   `?project=<id>` search param. The sidebar's "项目" section
   renders one `<a>` per `Project` row (ordered by `startDate`
   desc) linking to `/today?project=<id>`; the currently-rendered
   project carries `aria-current="page"`. Resolution order: (a) if
   `?project` is present and matches a row, use it; (b) else the
   most-recently-started project (`ORDER BY startDate DESC LIMIT 1`);
   (c) else (zero projects) render an empty-state pointing to
   `npm run seed`. No schema change, no client state — sidebar
   entries are plain server-rendered links, so `/today` stays a
   pure server component.
2. **Layout variant** — render the `ledger` variant only. `stacked`
   / `column` + the `Tweaks` panel are deferred to a later slice.
3. **Timeline when `endDate` is null** (`has_plan_structure:
   "open"`) — omit the cell-band; render the "今日" marker alone.
4. **Empty-state copy** — each of the five blocks shows a muted
   one-line "尚未记录" variant matching the existing placeholder
   pane's tone. Exact copy per block is listed in M3.

## Constraints

### Anti-pattern check (PRD §1)

- **not a tutor** — the page renders facts the user has already
  produced (seeded plan structure, today's date, counts of their own
  rows). It does not explain concepts, recommend what to study, or
  answer "what is X".
- **not a ghostwriter** — no text in the page is generated on the
  user's behalf. All block copy is labels and empty-state, not body
  text standing in for a daily_log / knowledge_item entry.
- **not a cheerleader** — no "great work!", no streaks rendered as
  congratulations, no colored badges for metric milestones. The
  four-fact strip reads as flat status text per decision 0001.
- **not a planner** — the page displays the plan that was seeded, it
  does not synthesize a new one. The "今日" block shows the seeded
  `plan_day.planned_tasks` verbatim (when one exists), not AI-
  generated suggestions.

Passes all four.

### Preserved invariants

- No runtime LLM. No network calls from the page. All data comes
  from Prisma.
- Apple system font stack only; no Google Fonts; no italics; no
  emoji. Amber is the only accent, drift is dusty brick, done is
  muted sage (decision 0001 load-bearing rules).
- UI copy in Simplified Chinese; code, comments, and identifiers in
  English.
- No schema changes. The Today page is read-only against the DB.
- The page is a Next.js App Router **server component** by default.
  Only interactivity (if any) spins off into a client component.
  Reading the current date in a server component will move `/today`
  from static-prerendered to dynamic; that build-output shift is
  expected and called out in M6.

### Non-goals for this slice

- No end-of-day wizard (separate slice).
- No Tweaks panel; no layout variant toggling.
- No client-side time reactivity (clock on the page moving live);
  the rendered date is whatever the request time sees.
- No population of blocks whose source slices have not landed. The
  `knowledge-capture-inline` slice will populate "最近动静"; the
  `daily-log-flow` slice will populate "昨日之承诺" and "今日"
  (beyond the planned-tasks view).
- No search, no command palette, no "N" / "⌘↵" shortcuts wired to
  real targets.

## Surface contract (authoritative for this slice)

Render `/today` as follows, reading the prototype at
`docs/design/study-system/project/today.jsx` for visual detail.

### 0. Project selection & sidebar

- `/today` takes an optional `?project=<id>` search param.
  Resolution order:
  1. if `project` is present and matches a `Project.id`, use it
  2. else the most-recently-started project
     (`ORDER BY startDate DESC LIMIT 1`)
  3. else (zero projects) render the empty-state pointing to
     `npm run seed`
- The sidebar's "项目" section (currently a scaffold stub reading
  `还没有项目`) renders one `<a class="proj-item">` per `Project`
  row, ordered by `startDate` desc. `href` is
  `/today?project=<id>`. The row for the currently-rendered
  project gets `aria-current="page"`. When no projects exist,
  keep the existing `还没有项目` empty-state string.
- `/today/page.tsx` itself stays a pure server component and reads
  `searchParams` via its prop.
- **Sidebar project-highlight carveout.** Next.js 16 layouts cannot
  read `searchParams` (see
  `web/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md`),
  and the sidebar lives in the root layout. Therefore:
  - `Sidebar.tsx` remains a server component; it does the DB read
    via `listSidebarProjects()` and owns layout / styling.
  - One thin client child (e.g. `ProjectListActive.tsx`) takes the
    `projects` array as a prop and uses `useSearchParams()` solely
    to stamp `aria-current="page"` on the active `<a>`. This
    component does **not** read the DB, does **not** fetch, does
    **not** import Prisma.
  - Links remain plain `<a>`; no `useRouter`, no `onClick`, no
    client state machine.
  - Navigation links (`今日/计划/...`) keep whatever rendering model
    they use today; do not migrate them as part of this slice.

### 1. Driving-seat sentence

Single line, muted ink, positioned above the timeline. Format:

- `has_plan_structure = "full"`:
  `你现在在 <segment.name> · 第 <todayIndex> 天 / 共 <totalDays> 天`
- `has_plan_structure = "segments"`:
  `你现在在 <segment.name> · 距阶段结束还剩 <daysToPhaseEnd> 天`
- `has_plan_structure = "open"`:
  `你现在在 <project.name> · 累计第 <daysSinceStart> 天`

`todayIndex` / `daysSinceStart` use `project.startDate` as day 1 and
today's date (server time, date-only, no timezone math beyond the
Prisma `DateTime` default). If today is before `project.startDate`,
the sentence reads `<project.name> · 尚未开始（<date-diff>）`.

### 2. Full-project timeline band

A horizontal band of 1-cell-per-day tiles from `project.startDate`
through `project.endDate`. Visual spec: prototype
`today.jsx` timeline component.

- Today's cell carries the amber highlight.
- Phase boundaries carry a tick-mark between cells (use
  `PlanSegment.startDate` as the boundary marker).
- Past cells render plain; drift colouring is **deferred** to the
  `daily-log-flow` slice, since it requires `DailyLog` rows to
  compute "missed".
- If `has_plan_structure = "open"` (no `endDate`), the band is
  omitted; only the driving-seat sentence renders.

### 3. Four-fact strip

Four flat `label: value` cells, tabular-nums, mono font. Per
decision 0001 the strip is "flat status text" — no icons, no
accent colour. Sources:

1. `累计 commits <N>` — count of `Artifact` rows where
   `kind = "commit"` for this project. **Deferred** (Artifact rows
   do not yet land until `knowledge-capture-inline`); render
   `累计 commits —` until then.
2. `连续写 log <N> 天` — consecutive `DailyLog` days ending today.
   **Deferred** (DailyLog populated by `daily-log-flow`); render
   `连续写 log —` until then.
3. `<segment.name> 还剩 <N> 天` — computed from
   `PlanSegment.endDate - today`.
4. `<project 顶层阶段数> 个阶段 / <N> 个已完成` — count of
   `PlanSegment` rows and number whose `endDate < today`.

Each fact is rendered via a `Fact` component so later slices can
swap the `—` placeholders for real values without touching the
shell.

### 4. Five blocks

All five render as labeled cards in the `ledger` layout (three
columns per decision 0001). Card chrome, heading weight, and rule
lines come from the prototype. Within this slice:

| Block | Source table(s) | This slice renders |
|---|---|---|
| `昨日之承诺 · 未结清` | `DailyLog.tomorrowFirstThing` + `OpenItem` | Empty-state: `尚未记录 — daily-log-flow 落地后会显示昨日留下的第一件事` |
| `今日 <YYYY-MM-DD>` | `PlanDay.plannedTasks` for today | Real content **if** a matching `PlanDay` exists; otherwise empty-state: `今日 <date> — 未排入计划` |
| `最近动静` | `KnowledgeItem` (7-day window) | Empty-state: `尚未记录 — knowledge-capture-inline 落地后会显示最近沉淀` |
| `未清账` | `OpenItem` where `status != "closed"` | Empty-state: `尚未记录 — daily-log-flow 落地后会挂出未结清条目` |
| `阻塞` | `Blocker` where `resolvedAt IS NULL` | Empty-state: `尚未记录 — 阻塞会在 daily-log-flow / 手动记录时出现` |

Empty-state copy is **UI copy** (Simplified Chinese, flat status
tone, no cheer). The exact strings above are part of the PM-
confirmed contract.

## Milestones

### M1 — server-side data layer

- `web/lib/today/active-project.ts` — exports
  `resolveActiveProject(requestedId: string | undefined)` with the
  resolution order in surface-contract §0 (matching `Project.id` →
  most-recent by `startDate` → null when the table is empty). Also
  exports `listSidebarProjects()` returning
  `Array<{ id: string; name: string }>` ordered by `startDate` desc
  for the sidebar's "项目" section. Pure server-only; imports
  `@/lib/seed/prisma` factory or a similar server-only Prisma
  accessor (**do not** reuse the seed-cli factory directly if it
  pulls in anything CLI-shaped — extract a shared factory if
  needed). Unit-tested via a temp DB the same way
  `web/tests/schema-roundtrip.test.ts` works, including the
  `requestedId = undefined`, `requestedId = <bogus>`, and empty-DB
  branches.
- `web/lib/today/driving-seat.ts` — pure functions computing the
  three driving-seat sentence variants, `todayIndex`,
  `daysToPhaseEnd`, `daysSinceStart`. No DB access. Exhaustively
  covered by in-source `if (import.meta.vitest)` tests including
  the "today is before startDate" and "today is after endDate"
  edges.
- `web/lib/today/timeline.ts` — pure function building the timeline
  cell array from `project`, `segments`, and today's date. Returns
  `{ cells: Array<{ date: Date; isToday: boolean; segmentId: string | null; isPhaseBoundary: boolean }>; showBand: boolean }`.
  `showBand = false` when `project.endDate === null`. Unit-tested.

### M2 — UI primitives

- `web/components/today/DrivingSeat.tsx` — server component; takes
  the project + computed sentence; renders muted line per spec.
- `web/components/today/Timeline.tsx` — server component; takes
  the cells array; renders the band. Amber highlight for today;
  tick-mark for phase boundaries. No interactivity.
- `web/components/today/FactStrip.tsx` + `Fact.tsx` — renders the
  four facts with `—` placeholder support so later slices don't
  reshape it.
- `web/components/today/Block.tsx` — generic labeled-card shell
  with a `heading` and a `children` slot. Five instances inside the
  page; four of them render only empty-state text in this slice.
- `web/components/shell/Sidebar.tsx` — update the existing scaffold
  stub so the "项目" section renders real rows from
  `listSidebarProjects()` as `<a href="/today?project=<id>">`, with
  `aria-current="page"` on the active one. The `还没有项目`
  empty-state stays for the zero-project case. Remains a server
  component. The active-project id is passed down from the layout
  or read server-side from the same helper used by `/today` —
  pick whichever keeps the data flow simplest without duplicating
  the resolve logic.

### M3 — page assembly

- `web/app/today/page.tsx` — accepts `searchParams` per the
  Next.js 16 App Router contract (consult
  `web/node_modules/next/dist/docs/` for the exact prop shape — in
  Next.js 16 `searchParams` is a Promise). Replaces the current
  `PlaceholderPane` with:
  1. read `?project=<id>` from `searchParams`
  2. call `resolveActiveProject(requestedId)`
  3. if `null`, render a single line: `还没有项目。跑 \`npm run seed\` 导入一个计划。`
  4. otherwise, compose `DrivingSeat` + `Timeline` + `FactStrip`
     + the five `Block`s in the `ledger` layout (three columns per
     decision 0001)
- Route becomes dynamic; that is expected. No `dynamic = "force-*"`
  directive needed — DB reads + `searchParams` in a server
  component are enough.

### M4 — content wiring

- "今日" block: query `PlanDay` where `(projectId = active,
  date = today)`; if found, render `title` + `plannedTasks` list
  (tabular list, no checkboxes in this slice — checkbox interaction
  is a later slice).
- Segment-count fact (#4 in the four-fact strip): query
  `PlanSegment` counts.
- All other blocks: empty-state only in this slice.

### M5 — tests

- Unit tests (in-source) for `driving-seat.ts` and `timeline.ts`
  covering every branch.
- Integration test at `web/tests/today-page.test.tsx`:
  - boots a temp DB, seeds a minimal Project + 1 PlanSegment + 3
    PlanDays
  - renders the page (React Testing Library + React 19; follow the
    Next.js 16 guidance in `web/node_modules/next/dist/docs/` if
    there's a specific Server-Component testing path — check
    before assuming)
  - asserts the driving-seat sentence, the timeline has the right
    number of cells with the right one marked today, and the
    "今日" block shows `plannedTasks` when today matches a
    `PlanDay.date`
  - asserts each of the four empty-state blocks renders its
    empty-state copy verbatim
  - asserts the "no project" empty-state renders when the DB has
    zero projects
  - seeds a second Project (different `startDate`) and asserts:
    (a) the sidebar renders both as `<a>` links to
        `/today?project=<id>`, newest first
    (b) `/today` with no `?project` resolves to the newest and
        that entry carries `aria-current="page"`
    (c) `/today?project=<older-id>` resolves to the older and
        flips `aria-current` to that entry
    (d) `/today?project=bogus` falls back to the newest without
        throwing
- Snapshot of the rendered HTML is **not** required; assertions on
  text content are enough.

### M6 — doc sync

- `AGENTS.md` "Current Commands" — unchanged (no new commands).
- `web/README.md` — unchanged unless a new lib path is worth
  mentioning; probably skip.
- `docs/STATE.md`:
  - current phase flips to
    "`today-page-skeleton` implementation-complete; fresh-context
    review pending"
  - `What Is True Now / Repository contents` gains
    `web/lib/today/` and `web/components/today/` entries, and the
    `web/components/shell/Sidebar.tsx` entry gets an update note
    (sidebar "项目" section is now live data, not a static stub)
  - `Verification Snapshot` gets the new test count
  - `Recommended Next Step` points to the review session
- No PRD change. No decision-record change.

## Verification

All must pass before close-out.

- `cd web && npm run typecheck` — green
- `cd web && npm run lint` — green
- `cd web && npm test` — green, new tests included
- `cd web && npm run build` — green; `/today` will now be listed as
  dynamic (λ) instead of static (○); the other seven routes stay
  static.
- Manual on `npm run dev`:
  1. With a freshly migrated DB and no seeded projects: `/today`
     renders the empty-state pointer to `npm run seed`.
  2. After `npm run seed -- tests/fixtures/seed-smoke.yaml`: `/today`
     renders the driving-seat sentence and a 5-cell timeline band for
     the fixture window. On 2026-04-21 specifically, because the
     fixture starts on 2026-05-03, the correct result is the pre-start
     branch (no highlighted today cell), facts #3 and #4 with real
     values, facts #1 and #2 staying placeholders, and all five blocks with the
     correct empty-state / planned-tasks content for that date.
  3. Keyboard `2`-`5` / `,` still route correctly; `1` returns to
     `/today`. Paper-ruling overlay still visible.

## Open questions

_Questions about project selection and the open-ended timeline band
were resolved 2026-04-21 before handoff; see PM-confirmed choices §1
and §3. The remaining items are parked for later slices._

1. **(parked, revisit after daily-log-flow)** Drift coloring on past
   timeline cells. Needs `DailyLog` rows to compute "missed" — lives
   in a later slice.
2. **(parked)** `dailyLog.honestyNote` interaction with the driving-
   seat sentence. If a user's latest `honestyNote` flags that they
   self-overstated, should the sentence surface that? Product-level
   question; defer to after daily-log-flow lands.

## Progress Log

_(Codex fills this in as M1–M6 land.)_

- 2026-04-21 — M1 landed: added `web/lib/prisma.ts`,
  `web/lib/today/active-project.ts`, `driving-seat.ts`, and
  `timeline.ts`, plus temp-DB coverage in
  `web/tests/today-active-project.test.ts` and in-source branch tests
  for the pure Today helpers. Commit: `13c8673`. Surprise:
  Vitest's current node-mode setup does not resolve the repo's `@/*`
  path alias, so the new Today modules use relative imports to keep
  the existing test harness unchanged.
- 2026-04-21 — M2 landed: added `web/components/today/` primitives,
  converted `Sidebar.tsx` into a server component that reads real
  projects from the DB, and isolated the approved client carveout
  into `ProjectListActive.tsx` while moving the pre-existing nav
  active-state logic into `SidebarNav.tsx`. Commit: `e3f72ba`.
  Surprise: the current shell CSS was missing the design-bundle card
  and block-label primitives, so `web/app/globals.css` now exposes the
  minimal Today-specific chrome needed for the next milestones.
- 2026-04-21 — M3 landed: replaced the `/today` placeholder with a
  real server-rendered driving-seat shell that reads async
  `searchParams`, resolves the active project, renders the overview
  card plus five-block ledger layout, and exposes the empty-db
  message required by the contract. Commit: `def6621`. Surprise:
  Next.js 16 requires the sidebar's `useSearchParams()` carveout to
  sit under `Suspense` during static prerendering (`/_not-found`
  tripped this), so `Sidebar.tsx` now wraps the thin client child in a
  server fallback without changing the plain-`<a>` contract.
- 2026-04-21 — M4 landed: wired the `今日 <date>` block to
  `PlanDay(projectId, date)` and replaced the fourth fact-strip cell
  with real `PlanSegment` counts (`N 个阶段 / M 个已完成`). Commit:
  `c647480`. Surprise: `plannedTasks` comes back from Prisma as JSON,
  so the page now narrows it explicitly to `string[]` before rendering
  the ruled task list.
- 2026-04-21 — M5 landed: added `web/tests/today-page.test.tsx`
  using `jsdom` + React Testing Library, covering the driving-seat
  sentence, timeline cell count / current-day marker, planned-task
  rendering, four empty-state blocks, zero-project empty state, and
  the four sidebar project-switching assertions in the plan matrix.
  Commit: `a64ec7d`. Surprise: testing the async server page under
  Vitest only worked cleanly by awaiting `TodayPage()` / `Sidebar()`
  first and then handing the resulting element tree to RTL; direct
  async-server-component mounting is still not something the bundled
  Next.js Vitest guidance supports.

- 2026-04-21 - M6 landed: synced `docs/STATE.md`, reran the full
  `typecheck` / `lint` / `test` / `build` sweep, and rechecked `/today`
  manually against both an empty DB and the seeded smoke fixture.
  Commit: current close-out head. Surprise: the plan's manual step that
  says the smoke fixture should show "today highlighted" is stale on
  2026-04-21 because `tests/fixtures/seed-smoke.yaml` starts on
  2026-05-03, so the correct browser result is the pre-start branch
  with the 5-cell band but no current-day highlight. Secondary note:
  the sidebar project `aria-current` carveout was confirmed
  in-browser, but Playwright CLI would not reliably retrigger the
  unchanged shell keyboard shortcut listener, so this slice left that
  pre-existing behavior untouched and documented the limitation in
  `docs/STATE.md`.

- 2026-04-21 - review follow-up landed: switched `/today`,
  `driving-seat.ts`, and `timeline.ts` from UTC day bucketing to local
  calendar-day bucketing, fixed the sidebar project selected-state CSS
  selector to match `aria-current="page"`, added early-morning local
  time coverage in the pure helpers plus `/today` integration, and
  synced the stale Verification step above. Commit: current review-fix
  head.

- 2026-04-21 - fresh-context review returned `ship`. Head reviewed:
  `14e4e4510dd6a0978ad7fb3233994e2070bf8be1`. No blocking, should-fix,
  or nit findings. Reviewer confirmed: surface contract fidelity,
  anti-pattern check, server-component discipline (only the approved
  `ProjectListActive` client carveout), build shape (`/today` is `ƒ`,
  other routes stay `○`), and the three review-point fixes
  (local-day semantics, sidebar selected-state CSS, stale plan
  verification step) are closed. Final verification at the reviewed
  head: `typecheck` / `lint` green; `npm test` 20 files, 76 tests;
  `npm run build` green.

- 2026-04-21 - slice closed. Moved to
  `docs/plans/archive/today-page-skeleton.md`. `docs/STATE.md` updated
  to reflect the next active slice.

## Change Log

- **2026-04-21 — scope:** project selection reshaped from a fixed
  server-side "first active" rule to URL-driven
  (`/today?project=<id>`), with the sidebar's "项目" section wired
  to real `Project` rows as plain `<a>` links. Reason: the
  scaffolded sidebar already exposes a project list, so using it as
  the switcher is both more faithful to the design and cheaper than
  locking the user into a single "active" project or deferring
  multi-project support to a later slice. Adds `listSidebarProjects`
  + `Sidebar.tsx` wiring + a `searchParams` prop on `/today` to the
  scope; keeps `/today` a server component.
- **2026-04-21 — architecture carveout (Codex unblock):** Next.js
  16 layouts cannot read `searchParams`, so the sidebar (which
  lives in the root layout) cannot stamp `aria-current="page"` on
  the active project from server code alone. Approved the
  minimum-viable relaxation: `Sidebar.tsx` stays a server component
  and owns the DB read; one thin client child reads
  `useSearchParams()` solely to apply `aria-current`. No
  `useRouter`, no `onClick`, no client state, no DB access in the
  client child — links remain plain `<a>`. `/today/page.tsx` itself
  stays a pure server component. Alternatives considered: (B)
  moving the sidebar out of root layout — rejected because it
  explodes the slice into all six routes, splits shell chrome, and
  forces a premature answer to "what does 'current project' mean
  on `/plan` / `/knowledge`"; (C) dropping the sidebar highlight
  entirely — rejected because it costs a real a11y / affordance
  signal for no architectural win over A.
