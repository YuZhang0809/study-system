# ExecPlan — retro-flow

**Status:** active
**Owner (impl):** Codex
**Owner (PM):** Claude / human PM
**Opened:** 2026-04-22
**Target close:** 2026-04-26 — one working session of implementation
plus a fresh-context review pass, mirroring the `weekly-review-flow`
cadence. `export-json-cli` is the final v1 slice before the 2026-05-03
dogfood deadline, so this one has to land cleanly.

## Goal

After this slice lands:

1. `/retros` default tab flips back to `phase` (design default). The
   `阶段复盘` tab is no longer a placeholder: it renders the full live
   surface.
2. A page-head primary button opens the **阶段复盘 · 向导** — an
   in-page 5-step wizard per design
   (`docs/design/study-system/project/src/Retros.jsx` `PhaseRetroWizard`,
   L132–264). Steps are: **指标 · 先看数字** / **六项自评** /
   **三问** / **范围调整** / **留钩子**. On final submit the wizard
   upserts one `Retro` row per `segmentId` and returns to the
   `/retros?tab=phase` list view.
3. The `阶段复盘` tab body shows a read-only `PhaseRetroList` — one
   card per committed retro in desc-by-`committedAt` order, matching
   the design's L55–117 shape (7-metric stat strip, 6 ink-tally score
   rows, three Q/A pairs, `Scope 调整` list).
4. `三问` question copy is fixed. The user writes only the three
   answers. The design-authoritative Chinese question copy lives in
   a new `web/lib/retro/copy.ts` (matching `weekly-log/copy.ts`
   precedent).
5. `指标` (step 1) renders seven auto-computed numbers for the target
   segment — **the user never types a metric**. The wizard's role at
   step 1 is "look at the numbers for 5 seconds before you write
   anything else" (design L121).
6. `六项自评` (step 2) renders the same six dimension keys as the
   weekly log (`clarity / honesty / output / depth / discipline /
   energy`) with the same 5-cell ink-tally control used in
   `WeeklyReviewModal`. The **previous phase's** six scores render as
   a muted reference line above each row when a previous retro
   exists — no pre-fill (PRD §1 anti-pattern: not a ghostwriter).
7. `范围调整` (step 4) collects an ordered list of
   `{change, reason}` rows. Zero rows allowed (dogfood reality: some
   phases land clean); N rows allowed. Each non-empty row requires
   both `change` and `reason`.
8. `留钩子` (step 5) collects one plain-text input
   `nextPhaseFirstThing`. Required. Stored on the retro row itself.
   This slice does **not** wire it into `/today` — that's parked for
   a later Today polish slice (mirrors weekly-review-flow's parking
   of the last-week-Q6 /today hook).

Schema change: **one additive migration** adds
`Retro.nextPhaseFirstThing String?` (nullable, TEXT). No other
schema fields move. All other data shape changes are JSON-column
presentation layer rewrites with matching Zod updates — no
migration needed for those. See M1.

Zod rewrite: the existing `web/lib/schemas/retro.ts` was written
speculatively before design read and does not match the design
shape. It will be replaced in M1:

- `threeQuestions` goes from `{ kept, changed, killed }` to
  `{ q1, q2, q3 }` (trimmed 1–2000 chars each; question copy lives
  in `retro/copy.ts`, matching weekly-log precedent).
- `scopeChanges` entries go from `{ from, to }` to
  `{ change, reason }` (both trimmed 1–500 chars).
- `metrics` narrows from `Record<string, number>` to a fixed object
  with the seven design keys.
- `selfScores` narrows to a fixed object with the six dimension
  keys, each `1..5` integer.
- Adds required `nextPhaseFirstThing: string` (trimmed 1–500
  chars).
- `retroCreate` gains `segmentId: string.min(1)` (unchanged).

Project scoping via `?project=<id>` continues to work the same way
as `/today` and `/retros`; `resolveActiveProject` is reused.

## Context

- Preceding slice:
  [`weekly-review-flow`](./archive/weekly-review-flow.md) closed
  2026-04-22 at head `ea6c8ed` with fresh-context review `approve`.
  Its page-head `本周复盘 ⌘↵` + 5-cell ink-tally + neutral
  validation-copy pattern are the reference for the wizard's entry
  button and score step.
- Design anchors (authoritative):
  - `docs/design/study-system/project/src/Retros.jsx`
    - `PhaseRetroList` L55–117 — read-only card shape. 7-metric
      stat strip (L64–73) with `drift_days / planned_days` delta
      percent; 6 ink-tally score rows (L78–90); three Q/A
      entries (L93–99); scope-changes list (L105–111).
    - `WIZARD_STEPS` L119–130 — step titles + subtitles (kicker
      copy). **Use verbatim** in the new `retro/copy.ts`.
    - `PhaseRetroWizard` L132–264 — step rail at top, step body
      below, footer with Prev/Next + 提交复盘 ⌘↵. Step 5 hint
      `这条会被钉在下一阶段第 1 天的今日页 · 你不能假装没看见`
      (L248) — we store the string but the "pin to /today"
      wiring is parked (see §Non-goals).
    - `SCORE_LABEL` L3–6 + `METRIC_LABEL` L7–13 — authoritative
      Chinese labels. Copy into `web/lib/retro/copy.ts`
      unchanged.
  - `docs/design/study-system/project/seed.js` L211–227 —
    authoritative data shape for `three_questions` (Q/A pair
    list; question copy is fixed), `scope_changes`
    (`{change, reason}`), `metrics` (7 fields), `scores` (6
    dimensions).
  - `docs/design/study-system/project/styles.css` L827–842 — the
    `.tally` + `.tally .seg` + `.seg.on` classes. **Already
    landed in `web/app/globals.css`** by `weekly-review-flow`;
    reuse as-is. No new CSS needed for the score row.
  - `docs/decisions/0001-design-handoff-reference.md` — visual
    tokens. Apple system stack, amber-only accent, no italics,
    no emoji.
