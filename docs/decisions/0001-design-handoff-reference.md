# 0001 — Design handoff as visual / IA reference

**Status:** accepted
**Date:** 2026-04-21
**Supersedes:** —
**Superseded by:** —

## Context

The PRD (v1.0, 2026-04-21) declared the next step as "用 Claude
Design 产出页面和交互流程". Claude Design has now delivered a full
handoff bundle covering visual system, information architecture,
the four main surfaces (Today / Plan / Knowledge / Retros), two
supporting surfaces (Artifacts / Settings), a project switcher
showing two concurrent projects, the end-of-day wizard, the phase
retro flow, and three variation axes surfaced through a Tweaks
panel.

The bundle is an HTML/JS/CSS prototype intended as a visual spec,
not target code. We need a durable pointer and a short
authoritative summary so implementation slices can reference it
without re-deriving the look each time.

## Options considered

**A — treat chat as the source of truth.** Leave the bundle in the
design tool, copy-paste tokens as needed. Rejected: chat rotates;
no future agent can reliably recover the spec.

**B — rebuild the design in our own target stack immediately and
discard the bundle.** Rejected: we have no Next.js scaffold yet,
the bundle is large enough to be worth preserving as a regression
reference, and Claude Design may iterate again.

**C — vendor the bundle into the repo as a frozen reference, and
summarize its load-bearing decisions in a decision record.**
Chosen. The bundle lives at
`docs/design/study-system/`; this record captures the distilled
contract so implementation agents can read one page rather than
nine.

## Decision

1. The Claude Design bundle is vendored at
   `docs/design/study-system/` and is the frontend's visual +
   interaction source of truth until explicitly superseded.
2. The target implementation stack (Next.js + Prisma + Tailwind +
   shadcn/ui per PRD §6) re-implements the visual system natively.
   Prototype React-via-CDN structure is not copied.
3. The following contract is load-bearing for any UI slice. Drift
   requires a supersede or a new decision record.

## Visual system contract

### Aesthetic

Paper / ledger. Warm off-white background, deep ink text, hairline
rules, index-card metaphor. A single warm amber accent used for
"today / selected / drift-adjacent". No emoji, no gradients, no
rounded pills (2–4px corners). High density, keyboard-first.

### Type

Apple-style system font stack — no web-font loading:

- body / UI: `-apple-system, BlinkMacSystemFont, 'SF Pro Text',
  'SF Pro Display', 'PingFang SC', 'Helvetica Neue', 'Segoe UI',
  'Hiragino Sans', 'Microsoft YaHei', system-ui, sans-serif`
- mono (numbers / data / labels): `'SF Mono', ui-monospace,
  SFMono-Regular, 'JetBrains Mono', Menlo, Consolas, monospace`
- `font-variant-numeric: tabular-nums slashed-zero` on all numeric
  runs
- **No italics anywhere.** Emphasis uses weight (600) plus tight
  letter-spacing.

Baseline sizes: `--t-xs 11 / --t-sm 12 / --t-base 13.5 / --t-md 14.5
/ --t-lg 17 / --t-xl 20 / --t-2xl 28 / --t-3xl 36`.

### Color tokens

Defined in `docs/design/study-system/project/styles.css` using
OKLCH. Load-bearing values:

- `--paper 0.972 0.008 75` (main bg), `--paper-2 0.955`,
  `--paper-3 0.935`, `--paper-edge 0.905`
- `--ink 0.22 0.012 60`, `--ink-2 0.38`, `--ink-3 0.55`,
  `--ink-4 0.70`
- `--rule 0.88 0.010 70`, `--rule-strong 0.78`
- `--amber 0.62 0.14 65` + `--amber-ink` + `--amber-wash`
- `--drift 0.50 0.09 35` (dusty brick, for 偏离 / overdue) +
  `--drift-wash`
- `--done 0.48 0.05 150` (muted sage) + `--done-wash`

The palette is deliberately muted. There is **no traffic-light
semantic palette** (no pure red / pure green). Drift is dusty brick;
done is muted sage.

