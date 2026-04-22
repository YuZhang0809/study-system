# 0002 — Schema-changing slice verifier adds runtime probe

**Status:** accepted
**Date:** 2026-04-22
**Supersedes:** —
**Superseded by:** —

## Context

`retro-flow` (closed 2026-04-22 at head `9a52828`) was fresh-context
reviewed as `approve` after:

- `cd web && npm run build` — green
- `cd web && npm run typecheck` — green
- `cd web && npm run lint` — green
- `cd web && npm test` — green, 140/140
- `npx prisma migrate diff --from-migrations prisma/migrations
  --to-schema prisma/schema.prisma --script --exit-code` — empty
- `git status` — clean

Every verifier signal was positive. But the implementer discovered
immediately after approval that the actual local runtime DB
(`web/prisma/dev.db`, resolved from `web/.env`'s
`DATABASE_URL="file:./prisma/dev.db"`) had never had
`_prisma_migrations` populated. `npx prisma migrate status` against
the real DATABASE_URL reported all four committed migrations as
unapplied. The existing rows in that DB (10 projects / 29 segments
/ 47 plan days / 3 daily logs) had been inserted via an earlier
`prisma db push` or direct write rather than a `prisma migrate
dev` flow.

`retro-flow`'s `add-retro-next-phase-first-thing` migration is the
first slice that adds a column the default page render queries at
boot (earlier slices were either initial-migration additions or
touched only columns that weren't queried on a cold page open), so
opening `/retros` on the real local runtime throws Prisma
`P2022: The column main.Retro.nextPhaseFirstThing does not exist
in the current database`. Prior slices had the same
`_prisma_migrations` gap silently.

The gap was invisible to every existing verifier step because:

- Unit / integration tests build a temp SQLite DB by replaying the
  committed migration SQL files directly. They never read
  `web/.env` or touch `web/prisma/dev.db`.
- `npm run build` / `typecheck` / `lint` never exercise runtime
  Prisma queries against the real DATABASE_URL.
- `prisma migrate diff --from-migrations --to-schema` compares the
  committed migrations against the committed schema. It never
  asks a specific database what it has applied.

The review playbook in `docs/code_review.md` and the per-slice
Verification section in `docs/plans/*.md` both inherit this gap.

## Options considered

**A — accept the gap.** Rely on the implementer to open the app
manually after merging a schema-changing slice. Rejected: we just
proved this doesn't work — the dogfood deadline is 2026-05-03 and
every schema-changing slice is high-stakes. Missing this once
cost one review round-trip; missing it on 2026-05-03 morning
would cost the dogfood launch.

**B — block schema-changing merges until the local DB is rebuilt
from migrations on every reviewer machine.** Rejected: the
reviewer's machine state is not the codebase's concern. The
codebase should be verifiable against an arbitrary fresh DB, not
against a specific reviewer's dev DB.

**C — add two verifier steps that any slice touching the schema
must pass before review handoff: (1) `prisma migrate status`
against the real DATABASE_URL must report every committed
migration as applied; (2) a runtime probe against the slice's
primary surface (loading the page, hitting the server action, or
running the CLI) must succeed against the real DATABASE_URL.**
Chosen. This gives us a cheap and direct signal that the real
runtime can boot with the new schema, without constraining
what "the real DB" has to look like.

## Decision

1. Every slice that changes `web/prisma/schema.prisma` or adds a
   migration under `web/prisma/migrations/` MUST, before review
   handoff, run:

   ```
   cd web && npx prisma migrate status
   ```

   and include the command output in the handoff report. "Every
   committed migration shows as applied against the current
   DATABASE_URL" is the pass criterion. If the local DB is behind,
   the implementer MUST either run `prisma migrate deploy` to catch
   it up or recreate the DB from migrations + seed — whichever the
   PM approves — and include the path they took in the report.

2. Every slice that changes `web/prisma/schema.prisma` or adds a
   migration MUST, before review handoff, perform at least one
   runtime probe against the real DATABASE_URL. The probe
   exercises the slice's primary surface:

   - For a page slice: open the page via `next start` and confirm
     no Prisma error appears in either the browser or the server
     console.
   - For a CLI slice: run the CLI end-to-end against the real DB
     and confirm exit code 0 + expected output shape.
   - For a server-action-only slice: call the action from the
     relevant page and confirm the write lands.

   The probe output goes into the handoff report. "Real runtime
   renders / runs / writes without a Prisma error" is the pass
   criterion.

3. Slices that do NOT change the schema or migrations are
   unaffected; the existing `build / typecheck / lint / test`
   verifier stays as-is.

4. The code-review prompt template (pasted inline per
   `feedback_review_prompts_inline.md`) gains a corresponding
   reviewer check for schema-changing slices: the reviewer
   confirms the handoff contains `prisma migrate status` output
   showing all committed migrations applied against the real
   `DATABASE_URL`, and confirms the runtime-probe evidence. Where
   the reviewer has their own local DB, they may additionally run
   `prisma migrate diff --from-config-datasource --to-schema
   prisma/schema.prisma` against it to cross-check schema parity.
   If the implementer did not include the two reports, that alone
   is a blocker.

5. This decision does not amend `PRD.md`, `AGENTS.md`, or
   `CLAUDE.md`. It is an operational addition to the per-slice
   verifier, not a product or anti-pattern change.

## Consequences

- Schema-changing slices carry two additional required verifier
  lines. Cost is low (one `prisma migrate status` + one page
  open or CLI run) relative to the review round-trip cost of
  missing runtime drift.
- Implementers must keep a working `web/prisma/dev.db` (or an
  explicit rebuild path) so the runtime probe can actually
  happen. This is a de facto requirement already, but now
  enforced at the verifier boundary.
- The first slice after this decision (`export-json-cli` or the
  local-DB rebuild chore, whichever lands first) is the first
  test of the new rule.
- This rule is consistent with the two-actor model (Claude PM /
  Codex impl): Claude adds the two lines to the Verification
  section of any schema-changing plan; Codex runs them and
  reports the output; reviewer blocks on missing output.

## Open items

- The existing `docs/code_review.md` playbook text still
  describes only the four build-time verifiers. A future edit
  pass should amend the review playbook to reflect rules 1, 2,
  and 4 above. Deferred to after dogfood launch to keep the
  pre-2026-05-03 change surface tight.
- The local `web/prisma/dev.db` drift was resolved 2026-04-22 by
  drop + rebuild via `prisma migrate deploy` against an empty DB
  (no seed — no canonical prod yaml exists yet; the Agentic 90-day
  yaml for dogfood is authored separately). Backup of the pre-drop
  DB was dumped to `web/prisma/backups/` (gitignored). This was
  the first execution of the runtime-probe rule and it passed
  (`/retros`, `/retros?tab=weekly`, `/today` all returned 200 with
  no Prisma error in the server log).
- Prisma 7 renamed `migrate diff`'s `--from-schema-datasource` to
  `--from-config-datasource`. Any future verifier or handoff
  template referencing the schema-datasource diff must use the
  new flag. (The rules above use `prisma migrate status`, which
  is unaffected.)