- PRD anchors:
  - §3 entity table — `retro` columns are `id, segment_id,
    metrics(JSON), self_scores(JSON), three_questions(JSON),
    scope_changes(JSON)`. This slice adds one column
    (`next_phase_first_thing`) and narrows the JSON shape of the
    existing four.
  - §3 D-3 — `retro` is structured. No free-form `今天想说什么`
    overflow.
  - §3 D-5 — checklist 勾选不进库. This slice has no checklist:
    step 1 (metrics) is a read-only display, step 2 is score
    rows, step 3/4/5 are structured write fields. The muted
    footer line `检查项的勾选不入库 · 只有你写的字会被记下来`
    (design L255) is carried into the wizard footer as copy; it
    is truthful because we never ask for checks.
  - §1 anti-patterns — detailed check below.
  - §5 — no v1 LLM. Metrics are pure Prisma aggregation.
  - §7 MVP item 5 — "Phase 末尾写 retro（metrics + 6 能力自评 +
    三问 + scope 调整）".
  - §8 acceptance — "Day 30 能走完 Phase 1 retro 流程".
- Existing infrastructure to reuse:
  - `Retro` table: `web/prisma/schema.prisma` L105–116 (one
    additive migration in M1 adds `nextPhaseFirstThing`).
  - `PlanSegment` table: `web/prisma/schema.prisma` L38–55
    (select eligible segments, `order` + `startDate` + `endDate`
    drive selection).
  - `DailyLog`, `KnowledgeItem`, `Artifact`, `PlanDay` —
    metrics aggregation sources.
  - `resolveActiveProject`, `startOfLocalDay`, `formatIsoDate`,
    `getPrismaClient` already in place.
  - `WeeklyReviewEntry.tsx` pattern — mirror for
    `PhaseRetroEntry.tsx`, but note: the wizard is in-page, not
    modal. Entry button triggers a client-side tab-body swap,
    not a modal open.
  - `.tally` + `.seg.on` CSS — already in `web/app/globals.css`
    from `weekly-review-flow` M2.
  - `.pillbar` + `.pill` — already in use by `/retros`.

### PM-confirmed choices (locked 2026-04-22, all option 1)

1. **三问题面钉死** (PM-Q1 = locked copy). The three question
   strings are:
   - Q1 — `这个阶段真正搞懂的东西是什么?`
   - Q2 — `这个阶段没搞懂但当时骗自己搞懂了的东西是什么?`
   - Q3 — `如果重来,哪一步可以砍掉?`

   Source: design seed L218–220. These live in
   `web/lib/retro/copy.ts` (new module, mirrors
   `weekly-log/copy.ts`). Users only type answers. The schema
   stores `{q1, q2, q3}` (answer strings), not Q/A pairs.
   Rationale: matches weekly-log precedent; simpler schema;
   question copy is never user-editable.

2. **`nextPhaseFirstThing` persists on `retro`**
   (PM-Q2 = locked, migration). One additive migration in M1
   adds `next_phase_first_thing TEXT` (nullable to survive
   existing rows; not-null at the Zod layer for new writes).
   Migration name: `add-retro-next-phase-first-thing`. No other
   column changes. The `/today` pin-to-day-1 behavior is parked
   for a later Today polish slice (see §Non-goals).

3. **`drift_days` algorithm**
   (PM-Q3 = "planned days with no daily log"). For a target
   segment with window `[segment.startDate, segment.endDate]`:

   ```
   plannedDates = { d.date : d ∈ PlanDay, d.segmentId === segment.id }
   loggedDates  = { l.date : l ∈ DailyLog,
                    l.projectId === segment.projectId,
                    l.date ∈ [segment.startDate, segment.endDate] }
   drift_days   = | plannedDates \ loggedDates |
   ```

   In-memory set subtraction after two `findMany` calls; avoids a
   subquery that SQLite/Prisma can't JIT cleanly. Dates are
   normalized with `startOfLocalDay` on both sides.

