# ExecPlan — knowledge-capture-inline

**Status:** open
**Owner (impl):** Codex (to be handed off)
**Owner (PM):** Claude / human PM
**Opened:** 2026-04-21
**Target close:** 2026-04-23 (≈ 1–2 working sessions)

## Goal

After this slice lands, `/knowledge` stops being a placeholder and
becomes the primary inline capture surface for
`knowledge_item` records (`learning` / `concept` / `bug` / `prompt`).
A single `ledger`-styled page carries (a) a type-filtered,
title/tag-searchable list of existing items and (b) a top-of-page
inline compose form for creating a new item. The `/today` page's
`最近动静` block flips from empty-state to a live top-5 feed of the
active project's most recently captured `knowledge_item` rows. An
optional single-pointer `artifact` can be attached at capture time.

## Context

- Preceding slice: [`today-page-skeleton`](./archive/today-page-skeleton.md)
  closed 2026-04-21 with verdict `ship`. `/today` already consumes the
  seeded `Project` / `PlanSegment` / `PlanDay` rows and renders its
  `最近动静` block in empty-state mode; this slice lights that block
  up. Project URL scheme (`?project=<id>`) is already established and
  is reused here.
- Design anchors:
  - `docs/design/study-system/project/src/Knowledge.jsx` — layout
    spec for the `/knowledge` page (head row, type pillbar + search,
    ledger table, inline compose card with top amber rule, per-type
    placeholder copy in the body textarea).
  - [`docs/decisions/0001-design-handoff-reference.md`](../decisions/0001-design-handoff-reference.md)
    — visual tokens, paper-ledger aesthetic, type-badge iconography,
    global `N = 新建` shortcut (explicitly deferred in this slice —
    see non-goals).
- PRD anchors:
  - §3 D-2 — `knowledge_item` single-table polymorphic
    (`learning` / `concept` / `bug` / `prompt`); common fields on
    columns, per-type fields in `metadata` JSON.
  - §1 anti-patterns — **not a tutor** (we render items the user
    wrote, never explain a concept), **not a ghostwriter** (form
    never pre-fills body; no LLM-drafted text), **not a
    cheerleader** (no badges, no streaks, no "great learning!"
    copy), **not a planner** (capture is ad-hoc; the form does not
    recommend what to learn).
  - §5 — v1 has **no LLM**. The form's only server-side string
    transform is slug derivation.
  - §7 MVP item 3 — "随时沉淀 knowledge_item".
  - §8 acceptance — "能记 learning / bug / prompt / concept 四种
    knowledge_item" and "能挂外部 artifact".
- Downstream dependency: `daily-log-flow` will later let the user
  attach a knowledge_item pointer from inside the end-of-day wizard.
  That integration point reads the same `KnowledgeItem` table; no
  reshape needed.

### PM-confirmed choices (locked before Codex handoff)

_All confirmed by PM 2026-04-21._

1. **Input mode is `inline` only.** Tweaks-axis variants `modal` and
   `drawer` are explicitly dropped for v1. The Tweaks toggle UI is
   out of scope for this slice and for the remaining dogfood
   slices. If dogfood surfaces a real need, reopen in v1.1 as its
   own decision.
2. **No form-level AI helpers in the UI.** The design bundle's
   tag-suggestion chips, related-items panel, and slug-preview
   field are all dropped. The form shows only: type tabs, title
   input, body textarea (per-type placeholder copy only), tag chip
   editor (free-form, no suggestions), artifact pointer input.
3. **Slug is server-derived silently.** Schema
   (`@@unique([projectId, slug])`) keeps `slug` as a required
   column. On submit, the server derives a kebab-case slug from
   the title; on collision within the project, append `-2`, `-3`,
   … . The form never renders the slug. Derivation is a pure
   deterministic string transform — no LLM, no network call.
4. **No global `N` shortcut wiring in this slice.** The `N` binding
   stays inert for now to avoid introducing cross-surface
   navigation state. `/knowledge` exposes its own explicit
   `+learning` / `+concept` / `+bug` / `+prompt` buttons. Global
   `N` can be revisited after `daily-log-flow`.
5. **Artifact attachment at capture is single-pointer.** One
   optional `url_or_path` input on the form; on submit, if
   non-empty, create one `Artifact` row with
   `ownerType = "knowledge_item"` and `ownerId = <new item id>`.
   Kind is inferred from the URL (`/commit/` → `commit`,
   path-like + image extension → `screenshot`, else → `link`).
   Multi-artifact UX and after-the-fact artifact attachment are
   out of scope.
