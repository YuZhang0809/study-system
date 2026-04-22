# study-system

Local-first, single-user learning-management app. Reflection mirror,
not a study buddy — the app captures the account (`账`) of learning
after the fact, so the user cannot self-deceive about their own
learning state.

Built for the author's 90-day Agentic AI Product Builder track
(2026-05-03 onward). Learning itself happens elsewhere (Claude Code,
books, courses, hands-on code); this app records what came out:
daily logs, weekly reviews, phase retros, and knowledge items
(learning / concept / bug / prompt) with pointers to external
artifacts.

## Four anti-patterns (product identity)

1. **Not a tutor** — does not answer "what is X"
2. **Not a ghostwriter** — the user writes their own body text;
   AI is restricted to form-layer suggestions (slug / tag / relation)
3. **Not a cheerleader** — no streaks, no emoji, no inflated stats
4. **Not a planner** — plan yaml is authored outside the app

Every slice, feature, and copy string is checked against these.

## Repo shape

```
PRD.md                  product definition (v1.0)
AGENTS.md / CLAUDE.md   operating contracts (impl / PM)
docs/
  STATE.md              current phase + recommended next step
  decisions/            architectural + process decision records
  plans/                active and archived execution plans
  design/study-system/  Claude Design handoff bundle (vendored)
  history/              long-form post-milestone notes
web/
  prisma/schema.prisma  data model
  lib/                  data + presentation layers per slice
  app/                  routes (/today, /knowledge, /retros, /settings, ...)
  components/           UI primitives per slice
  tests/                RTL + temp-SQLite integration tests
  scripts/              seed CLI
```

## Getting started

Requires Node.js 20+ and npm. Runs on Windows / macOS / Linux.

```bash
cd web
npm install

# Initialize the local SQLite DB from committed migrations.
npx prisma migrate deploy

# Optional: seed a plan yaml (sample fixture in web/tests/fixtures/).
npm run seed -- ./tests/fixtures/seed-smoke.yaml

npm run dev
```

The dev server listens on http://localhost:3000 by default.

## Runtime stack

- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind v4 via `@tailwindcss/postcss`
- Prisma 7 with `@prisma/adapter-better-sqlite3`
- SQLite — local-first only; no cloud sync, no multi-user
- Zod at the server boundary
- Vitest 4 + jsdom + React Testing Library

No runtime LLM in v1. No network calls beyond localhost. AI
assistance, if any, is strictly v2 and operates only in
**draft → user commit** mode.

## Status

v1 feature-complete as of 2026-04-22. See
[`docs/STATE.md`](./docs/STATE.md) for the current phase, verification
snapshot, and recommended next step.

## More

- Product definition: [`PRD.md`](./PRD.md)
- Agent operating contracts: [`AGENTS.md`](./AGENTS.md) (Codex),
  [`CLAUDE.md`](./CLAUDE.md) (PM layer)
- Decision records: [`docs/decisions/`](./docs/decisions/)
- Vendored frontend design handoff: [`docs/design/study-system/`](./docs/design/study-system/)

## Scope

This repository is the author's personal learning-management tool,
not a library intended for general use. Issues and PRs are not
being monitored at v1.
