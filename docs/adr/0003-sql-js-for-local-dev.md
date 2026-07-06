# ADR-0003: `sql.js` for local dev, file-backed SQLite

- Status: Accepted
- Date: 2026-07-05

## Context

We need a database that runs:

1. In a fresh clone (no Postgres / Docker / external services).
2. Inside CI on every OS without a native compile step.
3. Inside Docker containers that ship a single static binary at runtime.

`better-sqlite3` is faster but requires a native build per platform, which is
fragile in a Windows + macOS + Linux multi-OS maintainer pool.

## Decision

Use **`sql.js`** (WebAssembly SQLite) plus `Buffer.from(db.export())`
persistence:

- `server/db/database.ts` initializes `SQL.Database` lazily.
- A `persist()` writes the entire DB to `DATABASE_URL` on every write — small
  databases make this cheap.
- On boot, if the file exists, it is loaded into memory; otherwise the schema
  is migrated.
- Schema is plain SQL in `server/db/schema.sql`; `migrate()` reads and runs it
  with `db.run(sql)`.

## Consequences

- ✅ Zero native dependencies; identical behavior on every OS.
- ✅ Tests get a hermetic DB in `/tmp` per process via `tests/setup.ts`.
- ⚠️ Every write triggers a full export — fine for the current scale (≤ a few
  hundred rows per workspace) but flagged for future scale work.
- ⚠️ Concurrent writers would race on the persist call; we keep the API
  single-threaded under Node's event loop today.

## Alternatives considered

- **`better-sqlite3`**: rejected — native build, harder in containers.
- **Postgres in compose**: rejected — adds an external service to FDE dev.
- **In-memory only**: rejected — would lose seeded data on every restart.