### Subtle paper ruling

`body::before` renders a `repeating-linear-gradient` at ~23.5px
stride as a multiplied overlay at 0.35 opacity. This is part of the
identity, not decoration — keep it.

## Information architecture contract

### Shell

- Left sidebar 208px: brand · project list · nav list · footer
  meta (local / SQLite / last backup / DB size)
- Main column: sticky 44px header (breadcrumb + search + new
  buttons) / body / 26px footer strip (status line, shows "AI 关闭
  (v1 只预览)")
- Footer strip reads like a terminal status line

### Six top-level surfaces

| id | label | kbd | notes |
|---|---|---|---|
| `today` | 今日 | `1` | Driving seat; the default surface when a project has an active state |
| `plan` | 计划 | `2` | Phase-scoped calendar + list view; phase switcher defaults to current phase |
| `knowledge` | 知识库 | `3` | `learning / concept / bug / prompt` with three input-mode variants |
| `retros` | 复盘 | `4` | Weekly + phase retros |
| `artifacts` | 产出 | `5` | Pointers only (URL / path + owner + time) |
| `settings` | 设置 | `,` | v1 preview only; lists v2 AI roles as off |

Global shortcuts: `1`–`5` switch tabs, `,` (with modifier) opens
Settings, `N` creates a new item, `⌘↵` ends the day on Today.

### Project switcher

The sidebar shows multiple projects concurrently. The seed models
two states:

- `agentic-90d` — `status: pre_start`, label `starts <date>`
- `webgpu-30d` — `status: active`, label `d<n>/<total> · active`

Project metadata shape (as used by the UI) is defined in
`docs/design/study-system/project/seed.js`. Key fields the UI
depends on:
- `has_plan_structure`: `"full"` | `"segments_only"` | `"open"`
- `status`: `"pre_start"` | `"active"` | `"done"` | `"paused"`
- `today_index`, `total_days`, `segments[]`, `today_snapshot`
- `stats`: `commits / logs / learnings / bugs / prompts / concepts`

### Today surface contract

Today renders a "你现在在..." sentence + a full-project 1-cell-per-day
timeline with phase tick-marks + a four-fact strip. Below that sit
five blocks: `昨日之承诺 · 未结清`, `今日 <date>`, `最近动静`,
`未清账`, `阻塞`. Three layout variants (selectable via Tweaks)
rearrange these blocks: `ledger` (three-column), `stacked`
(vertical with paired bottom row), `column` (single 640px column).

### Variation axes surfaced through Tweaks

These are **visual / interaction variants only, not feature
branches**. They persist in `localStorage` in the prototype; the
production app should persist them per user.

- `todayLayout`: `ledger` | `stacked` | `column`
- `knowledgeInput`: `inline` | `modal` | `drawer`
- `endOfDayMode`: `wizard` | `single`

## Consequences

- Implementation slices targeting any UI surface read
  `docs/design/study-system/project/<page>.jsx` and the
  `styles.css` tokens as the visual spec, not the PRD alone.
- The app does **not** load Google Fonts or other web fonts at
  runtime; bundle size and first-paint cost stay low.
- User-facing copy defaults to Simplified Chinese throughout. The
  bundle has already had a Chinese-first sweep (see chat).
- Tweaks are scoped to visual / interaction variants. Using them as
  a feature-flag surface is out of scope.
- Navigation copy, nav IDs, and keyboard shortcuts are locked by
  the table above unless a supersede is filed.
- The Next.js scaffold slice must reproduce the tokens and the
  six-surface nav before any feature slice lands, so copy does not
  drift.

## Revisit conditions

- Claude Design ships a new iteration that changes a load-bearing
  rule above. Write a new decision record referencing this one.
- Dogfood reveals a surface the design did not address (e.g., plan
  yaml import UI). Those are new decisions, not edits to this one.
- The Tweaks variation axes are considered finalized in favor of
  one variant each. That collapse is its own decision.
