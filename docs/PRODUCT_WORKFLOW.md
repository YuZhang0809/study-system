# Product Development Workflow

## Purpose

This project uses a product-first, agent-first workflow. Product
direction stays human-owned. Most execution work is delegated to
agents.

The main rule is simple: do not let "fast AI output" outrun product
clarity.

Use [docs/README.md](./README.md) as the orientation map. Use the
source order below when there is ambiguity.

## Source Order

Use documents in this order when there is ambiguity:

1. [PRD.md](../PRD.md)
2. [AGENTS.md](../AGENTS.md) / [CLAUDE.md](../CLAUDE.md)
3. Decision records in [docs/decisions](./decisions)
4. Feature-specific ExecPlan in [docs/plans](./plans)
5. [docs/STATE.md](./STATE.md)
6. Pull request discussion and review notes

If two documents conflict, update the lower-level document instead
of silently choosing one.

## Repository Memory And Traceability

The repository, not the chat transcript, is the durable memory for
this project.

Use the following storage model:

- [PRD.md](../PRD.md): product vision, goals, scope, non-goals
- [docs/decisions](./decisions): stable decisions that future work
  should rely on
- [docs/plans](./plans): active multi-step execution plans only
- [docs/plans/archive](./plans/archive): completed or superseded
  execution history
- [docs/STATE.md](./STATE.md): current snapshot of where the project
  stands
- [docs/history](./history): long-form repository evolution and
  milestone closure context
- pull requests and commits: implementation details and code
  history

When a discussion produces a durable outcome, write it down in the
repo before relying on it in later work.

Use this rule of thumb:

- if it changes product intent, update the PRD
- if it resolves a durable choice, add or update a decision record
- if it changes execution steps, update the active ExecPlan
- if it changes the immediate situation or next step, update
  `docs/STATE.md`

## Roles

### Product manager

The product manager provides:

- desired outcome
- user value
- constraints and non-goals
- success criteria
- priority

The product manager should not need to define implementation details
unless they are themselves product constraints. When the product
manager confirms a durable decision, that decision should be written
into the repository rather than left only in chat.

### Agent

The agent is expected to:

- turn a broad direction into a scoped slice
- decide the execution path inside the stated boundaries
- create or update an ExecPlan when needed
- implement and verify the change
- self-review before handoff
- surface only material product decisions or blockers back to the
  product manager
- convert durable discussion outcomes into repository artifacts as
  part of normal execution

### Two-Actor Model

This repo operates with two distinct agent actors under the human
PM:

- **Claude** — PM-layer. Frames slices, authors plans and decision
  records, maintains `PRD.md` and `docs/STATE.md`, writes review
  prompts, and relays synthesized findings back to the PM. Does not
  implement production code by default. Operating contract:
  [`../CLAUDE.md`](../CLAUDE.md).
- **Codex** — implementation and review. Executes the current slice
  against its plan, self-reviews, and in a fresh-context session
  plays the reviewer role. Operating contract:
  [`../AGENTS.md`](../AGENTS.md).

Both actors share this workflow doc as common ground. The human PM
sits above both and owns cross-actor orchestration. In a
single-session Claude Code setup, the same session may play both
roles sequentially; the role switch must be explicit.

## Recommended Multi-Agent Lane

For non-trivial slices, the default workflow is a three-lane
pattern. This is a recommended operating pattern, not a mandatory
requirement for every small edit.

### 1. Progress / state lane

Responsibilities:

- read current repo facts first
- maintain `docs/STATE.md`, active ExecPlans, and workflow
  consistency
- detect drift between implementation, plans, decisions, and current
  state
- keep the next slice narrow, stable, and reviewable
- decide when work is ready to enter review

Typical actor: **Claude**. This lane should usually avoid doing the
main product implementation unless the task is only a small doc or
state correction.

### 2. Main implementation lane

Responsibilities:

- execute the current slice against the active plan
- keep changes inside the stated product and workflow constraints
- run the stated verification
- complete author self-review
- update the relevant plan and `docs/STATE.md` after implementation