6. **Metadata is empty for v1.** All four types share the same form
   and persist `metadata = {}`. Per-type structured fields
   (`bug.reproduction_steps`, `prompt.applicability`, …) wait on
   dogfood demand.
7. **Filter / search shape.** Type filter is URL-driven
   (`/knowledge?project=<id>&type=<kind>`). The search input is a
   thin client child that filters the already-rendered list in
   memory by title + tag substring. The list is capped at the
   project's 200 most-recent rows (ordered by `createdAt` desc);
   if the project exceeds that, render a muted footer
   `仅显示最近 200 条，更早的条目请用类型筛选`. Deferring
   server-side pagination until dogfood proves it needed.
8. **`/today` `最近动静` wiring.** Top 5 `KnowledgeItem` rows for
   the active project, ordered by `createdAt` desc. Each row shows
   a type badge + title + relative date (e.g. `2d`, `昨日`,
   `今日`). Zero-knowledge state keeps the existing empty-state
   copy.

## Constraints

### Anti-pattern check (PRD §1)

- **not a tutor** — the page renders the user's own captured rows
  and exposes a form to capture more. No canonical definitions, no
  concept glossary, no "what is X" lookup.
- **not a ghostwriter** — the form's body textarea starts empty for
  every new item. The per-type placeholder strings (`我原本以为…`,
  `定义 · 最小例子 · 常见误解`, `现象 · 复现步骤 · 根因 · 规避`,
  `提示词正文 · 适用场景 · 注意事项`) are hint text that disappears
  on first keystroke; they are not editable defaults and are not
  persisted. No pre-fill from prior items. No LLM drafting.
- **not a cheerleader** — no item counts are framed as milestones.
  The existing `X 条 · Y 心得 · Z 概念 · …` counter in the page head
  is a flat factual status line per decision 0001. No colored
  badges, no streak UI, no "great catch!" copy.
- **not a planner** — the form does not recommend tags, related
  items, next topics, or slugs. The user types every content
  field.

Passes all four.

### Preserved invariants

- No runtime LLM. No network calls from the page. All data comes
  from Prisma.
- No schema changes. This slice writes to `KnowledgeItem` and
  `Artifact` using the columns already shipped in the init + the
  two subsequent migrations.
- Apple system font stack, amber-only accent, drift = dusty brick,
  done = muted sage, no italics, no emoji (decision 0001).
- UI copy in Simplified Chinese; code, comments, identifiers in
  English.
- `/knowledge` remains a server component at the page level. The
  inline compose form and the search input are the only client
  boundaries in this slice; both take data as props and do no
  Prisma imports.
- Submit path writes through a Next.js 16 server action (same file
  or a `web/lib/knowledge/actions.ts` module) — no new API route.
  Server action validates input at the Zod boundary before Prisma
  insert.

### Non-goals for this slice

- No modal / drawer variants of the capture form.
- No Tweaks panel or Tweaks-axis toggling UI.
- No edit / delete of existing knowledge_items. v1 writes are
  append-only; edit/delete waits on dogfood demand.
- No detail view for a knowledge_item (clicking a row does
  nothing in this slice). The title column is plain text; the
  `#<id>` column is plain text.
- No global `N` keyboard shortcut wiring.
- No search on tag-chip overlap; search is pure substring on
  title + tag strings.
- No after-the-fact artifact attachment UI, no multi-artifact on
  capture.
- No rendering of knowledge_item body markdown in the list — list
  shows title + the first line of body as plain-text `excerpt`
  (CSS line-clamp). Full body rendering waits for the detail-view
  slice.
- No population of other `/today` blocks (`昨日之承诺`,
  `未清账`, `阻塞` remain in empty-state pending
  `daily-log-flow`). Fact-strip fact #1 `累计 commits` also stays
  `—` in this slice — commit artifacts will exist in the DB after
  this slice but the fact-strip wiring for them is out of scope
  (it is a Today concern, not a Knowledge concern; roll it into a
  follow-up nit or into `daily-log-flow`, the PM will decide at
  closure).

## Surface contract (authoritative for this slice)

