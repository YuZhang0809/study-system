# Decisions

This folder holds **durable** decisions — product, process,
architectural, and data-model choices that future work should rely
on.

## When to write a decision record

Write a decision record when a choice will shape future slices and
should not have to be re-derived from chat. Typical triggers:

- a product boundary clarification (what the app will / will not do)
- a data-model choice with migration implications
- a workflow rule change (branching, review, verification)
- a v1 / v2 scope boundary for a specific feature
- a deliberate trade-off between two plausible user-facing
  behaviors

Do not use this folder for:

- transient implementation detail (belongs in the plan)
- current snapshot / next step (belongs in `docs/STATE.md`)
- product intent itself (belongs in `PRD.md`)

## File naming

`NNNN-<kebab-case-summary>.md`, zero-padded sequence starting at
`0001`. Example: `0001-repo-is-system-of-record.md`.

## Shape

Each decision record should answer:

- **Context** — what prompted the decision
- **Options considered** — at least the chosen one and the main
  alternative
- **Decision** — the choice, stated plainly
- **Consequences** — what this enables, what it closes off
- **Revisit conditions** — what would cause us to revisit

## Supersession

Decisions are additive. When a decision is replaced, add a new
record and mark the old one as superseded with a back-reference.
Do not silently edit or delete the old record.
