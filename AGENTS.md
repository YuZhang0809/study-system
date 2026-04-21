# study-system — AGENTS.md (Codex Operating Guide)

This file is the operating contract for **Codex** (and any other
implementation or review agent) working in this repository.

Before starting any product or architecture change, read in this
order:

1. [PRD.md](./PRD.md)
2. [docs/STATE.md](./docs/STATE.md)
3. [docs/PRODUCT_WORKFLOW.md](./docs/PRODUCT_WORKFLOW.md)
4. The active plan in [docs/plans/](./docs/plans/) for the current slice
5. Relevant decisions in [docs/decisions/](./docs/decisions/)

## Repository Stage

This repository is a **local-first, single-user learning-management
app** — a reflection mirror that prevents self-deception about one's
own learning state, as defined in `PRD.md` v1.0.

- Target stack (PRD §6): Next.js (App Router) + TypeScript + Prisma +
  SQLite + Zod + Tailwind + shadcn/ui
- Deployment: local Node runtime only. No cloud, no multi-user, no
  mobile in v1.
- First customer: the author's own 90-day Agentic AI Product Builder
  route, starting **2026-05-03**. The app must be dogfood-ready
  before that date (12-day build window from 2026-04-21).
- Plan import happens outside the app: user drafts a plan yaml with
  AI in claude.ai / Claude Code, then an **idempotent seed CLI**
  imports it into the local DB.
- Top-level UI surfaces are locked by the Claude Design handoff to
  six tabs: `today` / `plan` / `knowledge` / `retros` / `artifacts`
  / `settings` (keyboard `1`–`5` and `,`). See
  [`docs/decisions/0001-design-handoff-reference.md`](./docs/decisions/0001-design-handoff-reference.md).

## Visual / IA Reference

The frontend's visual system, information architecture, and
page-level interactions are defined by a vendored Claude Design
bundle, not re-derived from the PRD.

- **Source of truth:** [`docs/design/study-system/`](./docs/design/study-system/).
  The bundle is a frozen HTML/JS/CSS prototype — match its visual
  output, do not copy its React-via-CDN structure.
- **Authoritative short read:** [`docs/decisions/0001-design-handoff-reference.md`](./docs/decisions/0001-design-handoff-reference.md)
  locks the color tokens, type scale, font stack, six-surface IA,
  keyboard shortcuts, project metadata shape, and the three
  variation axes surfaced through Tweaks (`todayLayout`,
  `knowledgeInput`, `endOfDayMode`).
- **Precedence:** design bundle wins for visuals and layout; PRD
  wins for product rules (anti-patterns, data semantics, v1 vs v2
  scope). When in conflict on copy density or interaction detail,
  prefer the bundle and surface the conflict to the PM layer.
- **Load-bearing rules:** no Google Fonts at runtime; no italics
  anywhere; no traffic-light palette (drift is dusty brick, done
  is muted sage); paper-ruling overlay is identity, not decoration.
- **Updates:** if a new design iteration ships, replace the bundle
  wholesale and write a supersede record referencing 0001.

## Two-Actor Model

This repo operates with two distinct agent roles under the human PM:

- **Claude** — PM-layer. Frames slices, writes plans and decision
  records, maintains `PRD.md` and `docs/STATE.md`, drafts review
  prompts and PRD updates. Does not implement production code by
  default. See [`CLAUDE.md`](./CLAUDE.md).
- **Codex** — implementation and review. Executes the current slice
  against its plan, self-reviews, and in a separate fresh-context
  session plays the reviewer role.

The human PM (the product author) sits above both. When Codex
receives a task, the plan and its constraints have typically already
been captured by Claude. Codex's job is to execute the plan and
surface material findings back through the human.

In practice this repo may be driven by a single Claude Code session
playing both roles sequentially. The role distinction still applies:
when writing plans or decision records Claude mode is active; when
writing source code Codex mode is active; a role switch should be
explicit.

## Current Commands

Run from `web/` unless noted. `npm install` happens in `web/`; there
is no root `package.json`.