Render `/knowledge` as follows, reading
`docs/design/study-system/project/src/Knowledge.jsx` for visual
detail.

### 0. Routing & project scoping

- `/knowledge` accepts `?project=<id>&type=<kind>` search params.
  Resolution order for the project:
  1. `project` param matching a `Project.id`
  2. most-recently-started project
     (`ORDER BY startDate DESC LIMIT 1`)
  3. empty DB → empty-state mirroring `/today`'s no-project pane
- `type` param values: `all` (default), `learning`, `concept`,
  `bug`, `prompt`. Anything else falls back to `all`.
- Sidebar links continue to route `/today?project=<id>` — sidebar
  semantics stay single-purpose (Today switcher). This page is
  reached via the top-nav `3 · 知识库` tab, which already exists.
- `/knowledge/page.tsx` is a server component. It reads
  `searchParams`, resolves the project, fetches the capped list,
  and renders it.

### 1. Page head

- Title `知识库` + page-sub counter
  `{total} 条 · {learning} 心得 · {concept} 概念 · {bug} 缺陷 · {prompt} 提示词`
  using `font-variant-numeric: tabular-nums slashed-zero`.
- Right-aligned button row: `+learning` / `+concept` / `+bug` /
  `+prompt`. `+prompt` is the primary (filled) button per the
  prototype. Each button opens the inline compose card with that
  type preselected.

### 2. Filter pillbar + search

- Type pills: `all / learning / concept / bug / prompt`. Each pill
  links to `/knowledge?project=<id>&type=<kind>`. Active pill
  carries `aria-selected="true"` styled per decision 0001.
- Search input (width 260px, bottom-ruled, not bordered): thin
  client component, filters the already-rendered rows in-memory
  by case-insensitive substring against `title` + joined `tags`.
  The server-rendered list is the data source; the client does
  not re-fetch.

### 3. Inline compose card

- Hidden by default. Opens when the user clicks one of the four
  `+<type>` buttons. One open at a time.
- Card chrome: `card` class, 12/16 padding, top border
  `2px solid var(--amber)` (design prototype).
- Composition, left column first (2fr):
  - **Type tab strip** at the card head (four tabs, active = ink
    background + paper foreground). Switching tabs updates body
    placeholder copy only; other fields persist.
  - **Title** input: autofocus, placeholder
    `一句话: 这条心得在讲什么`. Required, trimmed, 1–160 chars.
  - **Body** textarea: 3 rows (compact mode per prototype).
    Per-type placeholder per PM choice §2. Required, trimmed,
    min 1 char.
  - **产出指针 · 外部产出（URL / 本地路径）** input: optional,
    trimmed, max 500 chars.
