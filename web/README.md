# web — study-system app

Next.js 16 + Prisma + SQLite + Zod + Tailwind v4. Local-first,
single-user. See [../PRD.md](../PRD.md) and
[../AGENTS.md](../AGENTS.md) for product and operating context.

## Quick start

```
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate    # applies web/prisma/migrations to prisma/dev.db
npm run seed -- tests/fixtures/seed-smoke.yaml --dry-run
npm run dev               # http://localhost:3000
```

## Scripts

- `dev` / `build` / `start` — Next.js
- `lint` / `typecheck` — eslint + `tsc --noEmit`
- `seed -- <path> [--dry-run]` — idempotent plan import with loud
  update/orphan reporting
- `test` / `test:watch` — vitest (schema round-trip + Zod units)
- `prisma:migrate` / `prisma:generate` / `prisma:studio` — Prisma

## Layout

- `app/` — App Router routes; six surfaces under `today|plan|knowledge|retros|artifacts|settings`
- `components/shell/` — sidebar, header, footer, keyboard nav
- `lib/schemas/` — Zod schemas with co-located in-source tests
- `lib/surfaces.ts` — six-surface map (single source of truth)
- `prisma/schema.prisma` — data model (see PRD §3)
- `prisma.config.ts` — Prisma 7 datasource + migrations config
- `tests/` — cross-cutting tests (round-trip, integration)

## Design rules

- No Google Fonts at runtime; Apple system font stack only
- No italics anywhere
- Paper-ruling overlay on `body::before` is identity, not decoration
- UI copy in Simplified Chinese; code and comments in English
