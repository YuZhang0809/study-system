# Design Handoff — study-system

This folder vendors the Claude Design output that defines the
frontend's visual system, information architecture, and page-level
interactions.

**Source bundle:**
`docs/design/study-system/` — verbatim copy of the Claude Design
export (Apr 2026). The bundle's own top-level README
(`docs/design/study-system/README.md`) is authored by the design
tool and tells you how the handoff is meant to be consumed. It
always takes precedence over anything reinterpreted here.

## How to use this folder

- **It is the visual / interaction source of truth.** When the PRD
  and the design disagree on layout, component behavior, or copy
  density, the design wins for visuals; the PRD wins for product
  rules (anti-patterns, data semantics, v1 vs v2 scope).
- **It is not the target code.** The bundle is an HTML/JS/CSS
  prototype loaded by Babel Standalone at runtime. We are building
  the real app in Next.js + Prisma + Tailwind. Match the visual
  output; do not copy the prototype's React-via-CDN structure.
- **Read the chat transcript first** before changing anything
  design-derived. `docs/design/study-system/chats/chat1.md` carries
  the back-and-forth that produced the current look and the three
  teammate comments that were already addressed.

## Summary of what the bundle locks in

See [`docs/decisions/0001-design-handoff-reference.md`](../decisions/0001-design-handoff-reference.md)
for the durable summary. That decision record is the short
authoritative read; this folder is the long raw source.

## Updating the bundle

If a new Claude Design iteration ships:

1. Replace the contents of `docs/design/study-system/` wholesale.
   Do not merge selectively — the bundle is meant to stay as a
   single coherent handoff.
2. Update decision `0001` (or supersede it with a new record) to
   reflect what changed.
3. Note the update in `docs/STATE.md`.