Typical actor: **Codex**.

### 3. Fresh-context review lane

Responsibilities:

- review the current change set after author self-review
- use [docs/code_review.md](./code_review.md) review order
- focus on anti-pattern compliance, data-model integrity, draft →
  commit boundary, evidence traceability, and verification quality
  before style
- review the PR diff when available, or the branch/worktree diff
  against base when no PR exists yet

Typical actor: **Codex in a separate fresh-context session**,
distinct from the implementation session. The review prompt is
typically drafted by Claude and handed to Codex by the human PM.

Recommended sequencing:

1. progress / state lane (Claude) frames or updates the slice
2. main implementation lane (Codex) executes it
3. progress / state lane (Claude) checks completion and review
   readiness, drafts the review prompt
4. fresh-context review lane (Codex) reviews the diff
5. implementation lane (Codex) addresses findings
6. progress / state lane (Claude) updates durable state and
   next-step guidance

Use a simpler path for trivial edits where this lane would add
process without reducing risk.

## Branch And PR Defaults

Use the lightest workflow that still keeps change boundaries clear.

### Small direct edits

Small, low-risk edits may be done without opening a PR first.

Examples:

- doc wording fixes
- state snapshot corrections
- small, unambiguous cleanup

Rules:

- keep the change narrowly scoped
- avoid mixing unrelated edits
- still leave a clear diff and honest verification note

### Non-trivial implementation work

Non-trivial slices should default to an isolated branch or worktree
before implementation starts.

This especially applies when the change is:

- cross-file
- product-relevant
- a schema / migration change
- intended for review
- likely to run in parallel with other work

### PR default

PRs are the preferred container for formal review and merge
preparation, but they are not required for every small edit.

Recommended default:

1. small direct edits may stop at a clean local commit when a PR
   would add little value
2. non-trivial slices should usually move to a branch or worktree
   first
3. before fresh-context review or merge, prefer a PR; if no PR
   exists yet, provide a clear diff against the intended base branch

Note: this repo is not yet initialized as a git repository. The
scaffolding slice is expected to `git init` and establish the main
branch; until then, PR defaults apply in spirit only.

## PM Handoff Contract

The preferred handoff format is defined in
[docs/PM_HANDOFF.md](./PM_HANDOFF.md).

At minimum, a handoff should answer:

- what outcome is wanted
- why it matters
- what must not happen
- how success will be recognized

## Standard Loop

### 1. Frame the slice

Turn a broad idea into a narrow slice with five fields:

- Goal
- Context
- Constraints
- Done when
- Verification

The slice should be small enough to review in one sitting.

### 2. Separate simple work from complex work

Use direct implementation for:

- copy edits
- naming cleanups
- isolated UI tweaks
- small tests

Use an ExecPlan first for:

- multi-file or cross-module work
- changes that touch the Prisma schema or a migration
- changes to the seed CLI or its idempotency contract
- anti-pattern-adjacent changes (AI-assist features, onboarding
  copy, retro prompts)
- anything with meaningful product ambiguity

### 3. Define verification before coding

Every slice needs a visible proof of success. Depending on the
stage, that can be:

- a command and expected output
- a screenshot and expected UI state
- a test case
- a document diff showing clarified decisions
- for schema slices: a migration dry-run on a seeded DB
- for seed-CLI slices: a rerun-equals-no-op check

No verification means the slice is not ready.

### 4. Plan, then execute autonomously

Once the slice is ready, the default expectation is that the agent
proceeds without asking for routine next steps.

The agent should:

- choose the simplest path that satisfies the current constraints
- make local assumptions when they do not change product meaning
- record important assumptions in the plan, PR, or handoff
- escalate only when the choice affects product semantics, cost,
  security, or scope

### 5. Build one vertical slice at a time

Prefer end-to-end slices over horizontal batching.

Good:

- one `knowledge_item` type from schema to Today-page inline write
  path