- Right column (1fr):
  - **Tag chip editor.** Existing chips with `×` to remove;
    inline input `+ 标签 ↵` pushes a new chip on Enter. Max 12
    chips. Each chip 1–32 chars after trimming, no commas, no
    whitespace inside. No suggestion row (PM choice §2).
  - Card footer muted note: `正文你自己写 · AI 不参与`. This is a
    flipped version of the prototype copy ("AI 只帮你生成标识 /
    推荐标签 / 找关联 · 正文你自己写") because v1 has no AI at
    all.
- Card footer row:
  - Left: the muted note above.
  - Right: `存为草稿` (disabled — draft persistence is a later
    slice) and `提交` (primary). Keyboard `⌘↵` submits.
- Submit calls the server action. On success, card closes, list
  refreshes. On validation error, card stays open with field
  errors rendered in the muted drift color (decision 0001).

### 4. List (ledger table)

- Columns per prototype:

  | width | column | content |
  |---|---|---|
  | 92 | 类型 | `TypeTag` — icon + caps type label |
  | 80 | ID | `mono ink-3 num` — short id (`k_xxxx`) |
  | flex | 标题 | serif title + muted single-line excerpt (first line of body, max 120 chars) |
  | 200 | 标签 | chip row |
  | 86 | 更新于 | `mono ink-3 num` — `MM-DD` slice of `updatedAt` |
  | 50 (right) | 产出 | count of attached artifacts, `—` if 0 |
  | 50 (right) | 关联 | `—` in v1 (no relationships yet) |

- Rows are plain `<tr>` — no hover affordance that implies
  navigation. (Detail-view slice will add row links.)
- Empty result set: render muted row `无条目 · 用上面的按钮新建`.

### 5. `/today` `最近动静` block wiring

- Replace the empty-state in `web/components/today/Block.tsx`'s
  `最近动静` instance with a list of up to 5 rows.
- Query: `KnowledgeItem.findMany({ where: { projectId },
  orderBy: { createdAt: "desc" }, take: 5 })`.
- Each row: `TypeTag` + title (single line, ellipsis) + relative
  date (`今日` / `昨日` / `Nd`). Plain text rows for now.
- Zero-knowledge state keeps the existing empty-state copy
  (`尚未记录 — knowledge-capture-inline 落地后会显示最近沉淀`) —
  but flip the deferral phrase to `尚未记录 · 用 /knowledge 新建
  第一条` so the copy stops promising a slice that has landed.

## Milestones

### M1 — server-side data layer

- `web/lib/knowledge/queries.ts`
  - `listKnowledgeForProject(projectId: string, type: KnowledgeType | "all")`
    returning up to 200 rows ordered by `createdAt` desc. Joins
    artifact counts in one query (Prisma `_count` relation is not
    available because `Artifact` has no FK relation — count with
    a second grouped query, key by `ownerId`).
  - `listRecentKnowledgeForToday(projectId: string)` returning
    top 5 by `createdAt` desc. Used by `/today`.
  - `countByType(projectId: string)` for the page-head counter.
- `web/lib/knowledge/slug.ts`
  - `deriveSlug(title: string)` — deterministic kebab-case
    transform (lowercase, strip non-word, collapse whitespace to
    `-`, trim, cap at 60 chars). Pure function; exhaustively
    covered by in-source `if (import.meta.vitest)` tests
    including CJK-only titles (falls back to `item`), punctuation,
    leading/trailing dashes.
  - `resolveSlugCollision(projectId, baseSlug, prisma)` — appends
    `-2`, `-3`, … until
    `KnowledgeItem.findUnique({ projectId_slug })` returns null.
    Temp-DB test coverage.
- `web/lib/knowledge/artifact-kind.ts`
  - `inferArtifactKind(urlOrPath: string): "commit" | "screenshot" | "link"`
    — pure function; in-source tests covering
    `github.com/.../commit/<sha>` → `commit`,
    `*.{png,jpg,jpeg,webp,gif}` or `screenshots/*` → `screenshot`,
    else → `link`.
- `web/lib/knowledge/actions.ts`
  - `"use server"` module. Exports `createKnowledgeItem(formData)`
    — validates via Zod at the boundary
    (`web/lib/schemas/knowledge_item.ts` already exists; extend
    only if required), derives slug, resolves collision, writes
    `KnowledgeItem`; if `urlOrPath` is non-empty, writes one
    `Artifact` row in the same transaction; calls
    `revalidatePath("/knowledge")` and
    `revalidatePath("/today")`; returns `{ ok: true }` or
    `{ ok: false, fieldErrors }`.
- Commit per milestone as usual.

### M2 — UI primitives

- `web/components/knowledge/TypeTag.tsx` — server component;
  renders the type icon + caps label per decision 0001 token set.
- `web/components/knowledge/KnowledgeList.tsx` — server component;
  renders the ledger `<table>`. Takes `items`, `countsByType`,
  `activeType` as props.
- `web/components/knowledge/TypePillbar.tsx` — server component;
  renders the type filter pills as `<a>` links carrying the
  correct `?project=` + `?type=` query. Active pill marked with
  `aria-selected="true"`.
- `web/components/knowledge/SearchBox.tsx` — thin client
  component. Reads URL `?q=` via `useSearchParams()` as a
  controlled-input hint; on input change, updates the URL with
  `router.replace({ query: { ..., q } }, { scroll: false })` OR
  filters an in-memory list. **Choose the simplest path that
  keeps the server list as source of truth.** If the existing
  Next.js 16 App Router guidance in
  `web/node_modules/next/dist/docs/` says `useSearchParams`
  triggers full server re-render, pick URL-sync; otherwise pick
  in-memory filter keyed off a sibling `<KnowledgeListClient>`
  wrapper that takes the server-rendered rows as props. Either
  way: no Prisma import in this file.
- `web/components/knowledge/InlineCompose.tsx` — client
  component. Holds title / body / tags / artifact / type state;
  calls the server action on submit; renders field errors on
  failure. No Prisma import. Accepts `initialType` prop so the
  `+learning` / `+concept` / `+bug` / `+prompt` buttons can
  pre-select.
- `web/app/knowledge/_NewButtonRow.tsx` (or equivalent) — the
  four `+<type>` buttons + the open-close state for the compose
  card. Client component; thin.

### M3 — page assembly

- `web/app/knowledge/page.tsx` (server component).
  - Reads `searchParams` (Promise per Next 16).
  - Resolves project via
    `resolveActiveProject(requestedId)` (reuse the helper from
    `web/lib/today/active-project.ts` or factor it out to
    `web/lib/active-project.ts` if reuse proves awkward).
  - Fetches `listKnowledgeForProject`, `countByType`.
  - Renders: `<PageHead>`, `<NewButtonRow>` (client), type
    pillbar, search box (client) + list (server).
  - No-project empty-state mirrors `/today`'s
    `还没有项目。跑 npm run seed 导入一个计划。`

### M4 — `/today` 最近动静 wiring + artifact-kind polish

- Update `web/app/today/page.tsx` to call
  `listRecentKnowledgeForToday(projectId)` and pass the result
  into the `最近动静` `<Block>`.
- `web/components/today/RecentKnowledgeList.tsx` — server
  component; renders up to 5 rows with type badge + title +
  relative date (use the date helper in `web/lib/today/` — factor
  out a `relativeDays(date, today)` helper if needed).
- Flip the `最近动静` empty-state copy to the PM-confirmed string.

### M5 — tests

- In-source unit tests (in module files, guarded by
  `if (import.meta.vitest)`):
  - `slug.ts` — every branch listed in M1.
  - `artifact-kind.ts` — every branch listed in M1.
- Temp-DB integration tests (Vitest, temp SQLite pattern as per
  `web/tests/seed-cli.test.ts`):
  - `web/tests/knowledge-create.test.ts` — seeds a Project, runs
    the server action (invoke the exported async function
    directly, not via HTTP), asserts the `KnowledgeItem` row
    exists with the expected fields, asserts slug collision
    appends `-2`, asserts a non-empty `urlOrPath` produces one
    `Artifact` row with the inferred kind.
  - `web/tests/knowledge-list.test.ts` — seeds 3 items of mixed
    types, asserts `listKnowledgeForProject` with `type = "all"`
    vs specific types returns the right rows in the right order,
    asserts the 200-cap behavior by seeding 205 and expecting
    200.
- Integration render test
  `web/tests/knowledge-page.test.tsx`:
  - Seeds a Project and 4 knowledge items (one per type).
  - Renders `/knowledge` (pattern from
    `web/tests/today-page.test.tsx` — await the async server
    component, hand the element tree to RTL).
  - Asserts: page-head counter, type pillbar links carry the
    right hrefs, default `type = all` shows all four rows,
    `type = learning` shows one row, empty-filter shows the
    `无条目` copy.
  - Does NOT need to assert the inline compose flow through
    RTL — that is covered by the direct server-action test in
    `knowledge-create.test.ts`.
- Integration smoke for `/today` 最近动静:
  - Extend `web/tests/today-page.test.tsx` to seed one
    `KnowledgeItem` and assert the `最近动静` block now renders
    its title + type badge, not the empty-state copy.

### M6 — doc sync

- `docs/STATE.md`:
  - current phase flips to
    "`knowledge-capture-inline` implementation-complete;
    fresh-context review pending"
  - `What Is True Now / Repository contents` gains
    `web/lib/knowledge/`, `web/components/knowledge/`,
    `web/app/knowledge/page.tsx`, and the three new test files
  - `Verification Snapshot` gets the new test count
  - `Recommended Next Step` points to the review session
- No PRD change.
- No decision-record change unless the Tweaks-axis drop becomes
  contentious (PM can write a supersede for decision 0001 later
  if so; not required for this slice to land).

## Verification

All must pass before close-out.

- `cd web && npm run typecheck` — green
- `cd web && npm run lint` — green
- `cd web && npm test` — green, new tests included
- `cd web && npm run build` — green; `/knowledge` is `ƒ`
  (dynamic), `/today` stays `ƒ`, other routes stay `○`
- Manual on `npm run dev`:
  1. With a freshly migrated DB and one seeded project: visit
     `/knowledge?project=<id>`, capture one `learning`, verify it
     appears in the list and on `/today` `最近动静`.
  2. Capture a second item with the same title: confirm second
     item's slug auto-appends `-2` (check via DB or by re-capture
     flow).
  3. Capture with a `github.com/<user>/<repo>/commit/<sha>` URL:
     confirm an `Artifact` row exists with `kind = "commit"`.
  4. Capture with `screenshots/2026-04-22/foo.png`: confirm
     `Artifact` row exists with `kind = "screenshot"`.
  5. Type-filter pillbar flips active state and list filters
     correctly; search input filters the visible rows live.
  6. Empty-DB project: `/knowledge` shows the no-project pointer
     to `npm run seed`.

