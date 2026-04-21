# Code Review Guide

## Goal

Reviews on this project should optimize for product correctness (the
four anti-patterns), risk control (schema / seed idempotency), and
long-term clarity before style polish.

## Review Stages

### Stage 1: Authoring agent self-review

This stage is mandatory.

Before requesting outside review, the authoring agent should:

- read the diff as if it came from someone else
- verify the change still matches the original goal
- check the diff against the four anti-patterns (PRD §1)
- remove unrelated edits
- check whether docs and plans were updated where needed
- check migrations: does the forward migration run cleanly on a
  seeded DB, and is rollback (or re-seeding) viable
- write down any remaining assumptions or risks honestly

### Stage 2: Fresh-context review

For risky or non-trivial changes, use a fresh reviewer agent or a
human reviewer.

Use fresh-context review especially when the change touches:

- the Prisma schema or any migration
- the seed CLI or its idempotency contract
- any AI-assist surface (v2)
- retro / weekly / daily structured fields
- the `knowledge_item` polymorphic boundary
- Today-page rollups and metric computation

## Review Target

By default, review the current change set, not the whole repository
state.

Preferred review target order:

1. PR diff against the intended base branch
2. current branch or worktree diff against the intended base branch
   when no PR exists yet
3. whole-repo inspection only as supporting context for the changed
   files

Do not treat the current main workspace state as the default review
unit unless the task is explicitly a whole-repo audit.

## Review Order

Review in this order:

1. Anti-pattern compliance
2. Product boundary
3. Data model and migration correctness
4. Seed / idempotency correctness
5. Draft → commit boundary (for any AI-assist)
6. Evidence traceability (rollups trace to rows)
7. Verification quality
8. Maintainability and naming
9. Style and small cleanups

## What To Look For

### Anti-pattern compliance

- Does any new UI copy, prompt, or behavior tutor the user?
- Does any AI-assist or template write body-text content on the
  user's behalf?
- Is any metric or message emotionally charged or congratulatory?
- Does any feature generate a learning plan or recommend study
  sequence?

If the answer is yes to any of these, the slice needs reshaping, not
just rewording.

### Product boundary

- Does the change stay inside the PRD and current MVP scope (PRD §7)?
- Does it drift toward todo list, habit tracker, or study buddy?

### Data model and migration correctness

- Is the Prisma schema change minimal and explicit?
- Is the migration reversible, or is there an explicit reason it
  cannot be?
- Are new columns nullable or defaulted in a way that existing rows
  survive?
- Is `knowledge_item.metadata` respected as the spot for
  type-specific fields (PRD §3 D-2)?

### Seed / idempotency correctness

- If the seed CLI is touched, does rerunning the same yaml on the
  same DB remain a no-op on user-authored rows?
- Does upsert key selection (project name + date, or explicit id)
  stay stable across runs?
- Are existing user data rows ever overwritten silently?

### Draft → commit boundary (v2 AI-assist)

- Is any AI output written directly to a persistent row without a
  user-visible commit step?
- Is `ai_enabled` per-feature honored so the user can turn the
  assist off?
- Is the AI output stored as a separate trace (prompt log / draft)
  distinct from the committed body?

### Evidence traceability

- Can every displayed metric (cumulative commits, streak, phase
  progress) be traced back to specific DB rows?
- Are counts based on real records, not estimates?

### Verification quality

- Did the author run the stated checks?
- Are there obvious missing edge cases or failure paths?
- Do the tests and checks actually prove the intended behavior?
- For schema slices: was a migration dry-run performed on a seeded
  DB?

### Maintainability and naming

- Is the code or document legible to a new contributor or agent?
- Are responsibilities easy to find?
- Does user-facing Chinese copy stay out of code identifiers?

## Review Heuristics

- Start from the diff. Expand into surrounding files only when the
  changed lines depend on broader context.
- Read the tests or verification notes first. They encode intent.
- Trace user input to state changes, stored records, and external
  side effects.
- Look for hidden rules that exist only in prompts, comments, or UI
  copy.
- Ask what happens under failure, stale data, duplicate events, or
  partial execution.
- Prefer explicitness over cleverness in core product flows.

## Comment Style

Prefer comments that are:

- specific
- actionable
- risk-oriented
- grounded in user or system impact

Good review comments answer:

- what is wrong
- why it matters
- what kind of fix is expected

## Self-Review Before Asking Others

Before requesting review, the author should confirm:

- the diff matches the stated goal
- the slice passes all four anti-patterns
- unrelated edits were removed
- the verification section is honest
- docs were updated if rules or workflow changed

## Default Review Output

When summarizing a review, put findings first. A short summary can
follow after the findings.
