# Plans

This folder holds **active** ExecPlans only.

## When to open a plan

Open a plan (instead of direct implementation) when the slice:

- touches the Prisma schema or introduces a migration
- changes or depends on the seed CLI contract
- spans multiple files or modules
- has meaningful product ambiguity
- risks touching any of the four anti-patterns (PRD §1)
- is estimated to take more than roughly an hour

## Plan shape

A plan should answer, at minimum:

- **Goal** — what outcome exists after the slice lands
- **Context** — why this is the right slice now, what it depends on
- **Constraints** — non-goals, anti-pattern checks, preserved
  invariants
- **Milestones** — ordered sub-slices if the work needs staging
- **Verification** — how success is proven (commands, test cases,
  screenshots, migration dry-run, etc.)
- **Open questions** — either resolved or explicitly parked
- **Progress / Decision Log** — appended as the slice is executed
- **Change Log** — scope changes with the reason

## Naming

`<slice-name>.md`, kebab-case, descriptive rather than chronological
(e.g., `scaffold-and-schema.md`, `seed-cli.md`, not
`plan-001.md`).

## Archival

When a plan closes (slice shipped or explicitly superseded), move
it to [`archive/`](./archive/) with a final status line and the
closing commit or merge ref. Keep the archive — it is the
implementation history.