## Open questions

_All PM-level open questions were resolved 2026-04-21 before
handoff; see PM-confirmed choices above. Parked items below are
intentionally deferred to later slices._

1. **(parked, revisit after dogfood)** Whether the Tweaks panel
   ever ships. For now, `inline` is the only capture mode.
2. **(parked, revisit after `daily-log-flow`)** Global `N`
   keyboard shortcut routing: does `N` on any surface open
   `/knowledge` with the compose card active, or stay inert?
3. **(parked)** Multi-artifact capture and after-the-fact
   artifact attachment. v1 is one pointer at creation time.
4. **(parked)** Per-type `metadata` structured fields
   (`bug.reproduction_steps`, `prompt.applicability`, …). v1
   persists empty `{}`.
5. **(parked)** `累计 commits` fact-strip wiring on `/today`
   using `Artifact(kind = "commit")`. This slice creates the
   data; the Today read can be picked up as a nit during
   review or rolled into `daily-log-flow`. PM call at closure.

## Progress Log

- 2026-04-21 — M1 — `5f9ac60`
  Added `web/lib/knowledge/queries.ts`, `slug.ts`,
  `artifact-kind.ts`, and `actions.ts`, plus temp-DB coverage for
  slug collision and direct server-action writes.
  Surprising: direct server-action tests needed an explicit
  `next/cache` mock so `revalidatePath` could be asserted outside the
  Next runtime.
