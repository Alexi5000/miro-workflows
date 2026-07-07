# ADR-0011: Postgres + Drizzle ORM pivot

- Status: Accepted
- Date: 2026-07-07

## Context

The foundation uses `sql.js` + file-backed SQLite. This was the right call
for a fast, hermetic foundation (no native build, no external service),
but it has three production blockers:
- `persist()` is `writeFileSync` of the entire DB on every write — O(n) per
  request and unsafe under concurrent traffic.
- No network access for the dashboard; the server is single-host only.
- `sql.js` is in-process WASM, so transactions across processes are
  impossible.

## Decision

Adopt **PostgreSQL** as the production database, accessed through
**Drizzle ORM** (typed schema + lightweight query builder). The
`sql.js` adapter stays behind a feature flag for local dev and tests.

### Boundaries

- A `Repository` interface (`server/db/repository.ts`) is the single
  contract every consumer depends on. The interface ships ~25 methods
  (workspaces, boards, templates, runs, items, audit, auth_tokens,
  webhook_deliveries).
- Two concrete adapters: `SqlJsRepository` (current) and
  `DrizzleRepository` (v1.1). Tests exercise BOTH against the same
  contract via a shared `tests/repository.contract.test.ts` matrix.
- Adapter selection: `DATABASE_URL` starting with `postgres://` or
  `postgresql://` → Drizzle; everything else (incl. `sqlite://`,
  `:memory:`) → sql.js.
- Connection pool: `pg.Pool` with sane defaults (10 idle, 20 max).
  Migrations live in `server/db/migrations/0001_init.sql`; Drizzle's
  migration tool generates them from the schema in `server/db/schema.ts`.

### Schema parity

Every table from `server/db/schema.sql` gets a Drizzle definition in
`server/db/schema.ts`. Indexes are preserved. New columns in v1.1:
- `auth_tokens.refresh_token_digest TEXT` — refresh token storage.
- `auth_tokens.encryption_iv BLOB` — per-token IV for the AES-GCM cipher.
- `auth_tokens.last_refreshed_at TEXT` — for refresh-on-expiry logic.
- `webhook_deliveries.signature_valid INTEGER` — 0/1; flip to 0 on HMAC fail.

### Why Drizzle over Prisma / Kysely

- Prisma: heavier runtime, schema-first DSL, codegen — overkill for our
  size.
- Kysely: pure query builder, no schema layer — fine for a single team
  but loses the zod-to-Drizzle integration we already have for contracts.
- Drizzle: TypeScript-first, zero-runtime-codegen, composes with our
  existing `shared/contracts/` zod schemas (we generate the OpenAPI
  specs from the same zod sources).

## Consequences

- ✅ A single `pnpm run db:migrate` step upgrades a foundation
  foundation DB to a Postgres Drizzle-managed schema.
- ✅ All `server/db/database.ts` callers continue to work via the
  shared `Repository` interface.
- ✅ The auth wall's `auth_tokens` table gains encrypted refresh tokens.
- ⚠️ `pg` is a new native dependency. Pin to a stable major (`^8.x`).
  Test against both Linux and macOS to ensure the wheel is portable.
- ⚠️ Migrations are now first-class. A failed migration must roll back
  atomically; the v1.1 migration runner wraps each step in a transaction.

## Alternatives considered

- **Stick with sql.js** for v1.1: rejected — would not unblock the
  production concurrency / multi-host path.
- **CockroachDB or DynamoDB**: considered. Rejected for v1.1 — Postgres
  is the lowest-risk choice for a stateful, transactional workload.