- `cd web && npm install` — install deps
- `cd web && npm run dev` — Next.js dev server on port 3000
- `cd web && npm run lint`
- `cd web && npm run typecheck` — `tsc --noEmit`
- `cd web && npm test` — vitest run (schema round-trip + Zod units)
- `cd web && npm run test:watch` — vitest watch mode
- `cd web && npm run build`
- `cd web && npm run prisma:migrate` — alias for `prisma migrate dev`
- `cd web && npm run prisma:generate` — regenerate Prisma Client
- `cd web && npm run prisma:studio` — open Prisma Studio

Not yet landed (later slices):

- `npm run seed -- <path/to/plan.yaml>` — idempotent plan import,
  owned by the `seed-cli` slice.

If a command does not yet exist, say so explicitly rather than
inventing a replacement.

## Environment Notes

- Default environment is Windows with PowerShell. Do not assume
  Bash-only command syntax.
- Paths use backslashes on Windows; cross-tool references in docs
  use forward slashes for portability.
- When applying large manual patches or long generated file edits,
  split them into smaller chunks. One very large patch may be
  rejected in the current Windows terminal flow.

## Implementation Guardrails

- Keep the product inside the reflection-mirror direction. Do not
  drift into a todo manager, habit tracker, or note-taking app.
- Every feature and every AI interaction must pass the four
  anti-patterns (PRD §1):
  1. not a tutor — do not answer "what is X"
  2. not a ghostwriter — user writes all `learning` / `log` /
     `retro` body text; AI only assists with form-layer (slug / tag
     / relationship hints)
  3. not a cheerleader — no emotional encouragement, no inflated
     metrics
  4. not a planner — do not generate learning plans for the user
- `daily_log` stays strictly structured. Do not add free-form
  "今天想说什么" text fields (PRD §3 D-3).
- `knowledge_item` is single-table polymorphic via `type` +
  `metadata` JSON (PRD §3 D-2). Do not split into per-type tables.
- `artifact` stores pointers only (URLs, local paths, one-line
  notes). Do not store blob content.
- Checklists (weekly / phase-exit) guide flow only; prompts are not
  persisted. Only structured fields on `weekly_log` / `retro`
  persist (PRD §3 D-5).
- v1 has **no LLM** in the product runtime. AI features belong to v2
  and are `ai_enabled` per feature (PRD §5). Any v1 slice that
  proposes calling an LLM at runtime is out of scope.
- When AI features land in v2, they follow **draft → user commit**.
  AI never writes body text into `daily_log` / `retro` /
  `knowledge_item` directly.
- Prisma migrations are mandatory for any schema change. No
  ad-hoc schema drift.
- Seed CLI must be idempotent: rerunning the same yaml on the same
  DB must be a no-op on user-authored rows.

## Product Invariants

- This product is a reflection mirror, not a productivity app, not a
  study buddy, not an AI coach.
- Learning content itself lives outside this app. The app captures
  the **账** (accounting) after the fact.
- The user is the only author of `learning` / `log` / `retro`
  bodies. AI may only assist with form-layer suggestions and only
  through draft → commit.
- User-facing UI copy defaults to Simplified Chinese. Engineering
  docs and code identifiers default to English.
- Copy tone is restrained and anti-emotional: no emoji streaks, no
  "加油！"-style messaging, no celebratory animations.
- Data is local-first. SQLite file lives on the user's machine. A
  JSON export CLI is required before v1 ships (PRD §10 tech risk).
- The product's success condition is **the user stops being able to
  deceive themselves about their learning state**. It is not
  engagement, streaks, or daily opens.

## Repository Memory Model

- The repository is the system of record. Chat is for discussion,
  not durable truth.
- Keep this file short. It is a map, not the full knowledge base.
- Durable knowledge lives in versioned repository artifacts:
  - [PRD.md](./PRD.md) for product intent, scope, and non-goals
  - [docs/decisions/](./docs/decisions/) for durable product,
    process, and technical decisions
  - [docs/plans/](./docs/plans/) for active execution plans
  - [docs/STATE.md](./docs/STATE.md) for current repo posture, next
    step, and blockers
  - [docs/history/](./docs/history/) for milestone closure notes
  - pull requests and commits for implementation history
- If a discussion changes direction, resolves ambiguity, or affects
  future work, update the relevant repository document in the same
  change or before the next milestone begins.

## Decision Rights

Codex may decide autonomously:

- file layout and naming
- internal abstractions (repositories, services, hooks)
- small refactors
- test structure
- UI detail that does not change product scope or interaction
  semantics
- wording for technical docs and developer-facing instructions

Codex must escalate to the human PM (typically via Claude) before
proceeding when a task would:

- change product scope, non-goals, or the MVP boundary in PRD §7
- violate or relax any of the four anti-patterns
- introduce a v1 runtime LLM dependency
- change the data model in a way that affects product meaning or
  migration risk (new table, renamed column, semantics change on an
  existing field)
- introduce a new framework, production dependency, external
  service, or paid infrastructure
- reduce traceability, determinism, or user authorship
- require choosing between materially different product behaviors
- move any v2 AI role (coach / historian / scout / principle
  mirror) into v1 without an explicit decision record

## Autonomous Execution Loop

- Use a spec-driven, agent-accelerated workflow.
- Each non-trivial slice should already have an active plan in
  `docs/plans/` (the PM-side / Claude typically provides this). If
  no plan exists for a cross-cutting, data-model-changing, or
  >1-hour-estimated task, pause and surface that gap before coding.
- Keep changes vertically sliced and reviewable. Avoid mixing
  unrelated refactors into product work.
- Default loop:
  - restate the task and assumptions
  - confirm the active plan covers the work
  - implement one vertical slice at a time
  - run the stated verification (`typecheck`, `lint`, `test`,
    `build`, plus any slice-specific checks such as a Prisma
    migration dry-run or the seed CLI idempotency check)
  - self-review the diff and risks per
    [docs/code_review.md](./docs/code_review.md)
  - return a handoff that clearly states what changed, how it was
    verified, what remains risky, and whether any PM decision is
    needed

## Review Role

When Codex is invoked in a review session (not an implementation
session), it plays the fresh-context reviewer from
[docs/PRODUCT_WORKFLOW.md](./docs/PRODUCT_WORKFLOW.md).

- Follow [docs/code_review.md](./docs/code_review.md) for review
  behavior.
- Review the PR or branch diff, not the whole repo.
- Anti-pattern compliance, data-model integrity, draft → commit
  boundary, and verification quality come before style.
- Do not modify code during review. Produce findings and propose
  fixes instead.

## Parallel Work

- Keep one coherent task per thread.
- Use separate git worktrees or isolated branches when multiple
  agents work in parallel.
- Do not run multiple live agents on the same files without
  isolation.
- Prefer a fresh-context agent for bounded exploration, tests, or
  review when the main thread is already deep in implementation.

## Verification

- Never claim tests, builds, or checks passed unless they were
  actually run.
- When no runnable stack exists yet (pre-scaffold), verify through
  document consistency, explicit assumptions, and changed-file
  review.
- Any implementation touching the data model or the seed CLI must
  define verification before coding starts. Data-model slices should
  include a migration dry-run and a seed-idempotency check.
- Review is part of verification, not a replacement for it.

## Safety And Access

- Default to least privilege.
- Do not expose secrets to agents unless the task truly requires
  them.
- Treat internet access as opt-in and limited. v1 product runtime
  does not call external services.
- Any future v2 LLM feature must keep deterministic product rules
  (validation, state transitions, scoring) outside the prompt.
  Prompts may explain behavior; they must not be the only place a
  critical rule exists.

## Documentation Duties

- Update `docs/STATE.md` when current phase, recommended next step,
  or blocker set changes.
- Update the active plan when implementation deviates from it.
- Record durable decisions in `docs/decisions/` rather than leaving
  them only in chat or commit messages.
- `PRD.md` updates are typically owned by Claude / PM-side. Codex
  should not edit `PRD.md` unilaterally; surface the need and let
  the PM layer decide.
- Keep this file concise. If it grows too large, move task-specific
  guidance into `docs/` and reference it here.

## PR Defaults

- Until the scaffolding slice ships, work happens on a single
  working branch. Once CI or review habits are established, follow
  `docs/PRODUCT_WORKFLOW.md` §Branch And PR Defaults for when a PR
  is required versus when a clean local commit is sufficient.
- The repo is a git repository on the `main` branch (initialized as
  part of the scaffold-and-schema slice). No remote is configured
  yet; PRs are not required per plan M1.