- one retro flow from checklist trigger to persisted structured
  record

Bad:

- all models first, then all APIs, then all pages

### 6. Review the change against product rules

Review is not only about code quality. Check:

- ground the review in the current slice's diff
- prefer a PR diff against base; if no PR exists yet, review the
  working branch or worktree diff against its intended base
- use whole-repo reads only as supporting context for changed
  files, not as the default review unit
- does this keep the product inside the PRD boundary
- does every feature pass the four anti-patterns
- is the draft → commit boundary preserved for any AI assist
- are Prisma migrations reversible / explicit / committed alongside
  code
- is any rule now implicit when it should be explicit

### 7. Capture decisions

If the change clarified a rule, workflow, or non-goal, update the
relevant doc in the same change or immediately after.

## Escalation Rules

Escalate to the product manager when:

- the PRD does not resolve a material product choice
- two plausible options create different user-facing behavior
- a feature risks violating one of the four anti-patterns
- a new dependency, service, or framework is needed
- the task requires relaxing a guardrail in
  [AGENTS.md](../AGENTS.md)
- the required verification is impossible with the current
  environment
- the implementation suggests that the MVP scope should change

Do not escalate for ordinary implementation choices.

## Conversation-To-Repo Rule

Do not rely on memory across sessions.

Before treating a discussion outcome as settled, encode it into at
least one durable repository artifact:

- decision record
- ExecPlan update
- PRD update
- state snapshot update

If it is not written into the repository, future agents should treat
it as untrusted or incomplete context.

## Parallel Agent Work

Parallel work is encouraged when the tasks are independent.

Use parallel agents for:

- bounded exploration
- test writing
- read-only investigation
- review
- isolated UI or tooling work

Requirements:

- isolate write scopes
- use separate worktrees or branches
- keep a single owner for each file area during active
  implementation
- merge only after verification and review

## Product-Specific Guardrails

These rules apply even when the implementation stack is not fully
decided yet.

### The four anti-patterns are non-negotiable

Every feature, every AI interaction, every piece of UI copy must
pass all four (PRD §1):

1. not a tutor
2. not a ghostwriter
3. not a cheerleader
4. not a planner

If a slice cannot pass all four, it is reshaped or killed.

### Deterministic core, form-layer-only AI edge

The following must remain deterministic:

- schema validation (Zod at the API boundary)
- seed CLI idempotency
- scoring / metric rollups on Today / Retro pages
- retro and weekly structured fields
- daily_log structured fields (no free-form overflow)

AI in v2 may assist with:

- slug suggestion
- tag suggestion
- relationship hints ("you wrote something similar 5 days ago")
- template prefill from deterministic sources (pulling a phase's
  metrics into the retro form)

AI must NOT:

- write body text for `daily_log` / `retro` / `knowledge_item`
- explain concepts or answer "what is X"
- generate learning plans or recommend study sequences
- emit emotional / motivational copy
- produce scoring or evaluation on the user's behalf

### Data authorship over automation

Body text is the user's. AI only helps with form.

### Traceability over fluency

Every rollup (cumulative commits, streaks of logged days, phase
progress) must be traceable to concrete rows in the DB. No
synthesized narrative numbers.

### Small PRs over heroic batches

Favor small, intention-revealing changes. Large mixed changes slow
review and hide product mistakes.

### Repo legibility over cleverness

Prefer simple, readable structures that a new contributor or agent
can understand quickly. Stable and boring is often better than
clever and opaque.

## Definition of Ready

A slice is ready when:

- the user value is stated clearly
- the four anti-patterns are checked and the slice passes
- the non-goals are clear
- the verification method is known
- open questions are either resolved or explicitly parked

## Definition of Done

A slice is done when:

- the intended behavior or document outcome exists
- the stated verification was completed or the blocker was
  documented
- the authoring agent completed a self-review
- Prisma migrations (if any) are committed and reversible
- relevant docs were updated
- review focus is obvious to the next reader
- any PM decision still needed is written explicitly rather than
  implied