- 2026-04-21 — M2 — `d29a650`
  Added the knowledge UI primitives under `web/components/knowledge/`
  and the thin `_NewButtonRow` client boundary.
  Surprising: after checking the local Next.js 16 docs, the search
  input stayed in-memory instead of URL-sync so the server-rendered
  list remains the source of truth and avoids search-param-triggered
  rerenders.
- 2026-04-21 — M3 — `7e3558b`
  Assembled `web/app/knowledge/page.tsx` with async `searchParams`,
  reused `resolveActiveProject` from `web/lib/today/active-project.ts`,
  and replaced the `/knowledge` placeholder with the real ledger page.
  Surprising: the existing active-project helper was already reusable,
  so no factor-out was needed.
- 2026-04-21 — M4 — `23a77e5`
  Wired `/today` `最近动静` to live knowledge rows, added
  `RecentKnowledgeList`, added `relativeDays`, and flipped the
  zero-knowledge copy to `尚未记录 · 用 /knowledge 新建第一条`.
  Surprising: PowerShell's text output mangled some UTF-8 inspection,
  so helper strings were normalized directly in source rather than
  trusting console echoes.
- 2026-04-21 — M5 — `c41502f`
  Added `knowledge-list.test.ts`, `knowledge-page.test.tsx`, and the
  populated-state assertion in `today-page.test.tsx`.
  Surprising: the `/knowledge` page render test needed the imported
  server action mocked because the inline compose client boundary is
  present in the tree even when the card is closed.
- 2026-04-21 — M6 — `current commit`
  Synced `docs/STATE.md` and this plan to the implemented repo state
  without marking the slice closed or archiving the plan.
  Surprising: this entry cannot embed its own final SHA before the
  commit exists; use the resulting doc-sync commit as the M6 sha in the
  close-out handoff.
- 2026-04-21 — review follow-up — `55c96a8`
  Fixed `inferArtifactKind()` so image URLs and paths with `?…` or `#…`
  suffixes still classify as `screenshot`, while `/commit/` URLs keep
  classifying as `commit`.
  Surprising: the regression was isolated to the end-of-string image
  extension check, so the narrowest safe fix was to strip query/fragment
  suffixes only for that regex path and leave the other branches intact.

## Change Log

_(Empty at open. Append entries as scope shifts.)_