4. **Eligible-segment selector** (PM-Q4 = "most-recent finished,
   not-yet-retro'd"). A segment is *eligible* iff:

   - `segment.projectId === activeProject.id`, AND
   - `segment.endDate < startOfLocalDay(now)`, AND
   - no `Retro` row exists with `segmentId === segment.id`.

   Order eligible candidates by `endDate` desc and take the first.
   - If there is one: the page-head primary button is
     `阶段复盘 ⌘↵` (enabled); wizard runs against this segment.
   - If there is none but at least one finished+retro'd segment
     exists (i.e., all finished segments are already retro'd):
     button is disabled with tooltip
     `这一阶段已复盘 · 下一阶段结束再来`.
   - If no finished segment exists (or project has no segments):
     button is disabled with tooltip
     `这阶段还没收尾 · 先把日志写完`.
   - The **modify** path for an already-committed retro is
     **not** exposed in v1: once committed, a retro is read-only
     until dogfood says otherwise. This intentionally differs
     from weekly-review-flow's `修改本周` toggle — a phase is a
     harder cut, and editing past retros is noise we don't need
     yet. Revisit during dogfood.

5. **Previous-phase reference** (PM-Q5 = yes). In step 2 (六项
   自评), for each dimension row, if the immediately-preceding
   segment (by `order` or `startDate`) has a committed retro,
   render a muted line above the row:
   `上阶段 {dimensionLabel} · {previousScore}` — for example
   `上阶段 清晰度 · 3`. If no previous-phase retro exists, the
   line is simply omitted (no empty container, no placeholder
   text). No pre-fill of the current row. Mirrors weekly-review's
   Q4-Q6 reference pattern.

6. **Validation** (PM-Q6 = "三问必填 · 范围调整 0+ · 钩子必填").
   - Each of `threeQuestions.q1..q3`: trimmed, 1–2000 chars.
   - `scopeChanges`: 0+ rows; each non-empty row requires both
     `change` and `reason` (trimmed, 1–500 chars each). Empty
     rows are dropped at submit time before the Zod parse.
   - `nextPhaseFirstThing`: trimmed, 1–500 chars.
   - `selfScores.{key}`: each required, integer 1–5.
   - `metrics.{key}`: each required non-negative integer (they
     are server-computed, not user-typed, but validate anyway
     to keep the boundary honest).

   Validation copy is neutral, matching weekly-review precedent:
   - `REFLECTION_REQUIRED_ERROR = "这一题不填,就写『没有』或『跳过』,但别空着"`
   - `REFLECTION_MAX_LENGTH_ERROR = "这一题最多 2000 字"`
   - `SCORE_REQUIRED_ERROR = "这一项必填"`
   - `SCORE_RANGE_ERROR = "分值必须在 1 到 5 之间"`
   - `HOOK_REQUIRED_ERROR = "这条必填,不然下一阶段就没有钩子"`
   - `HOOK_MAX_LENGTH_ERROR = "这条最多 500 字"`
   - `SCOPE_FIELD_REQUIRED_ERROR = "这一条没填完,要么删了要么补齐"`
   - `SCOPE_FIELD_MAX_LENGTH_ERROR = "每条最多 500 字"`

7. **Wizard shape = in-page 5-step** (PM-Q7 = yes). Phase tab body
   is a client component `PhaseRetroTab.tsx`. It has two render
   modes:

   - `mode === "list"` — shows the read-only `PhaseRetroList` and
     (if an eligible segment exists) the `开始阶段复盘` muted
     hint. The primary entry button lives in the page-head and
     is the caller of `setMode("wizard")`. **Correction:** to
     avoid prop-drilling, the entry button lives inside
     `PhaseRetroEntry.tsx` which also owns the `mode` state and
     renders either the list or the wizard below the pillbar.
     See Surface §5.
   - `mode === "wizard"` — replaces the list body with the
     5-step wizard card. On submit-success or Cancel, returns to
     `mode === "list"` and the page revalidates.

   The wizard is NOT a modal. No scrim. The design calls this
   out explicitly with `wizard: false` starting state (L17). The
   wizard card is full-width within the page padding.

8. **Default tab** (PM-Q8 = flip to `phase`). `/retros` default
   tab with no `?tab` param becomes `phase` (matches design
   L16). `?tab=weekly` still routes correctly. The
   page-head button group must therefore branch: when tab =
   phase, the primary button is `阶段复盘 ⌘↵`; when tab =
   weekly, the primary button is `本周复盘 ⌘↵` / `修改本周 ⌘↵`
   as before. Clicking the `周记` pill navigates to
   `?tab=weekly&project=...`.

9. **Card title** (PM-Q9 = `第 N 阶段 — {name}`). `N` comes from
   `segment.order` (1-based; already exists on `PlanSegment`).
   Card header is a single serif line:
   `第 {order} 阶段 — {segment.name} · 提交于 {retro.createdAt}`
   (mono caps ink-3 for the `提交于` tail, matching weekly card
   convention).

## Constraints

### Anti-pattern check

- **not a tutor** — the wizard renders the user's own typed
  answers and the user's own prior-phase scores. Metrics (step 1)
  are factual aggregations of the user's own logs, not
  definitions or explanations. No "here's what `clarity` means"
  glossary.
- **not a ghostwriter** — no pre-fill of any textarea. The
  previous-phase score reference in step 2 is a **separate muted
  line** above each row, not a pre-selected segment. The three
  question copy is fixed but *only* the copy; answers are
  user-authored. Zero LLM, zero network, zero system-generated
  body text.
- **not a cheerleader** — no toast, no confetti, no
  congratulatory copy on submit. Stats are ink-tally segments
  ("factual mark"), the 偏离率 percent in the stat strip reads
  `{drift_days/planned_days * 100}%` with no verdict text.
  Submit closes the wizard and returns to the list — no success
  banner.
- **not a planner** — the wizard does not generate or suggest
  any content. `nextPhaseFirstThing` is a user-authored answer
  slot, not a system suggestion. The wizard does not score the
  user, does not summarize the phase, does not pick which phase
  to retro (the eligible-segment rule is deterministic).

Passes all four.

### Preserved invariants

- No runtime LLM. No network calls. All data comes from Prisma.
- One additive schema migration (`nextPhaseFirstThing`). The
  Prisma 7 migrate flow per web/AGENTS.md applies — schema file
  edit + `npx prisma migrate dev --name
  add-retro-next-phase-first-thing` + re-running `prisma
  generate`. Codex should follow `web/node_modules/next/dist/docs/`
  for anything that interacts with server actions' typed
  parameters.
- Apple system font stack, amber-only accent, drift = dusty
  brick, done = muted sage, no italics, no emoji.
- UI copy in Simplified Chinese; code, comments, identifiers in
  English.
- `/retros` remains a server component at the page level. Client
  boundaries in this slice: `PhaseRetroEntry.tsx` (page-head
  wrapper + mode state), `PhaseRetroWizard.tsx` (the 5-step
  wizard), `RetroScoresRow.tsx` (reuses the tally pattern; a
  retro-specific wrapper because it carries the optional
  previous-phase reference line — see M2).
  `PhaseRetroCard.tsx` is pure render — keep it server-safe (no
  `"use client"`). None import Prisma.
- Submit writes through Next.js 16 server actions — no new API
  routes. Every action validates at the Zod boundary.
- `web/AGENTS.md` signals "This is NOT the Next.js you know";
  Codex must read `web/node_modules/next/dist/docs/` before
  writing server actions, async page components with
  `searchParams`, or client boundaries.

### Non-goals for this slice

- No `/today` hook for `nextPhaseFirstThing`. Storing it is in
  scope; pinning it to the next segment's day-1 `/today` page
  is not. Future Today polish slice.
- No edit flow for committed retros. Once `upsertRetro` creates
  a row, v1 UI does not expose a re-open path. Revisit during
  dogfood.
- No multi-segment or cross-project comparison beyond the
  single previous-phase score reference in step 2.
- No markdown / rich text in any textarea. Plain text; preserve
  newlines on render, no HTML parsing.
- No keyboard-shortcut binding for `⌘↵` submit. Glyph renders
  (matches weekly pattern) but the listener is parked with the
  rest of the shortcut system (`N` / `⌘↵` / tab digits).
- No delete / archive of retros.
- No retro reminder / notification.
- No tab-default persistence. The default flips to `phase` for
  this slice (hardcoded). Future decision if preferences enter
  the model.
- No new CSS tokens. `.tally` + `.seg.on` are already present.
- No wizard-progress persistence. If the user reloads mid-wizard
  everything is lost (by design — keeps the "one sitting"
  ethos). Document in footer via the existing
  `检查项的勾选不入库 · 只有你写的字会被记下来` muted line.

## Surface contract (authoritative)

### 0. Routing & project scoping

- `/retros` accepts `?project=<id>` (same semantics as `/today`)
  and `?tab=phase|weekly` — **default `phase` in this slice**
  (flipped from `weekly`).
- `searchParams` is a `Promise` per Next.js 16. Await it inside
  the page component. Use the same `getSearchParam` helper
  currently in `web/app/retros/page.tsx`.
- Server action `upsertRetro` takes the full input object
  explicitly; `segmentId` drives the `@@unique` upsert.

### 1. Page-head

- Title: `复盘` (unchanged).
- Subtitle (mono caps + num):
  `{phaseRetroCount} 份阶段复盘 · {weeklyLogCount} 份周记` —
  unchanged. `phaseRetroCount` is now the real retro count.
- Right-aligned button group depends on `activeTab`:
  - When `activeTab === "phase"`:
    - `周记 · {weeklyLogCount}` ghost button links to
      `?tab=weekly&project=...`.
    - `阶段复盘 ⌘↵` primary button (or disabled variants per
      §PM-Q4) opens the wizard.
  - When `activeTab === "weekly"`:
    - `阶段复盘 · {phaseRetroCount}` ghost button links to
      `?tab=phase&project=...`.
    - `本周复盘 ⌘↵` / `修改本周 ⌘↵` primary button (unchanged
      from weekly-review-flow).
  - Both states preserve the current project in the href via
    `buildRetrosHref(projectId, tab)`.

### 2. Pillbar (tab switcher)

- Unchanged from weekly-review-flow. Two pills: `阶段复盘 · N`
  and `周记 · M`. `aria-selected` reflects `activeTab`.

### 3. Phase tab body (new — replaces placeholder)

Owned by `<PhaseRetroEntry>` (client). Reads `mode` state:

- **`mode === "list"`**:
  - If `retros.length === 0` AND no eligible segment:
    muted empty-state line
    `还没有阶段 · 先把计划跑到段终点再回来`.
  - If `retros.length === 0` AND there is an eligible segment:
    muted empty-state line
    `{第 N 阶段 — name} 已收尾 · 点 阶段复盘 开始`.
  - If `retros.length > 0`: stacked `<PhaseRetroCard>` desc by
    `createdAt` (see §6). Above the list, if there is an
    eligible segment (i.e., a finished segment still pending
    retro), show a muted caption
    `下一段 · 第 N 阶段 — name · 点 阶段复盘 开始`.
- **`mode === "wizard"`**:
  - Replaces the list body (pillbar still visible above, page-head
    still visible). Renders `<PhaseRetroWizard>` bound to the
    eligible segment.
  - The wizard's Cancel / ESC / submit-success all call
    `setMode("list")`.

### 4. Weekly tab body

- Unchanged from weekly-review-flow. Pass-through render of the
  existing `<WeeklyLogCard>` list + empty state.

### 5. Entry component (`PhaseRetroEntry.tsx`, client)

Props:

```ts
{
  projectId: string;
  activeTab: "phase" | "weekly";
  eligibleSegment: {
    id: string;
    order: number;
    name: string;
    startDate: Date;
    endDate: Date;
  } | null;
  eligibleReason: "none_finished" | "all_retroed" | null; // null when eligible
  previousRetroScores: Record<WeeklyScoreKey, number> | null;
  retros: PhaseRetroRecord[];
  // for weekly branch's unchanged button:
  weeklyEntry: WeeklyReviewEntryProps;
}
```

Responsibilities:
- Owns `mode` state (`"list"` default). Persists only for the
  session.
- Renders either the `<PhaseRetroList>` children or the
  `<PhaseRetroWizard>` — NOT both.
- When `activeTab === "weekly"`, delegates to
  `<WeeklyReviewEntry>` unchanged.
- Page-head primary button:
  - `activeTab === "phase"`: `阶段复盘 ⌘↵` (enabled iff
    `eligibleSegment !== null`). Disabled tooltip derives from
    `eligibleReason`. `onClick` → `setMode("wizard")`.
  - `activeTab === "weekly"`: unchanged `WeeklyReviewEntry` body.

### 6. `PhaseRetroCard.tsx` (server-safe, read-only)

Props:

```ts
{
  retro: PhaseRetroRecord;
  segment: { order: number; name: string };
}
```

Shape per design L55–117:

- Header line (serif + mono kicker):
  `第 {segment.order} 阶段 — {segment.name}` ·
   mono ink-3 `提交于 {retro.createdAt "YYYY-MM-DD HH:mm"}`.
- 7-metric stat strip (grid `repeat(7, 1fr)`, dashed bottom
  rule). Each stat: mono caps ink-3 label (from `METRIC_LABEL`
  in `retro/copy.ts`) + mono num. The `drift_days` cell also
  renders a small `{Math.round(drift_days/planned_days*100)}%`
  tag.
- Grid `1fr 1fr`:
  - Left: `BlockLabel` `6 能力自评 · 1–5` + six ink-tally rows
    (same `.tally` / `.seg.on` as weekly-review).
  - Right: `BlockLabel` `三问` + three Q/A entries. `Q{n} ·
    {QUESTION_COPY[n]}` mono caps ink-3 + serif answer with
    `white-space: pre-wrap`.
- Full-width section below: `BlockLabel`
  `Scope 调整 · 承认偏离,非辩解` + numbered `{change} — {reason}`
  list, dashed rule between rows. Empty list renders
  `(无)` in mono ink-4 rather than hiding the block (design
  L103–112 always shows the block).
- New full-width section below (design doesn't render this
  because the seed's retro.nextPhaseFirstThing field doesn't
  exist yet): `BlockLabel` `下一阶段 · 第 1 天第一件事` + serif
  answer. When `nextPhaseFirstThing` is null on an older row
  (shouldn't happen after this slice; guard anyway), render
  `—`.

### 7. `PhaseRetroWizard.tsx` (client, full in-page card)

Props:

```ts
{
  projectId: string;
  segment: { id: string; order: number; name: string; startDate: Date; endDate: Date };
  metrics: RetroMetrics; // server-computed, read-only
  previousScores: Record<WeeklyScoreKey, number> | null;
  onExit: () => void; // exits wizard mode, returns to list
}
```

Layout per design L132–264:

- Header row (serif + mono kicker):
  - Left kicker: mono caps ink-3 `阶段复盘 · 向导`.
  - Left title: serif `第 {order} 阶段 — {name} · 收官`.
  - Right: ghost button `退出` → `onExit()`. Confirm on exit
    iff any textarea has non-empty content (simple
    `confirm()` dialog; match the weekly-review pattern of
    "close discards changes").
- Step rail (grid 5 cols). Each cell: mono num `{n}/5` +
  done checkmark (when `n < step`) + serif step short title
  (from `WIZARD_STEPS[n-1].t.split(" · ")[0]`). Border-top:
  current = 2px amber, done = 2px ink, upcoming = 2px rule.
  Clicking a rail cell jumps to that step (matches design
  L152). Guard: jumping forward past step 3 requires step 3
  to have non-empty answers in all three — if not, keep the
  click inert and flash the row in drift color (60ms).
  Actually — simpler: allow free navigation, only the final
  submit validates. The rail is a navigation aid, not a
  gatekeeper. Validation fires at submit only, errors scroll
  the wizard to the first bad step.
- Below the rail: serif large title `WIZARD_STEPS[step-1].t`
  + serif ink-3 subtitle `WIZARD_STEPS[step-1].s`.
- Step body:
  - **Step 1 — 指标**: grid `repeat(4, 1fr)` of 7 stat cards.
    Each card: mono caps ink-3 label + mono large num. Cards
    reuse `.card` style with 10×14 padding. Read-only.
  - **Step 2 — 六项自评**: six rows of
    `<RetroScoresRow>`. Row body mirrors
    `WeeklyScoresRow` but above the 5-seg tally the row shows
    the muted `上阶段 {label} · {prev}` line when
    `previousScores[key] != null`. Default value null;
    submit requires every row to have 1–5; inline drift-color
    error under the row on validation failure.
  - **Step 3 — 三问**: three rows. Each row: mono caps ink-3
    `Q{n} · {QUESTION_COPY[n]}` label + textarea `rows={4}`
    that auto-grows (reuse the `resizeTextarea` helper from
    `WeeklyReviewModal.tsx` — lift to
    `web/lib/ui/resize-textarea.ts` in M2 as a shared helper).
    Inline drift-color error under the textarea.
  - **Step 4 — 范围调整**: dynamic list. Each row:
    `<input className="input" placeholder="砍了/加了什么" />`
    + `<input className="input" placeholder="为什么" />` +
    ghost `×` to remove row. Below the list: `+ 再加一条`
    muted button appends an empty row. Empty-row state on
    enter: zero rows (not one). Validation: empty rows
    silently drop at submit; non-empty rows require both
    fields (inline error below the pair).
  - **Step 5 — 留钩子**: mono caps ink-3 label
    `第 {nextSegmentOrder} 阶段 · 第 1 天第一件事` (where
    `nextSegmentOrder = segment.order + 1`) + full-width
    `<input className="input" />` with placeholder
    `具体到动作。『继续学习』不算。`. Below: mono ink-4 hint
    `这条会被钉在下一阶段第 1 天的今日页 · 你不能假装没看见`
    (design L247–248). **Note:** the "pin to day 1" wiring
    is parked; the hint still renders truthfully because
    we store the string and a later slice will render it.
    Inline drift-color error on empty.
- Footer:
  - Muted left: `检查项的勾选不入库 · 只有你写的字会被记下来`
    (design L255).
  - Right:
    - ghost `← 上一步` (disabled on step 1).
    - primary `下一步 →` (steps 1–4) or `提交复盘 ⌘↵`
      (step 5).

Submit flow:

- Client assembles `RetroCreateInput`. Drops empty
  `scopeChanges` rows. Calls `upsertRetro`.
- On `{ ok: true }`: `onExit()`. Page revalidates, list
  shows the new card.
- On `{ ok: false, fieldErrors }`: stay in wizard, scroll
  to the first step that contains an error, surface inline
  messages. Focus the first errored field.

### 8. Revalidation

- `upsertRetro` calls `revalidatePath("/retros")`. That is the
  only path that depends on retros in this slice.

## Milestones

### M1 — data layer + schema migration

- **Schema migration**:
  - Edit `web/prisma/schema.prisma` `Retro` model: add
    `nextPhaseFirstThing String?` (nullable to survive existing
    rows).
  - Run `npx prisma migrate dev --name
    add-retro-next-phase-first-thing` (or Windows equivalent
    invoked via `npm run db:migrate:dev -- --name ...` — match
    whatever script exists in `package.json`; if none, run
    prisma directly).
  - Run `npx prisma generate` as needed. Commit the generated
    migration SQL under
    `web/prisma/migrations/<timestamp>_add-retro-next-phase-first-thing/`.
- **Rewrite `web/lib/schemas/retro.ts`** to match design shape:
  - `retroThreeQuestions = z.object({ q1, q2, q3 })` where each
    is trimmed 1–2000 chars with the `REFLECTION_*` copy from
    `retro/copy.ts`.
  - `retroScopeChange = z.object({ change: z.string().trim().min(1).max(500), reason: z.string().trim().min(1).max(500) })`.
  - `retroScopeChanges = z.array(retroScopeChange)` (allowed to
    be length 0).
  - `retroMetrics = z.object({ commits, logs, learnings, bugs, prompts, planned_days, drift_days })`
    — each `z.number().int().min(0)`.
  - `retroSelfScores = z.object({ clarity, honesty, output, depth, discipline, energy })`
    — each `z.number().int().min(1).max(5)` with the `SCORE_*`
    error copy.
  - `retroNextPhaseFirstThing = z.string().trim().min(1).max(500)`.
  - `retroCreate = z.object({ segmentId, metrics, selfScores, threeQuestions, scopeChanges, nextPhaseFirstThing })`.
  - Drop `retroUpdate` (no edit path in v1).
  - Update in-source tests to match the new shape.
- **New `web/lib/retro/copy.ts`**:
  - `RETRO_THREE_QUESTION_ORDER = ["q1", "q2", "q3"] as const`
  - `RETRO_THREE_QUESTION_COPY: Record<...>` with the three
    locked strings.
  - `RETRO_SCORE_KEYS` — re-export from `weekly-log/copy.ts`
    (same six keys). Do not duplicate.
  - `RETRO_SCORE_LABEL` — same. Re-export.
  - `RETRO_METRIC_KEYS = ["commits", "logs", "learnings", "bugs", "prompts", "planned_days", "drift_days"] as const`.
  - `RETRO_METRIC_LABEL` — Chinese labels from
    `Retros.jsx` L7–13 (verbatim for the seven in-scope keys).
  - `RETRO_WIZARD_STEPS` — verbatim from design L119–130.
  - Error copy constants per §PM-Q6 above.
- **New `web/lib/retro/presentation.ts`**:
  - `selectEligibleSegment(project, segments, retros, now): { segment, reason } | null`
    — pure function per §PM-Q4. Covered by in-source Vitest
    cases (no eligible / first eligible picks most-recent /
    previously-retro'd segments are skipped / segments whose
    `endDate >= now` are skipped / no finished segments returns
    `reason === "none_finished"` / all finished already retro'd
    returns `reason === "all_retroed"`).
  - `pickPreviousRetro(eligibleSegment, segments, retros): Retro | null`
    — returns the retro of the segment whose `order` is
    `eligibleSegment.order - 1` (or by `startDate` if `order`
    ties).
- **New `web/lib/retro/metrics.ts`**:
  - `computeRetroMetrics(projectId, segment, prisma): Promise<RetroMetrics>`.
  - Queries (all `findMany` + in-memory reduce):
    - `logs` = `dailyLog.count({ projectId, date ∈ window })`.
    - `learnings / bugs / prompts` =
      `knowledgeItem.count({ projectId, type, createdAt ∈ window })`.
    - `commits` = two-step. First: IDs of
      `knowledgeItem.findMany({ projectId, createdAt ∈ window, select: { id } })`.
      Then: `artifact.count({ kind: "commit", ownerType: "knowledge_item", ownerId: { in: ids } })`.
      If `ids` is empty, return 0 without hitting the artifact
      table.
    - `planned_days` = `planDay.count({ segmentId: segment.id })`.
    - `drift_days` per §PM-Q3 formula.
  - In-source Vitest coverage for drift_days math (skeleton
    seed + small sets) — integration-level coverage lives in
    the test file under M4.
- **New `web/lib/retro/queries.ts`**:
  - `getRetroBySegmentId(segmentId, prisma): Promise<RetroRecord | null>`.
  - `listRetrosForProject(projectId, prisma): Promise<RetroRecord[]>`
    — desc by `createdAt`.
  - `RetroRecord` = parsed shape (metrics / selfScores /
    threeQuestions / scopeChanges / nextPhaseFirstThing as
    typed objects, mirroring `WeeklyLogRecord`'s JSON-parse
    pattern).
- **New `web/lib/retro/actions.ts`**:
  - `"use server"` module.
  - `upsertRetro(input: RetroCreateRawInput): Promise<RetroActionResult>`.
  - Flow: `retroCreate.safeParse` → if fail, shape errors;
    if pass, `prisma.retro.upsert({ where: { segmentId },
    create: {...}, update: {...} })` — metrics included
    in the upsert payload (they came from the server, so
    re-parse-validate then write). `revalidatePath("/retros")`
    on success.
- **Commit**: `retro-flow M1: retro schema migration + Zod
  rewrite + data layer`.

### M2 — UI primitives

- **New `web/components/retro/`**:
  - `PhaseRetroEntry.tsx` (client) — §Surface §5. Owns `mode`
    state. Renders either `<PhaseRetroList>` or
    `<PhaseRetroWizard>`. Page-head button pulled into this
    component (so the wizard-open state and the button live
    together).
  - `PhaseRetroList.tsx` — server-safe pure render of the
    muted captions + `<PhaseRetroCard>` stack per Surface §3.
  - `PhaseRetroCard.tsx` — server-safe. Per Surface §6.
  - `PhaseRetroWizard.tsx` (client) — 5-step in-page wizard
    per Surface §7. Owns wizard form state.
  - `RetroScoresRow.tsx` (client) — wraps the `.tally` tally
    row with the optional previous-phase reference line.
    Compose the weekly-review `WeeklyScoresRow` if its API
    admits the extra line via a new optional prop; otherwise
    write a sibling component. **Prefer extending
    `WeeklyScoresRow` via an optional `referenceLine?: string`
    prop** — one file, one pattern. Update the weekly-review
    call site to pass `undefined` (no behavior change).
- **New `web/lib/ui/resize-textarea.ts`**: lift
  `resizeTextarea` from `WeeklyReviewModal.tsx` to a shared
  helper (pure function; no React). Update
  `WeeklyReviewModal.tsx` to import from here instead of
  defining locally. No test (trivial DOM setter).
- **CSS**: no new rules. `.tally` + `.seg.on` already in
  `globals.css`. If step 4's `+ 再加一条` / `×` buttons need
  a muted row styling, use existing `.btn btn--ghost` classes.
- **Commit**: `retro-flow M2: phase retro wizard + card primitives`.

### M3 — /retros page rework

- Update `web/app/retros/page.tsx`:
  - **Flip default tab** — when `tab` param is missing, default
    to `"phase"` (was `"weekly"`).
  - Await `searchParams`; read `project` and `tab`.
  - Resolve active project via `resolveActiveProject`.
  - When no project: existing empty-state branch (unchanged).
  - Fetch (in `Promise.all`):
    - `segments` — `project.segments` (already loaded via
      `resolveActiveProject`'s include).
    - `retros` = `listRetrosForProject(projectId, prisma)`.
    - `thisWeekStart` / `thisWeekEnd` / `existingLog` /
      `previousLog` / `weeklyLogs` — unchanged weekly path.
  - Derive:
    - `phaseRetroCount = retros.length` (was hardcoded 0).
    - `eligibleResult = selectEligibleSegment(project, segments, retros, startOfLocalDay(new Date()))`.
    - `previousRetro = eligibleResult?.segment ? pickPreviousRetro(...) : null`.
    - `previousScores = previousRetro?.selfScores ?? null`.
    - `metrics = eligibleResult?.segment ? await computeRetroMetrics(projectId, eligibleResult.segment, prisma) : null`.
  - Page-head button group: branch on `activeTab` per Surface
    §1. Weekly branch passes same props as before; phase
    branch mounts `<PhaseRetroEntry>`.
  - Tab body: branch on `activeTab`. `phase` mounts
    `<PhaseRetroEntry mode-dependent body>`; `weekly` mounts
    the existing weekly body unchanged.
  - **Critically**: Move the page-head button responsibility
    INTO the entry components (both weekly and phase), because
    the entry components own modal/wizard state. The page
    stays a server component and passes props; the client
    components render BOTH the page-head button and their
    body. To avoid cross-slot confusion, render a single
    `<RetroEntry activeTab={...} ...>` wrapper that internally
    renders the page-head button via a React portal **only
    if** portals are stable in Next.js 16. **Simpler
    alternative**: render the page-head button inside the
    page-head via a server-driven branch, and have the body
    render a companion `PhaseRetroBody` client component that
    shares state through a URL param (`?wizard=1`).
    **Decision**: go with the URL-param approach.
    `?wizard=1` on `/retros?tab=phase` puts the body in
    wizard mode. Page-head button href toggles it on;
    exit/submit strips it. This keeps everything server-driven
    and avoids React context threading across the page head.
    **Corollary**: the wizard form state is still client
    (useState) — it's just the open/closed mode that is
    URL-driven. Weekly-review stays as-is (modal, no URL
    param).
- **Commit**: `retro-flow M3: /retros phase tab live`.

### M4 — tests

- **New `web/tests/retro-upsert.test.ts`** (temp SQLite DB):
  - Case: create succeeds when segment has no prior retro;
    row persisted with every field.
  - Case: update succeeds — second call with same `segmentId`
    overwrites `threeQuestions` and keeps `createdAt`
    stable. (Even though there's no UI edit path, the action
    is an upsert; test it.)
  - Case: missing `nextPhaseFirstThing` → fieldErrors.
  - Case: `threeQuestions.q2` whitespace-only → fieldErrors.
  - Case: `selfScores.clarity = 7` → fieldErrors.
  - Case: `scopeChanges = []` passes.
  - Case: `scopeChanges = [{ change: "x", reason: "" }]` →
    fieldErrors.
- **New `web/tests/retro-metrics.test.ts`** (temp SQLite DB):
  - Seeds a project + segment window + a mix of DailyLog /
    KnowledgeItem / Artifact / PlanDay rows. Asserts the
    seven returned numbers match expectation. Specifically
    covers:
    - drift_days: planned date with no log counted; planned
      date with log NOT counted; logged date outside segment
      window not counted in logs; logged date inside window
      without a PlanDay not counted in drift_days.
    - commits: artifact pointing to a knowledge item outside
      the window is excluded; artifact of wrong `kind` is
      excluded; artifact whose `ownerType` is `daily_log` is
      excluded (scope: knowledge_item-owned commits only;
      documented in metrics.ts).
- **New `web/tests/retros-page.test.tsx`** — append cases
  rather than replacing:
  - The existing five cases stay green (may need the default
    tab assertion flipped from `weekly` to `phase`).
  - Add: phase tab default empty state (no segments) shows
    `还没有阶段 · 先把计划跑到段终点再回来`.
  - Add: phase tab shows eligible-segment caption when a
    finished segment has no retro.
  - Add: phase tab shows a `<PhaseRetroCard>` when a retro
    exists, with the `第 N 阶段 — name` header and all seven
    stats visible.
  - Add: with `?tab=phase&wizard=1` the wizard renders in
    place of the list.
  - Does NOT drive the wizard submit through RTL — action
    coverage lives in `retro-upsert.test.ts`.
- **In-source** tests from M1 (`selectEligibleSegment`,
  `pickPreviousRetro`) are auto-collected by Vitest
  `includeSource`. No separate file.
- **Commit**: `retro-flow M4: retro tests`.

### M5 — doc sync

- `docs/STATE.md`:
  - Flip current phase to
    "`retro-flow` implementation complete; fresh-context
    review pending".
  - Add retro files to `Repository contents`.
  - Refresh `Verification Snapshot` with the new test count.
  - Point `Recommended Next Step` at the fresh-context review
    of `retro-flow`.
  - Note the migration name
    (`add-retro-next-phase-first-thing`) under Known Open
    Questions if any friction surfaces; otherwise no open
    question.
- No PRD change. No decision-record change.
- **Commit**: `retro-flow M5: doc sync`.

## Verification

All must pass before review hand-off. Run verifier order
`build → typecheck → lint → test` to sidestep the Next.js 16
`.next/types/routes.js` artifact documented in STATE.md Known
Open Questions.

- `cd web && npx prisma migrate dev --name add-retro-next-phase-first-thing` — green;
  new migration committed.
- `cd web && npm run build` — green; `/retros` remains dynamic
  (`ƒ`); other routes unchanged.
- `cd web && npm run typecheck` — green.
- `cd web && npm run lint` — green.
- `cd web && npm test` — green; Codex reports the count delta
  from 119.
- Manual smoke on `next build` + `next start`:
  1. Seeded project with one finished segment (endDate < now)
     and no retro. Open `/retros` (default tab now = phase).
     Empty phase list with eligible-segment caption visible;
     page-head shows enabled `阶段复盘 ⌘↵` button.
  2. Click the button. Wizard replaces list. Step rail shows
     1/5 active. Step 1 renders 7 metric cards with
     non-negative integers. Click forward to step 5 without
     filling — submit button is `提交复盘 ⌘↵`. Click
     submit — inline errors on steps 2/3/5; wizard scrolls
     to step 2.
  3. Back to step 2. Click through six tally rows to score
     3/4/3/3/4/4. Previous-phase reference line should NOT
     render (no prior retro). Advance to step 3, fill three
     answers. Advance to step 4, add one row
     `砍掉 X` / `ROI 太低`, and one empty row. Advance to
     step 5, fill `继续跑 baseline`. Submit.
  4. Wizard closes; list now has one card. Card header shows
     `第 N 阶段 — name`; 7 stats strip renders with correct
     drift-percent tag; 6 tally rows render; 3 Q/A pairs
     render; scope list shows one entry (the empty one was
     dropped); 下一阶段 section shows `继续跑 baseline`.
  5. Seed a second finished segment and a retro for the
     first. Reload `/retros`. Eligible-segment caption now
     points at the second segment. Click `阶段复盘 ⌘↵`. Step
     2 should now show `上阶段 清晰度 · 3` (or whatever the
     prior retro had) above each row. Previous scores must
     NOT be pre-selected.
  6. Switch project via sidebar; list + wizard button states
     rerender scoped to the new project; no bleed.
  7. Switch to `?tab=weekly` — weekly surface unchanged;
     page-head button flips back to `本周复盘` / `修改本周`.

## Open questions / parked

All PM-level questions were resolved 2026-04-22 (all option 1);
parked items below are intentional follow-up.

- **`/today` pin for `nextPhaseFirstThing`** — future Today
  polish slice. Not blocking retro write.
- **Edit flow for committed retros** — not exposed in v1 UI.
  Server action is already an upsert, so the future UI work
  is just the button + confirm flow.
- **`⌘↵` keyboard binding** — glyph renders; listener parked
  with the rest of the shortcut system.
- **Commit counting beyond knowledge_item-owned artifacts** —
  `retro-flow`'s metrics intentionally count only commits
  attached to knowledge items. If dogfood shows
  `daily_log`-owned commits becoming common, widen the
  ownerType filter.
- **Weekly/phase score visual parity** — both use the same
  `.tally` / `.seg.on` classes. If dogfood wants a different
  visual per surface, revisit.
- **Past-segment retro visibility** — any committed retro
  stays visible on the card list. No archive concept.
- **Multi-project rollups** — out of v1.

## Progress log

_Codex appends one entry per milestone as it lands. Keep
entries short: milestone id, commit sha, one-line outcome._

- M1 · `32c00b3` · Schema migration, retro Zod rewrite, and retro data layer landed.
- M2 · `d8675ed` · Added the phase retro wizard, read-only cards, and shared UI primitives.
- M3 · `d44046b` · Made `/retros` default to phase and wired the live phase tab.
- M4 · `9000c88` · Added retro action/metrics coverage and expanded `/retros` page tests.
- M5 · `afd5239` · Synced STATE and finalized verification notes for review handoff.
