# PM Handoff Guide

## Purpose

This document defines the minimum input a product manager should
give an agent so the agent can work autonomously without guessing at
product intent.

The goal is not to describe implementation. The goal is to define
direction and boundaries clearly enough that the agent can make the
engineering decisions alone.

## Recommended Format

Use this structure when handing off work:

### Goal

What outcome should exist after the work is done.

### Why

Why this matters to the user, workflow, or milestone.

### Constraints

What must remain true. Include non-goals, forbidden shortcuts,
product boundaries (especially the four anti-patterns in PRD §1),
and anything the agent must preserve.

### Done when

What observable result will count as success.

### Priority

How urgent the task is relative to other open work.

## Who Receives The Handoff

This repo operates with two agent actors under the PM:

- **Claude** — the PM-layer agent. Typically receives handoffs
  first, turns them into slice specs, decision records, or plan
  updates, and escalates residual product ambiguity back to the PM.
  Operating contract: [`../CLAUDE.md`](../CLAUDE.md).
- **Codex** — the implementation and review agent. Receives a
  handoff when the plan is clear and execution can start directly.
  Operating contract: [`../AGENTS.md`](../AGENTS.md).

For ambiguous or product-heavy handoffs, prefer Claude as the first
receiver. For scoped, plan-ready implementation or review work,
Codex can be addressed directly.

## Optional But Helpful

- reference files or screenshots
- target milestone (e.g., "before 2026-05-03 dogfood")
- explicit review focus
- examples of good and bad behavior
- deadline or sequencing notes

## Good Inputs

Good PM inputs are:

- outcome-focused
- explicit about non-goals
- testable
- short enough to stay stable

Good examples:

- Add a Today-page inline capture for `knowledge_item` of type
  `learning` with minimum friction. Do not auto-generate the body
  or the title. Done when I can go from shortcut keypress to a
  persisted row in under three seconds without losing focus on the
  current page.
- Add the weekly-review flow as a guided six-question form persisting
  to `weekly_log`. Keep checklist state ephemeral (not in DB).
  Done when I can walk the flow, submit, and see the previous
  week's record on reopen.

## Weak Inputs

Weak PM inputs usually fail because they are too broad or too
implementation-heavy.

Examples:

- Make the knowledge module better.
- Refactor this with React Query and Zustand.

The first is too vague. The second chooses implementation before
clarifying product need.

## What The Agent Should Do With A Good Handoff

After receiving a handoff, the agent should:

- restate the task and key assumptions
- check the task against the four anti-patterns (PRD §1)
- decide whether direct implementation or an ExecPlan is needed
- choose an execution path
- implement and verify
- write durable outcomes back to the repository where appropriate
- return only meaningful product decisions or blockers to the PM

## When The Agent Should Escalate Back

The agent should come back to the PM only when:

- the handoff leaves a material product ambiguity
- the implementation reveals a scope or milestone conflict
- a new dependency or external service is needed
- there is a meaningful tradeoff between two user-facing behaviors
- a proposed feature risks violating one of the four anti-patterns
- verification cannot be completed under the current setup

When the PM resolves one of these escalations, that resolution
should usually be written into `PRD.md`, `docs/decisions/`,
`docs/plans/`, or `docs/STATE.md` before further work relies on it.

## Default Assumption Policy

If a detail is missing, the agent should prefer the simplest local
assumption that does not change product meaning.

Examples of safe assumptions:

- file naming
- small refactor shape
- test organization
- wording in developer docs

Examples of unsafe assumptions:

- changing a column's semantics on an existing table
- changing what counts as a "committed" entry vs a draft
- changing seed-CLI idempotency behavior
- introducing a runtime LLM call in v1
- rewriting copy in ways that imply tutoring, ghostwriting,
  cheerleading, or planning
