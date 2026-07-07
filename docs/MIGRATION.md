# Database migration — sql.js → Postgres

> **Audience:** operators upgrading a v1.0 foundation deployment to v1.1.

## When to migrate

- You have a v1.0 production deployment.
- You need multi-host / multi-region concurrency.
- You need real backup + restore (Postgres `pg_dump` / `pg_restore`).
- The `sql.js` synchronous `writeFileSync` on every write is becoming a bottleneck.

You can stay on sql.js indefinitely — `DATABASE_URL` continues to default
to the local file-backed engine. The v1.1 release does **not** force a
Postgres pivot.

## Before you start

1. **Back up the foundation DB file.** It's `data/miro-workflows.sqlite`
   (configurable via `DATABASE_PATH`). Copy it off-box.
2. **Pick a Postgres target.** We test on `postgres:16-alpine`. Any
   Postgres ≥ 14 works.
3. **Allocate a connection string** in the standard form
   `postgres://user:pass@host:5432/dbname?sslmode=require`.
4. **Set the migration env vars** in your `.env` or your secret manager:

   ```bash
   # Required for the live Postgres pivot.
   DATABASE_URL=postgres://user:pass@host:5432/miro?sslmode=require
   MIRO_TOKEN_ENCRYPTION_KEY=$(openssl rand -base64 32)
   # Optional but recommended.
   OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
   ```

## Step 1 — Apply the schema

```bash
# From the repo root.
psql "$DATABASE_URL" -f server/db/migrations/0001_init.sql
```

The SQL is idempotent: every `CREATE` uses `IF NOT EXISTS`, so re-running
is safe.

## Step 2 — Export from sql.js

A simple `scripts/migrate_from_sqljs.ts` ships in v1.1.1 (tracked in
`docs/internal/followups.md`). For now, a manual path:

1. **Boot the foundation against the v1.0 DB** and re-issue any tokens
   that have been used. Export `auth_tokens` via the v1.0 API:
   `GET /api/auth/tokens` returns the list of metadata rows.
2. **Manually port the rows** using the v1.1 columns. The columns
   changed:
   - v1.0 `integration_credentials` → v1.1 `integration_credentials` +
     `auth_tokens`.
   - v1.0 `auth_tokens.digest` stays the same (HMAC-SHA256).
   - v1.1 adds `bearer_cipher BYTEA` and `bearer_iv BYTEA` on
     `auth_tokens` — populated the first time a token is *re-issued*
     under v1.1.
3. **Start the v1.1 server** with the new `DATABASE_URL`. The server
   uses the `PgRepository` automatically (see `server/db/repository.ts`).

## Step 3 — Verify

```bash
# 1. Health check.
curl https://miro.example.com/api/health | jq .

# 2. Confirm the integration counts match.
curl https://miro.example.com/api/workspaces | jq '.data | length'
curl https://miro.example.com/api/boards | jq '.data | length'
curl https://miro.example.com/api/templates | jq '.data | length'
```

## Step 4 — Roll back

1. Switch `DATABASE_URL` back to `sqlite://data/miro-workflows.sqlite`.
2. Restart the server — the `Repository` selector picks the sql.js adapter
   automatically.
3. **Note:** any new rows written through the v1.1 OAuth flow (encrypted
   tokens) will be invisible in the v1.0 server because v1.0 doesn't
   decrypt the new `bearer_cipher` / `bearer_iv` columns.

## Performance expectations

The `pgRepository` (v1.1) does **not** yet implement every method —
the foundation uses `sql.js` for tests and dev. v1.1.1 fills in the
remaining CRUD paths. Until then, the v1.0 deployment keeps working
even on Postgres URLs — the server falls back to sql.js for the
read paths while the `pg.Pool` connection is open for write paths.

> See `docs/internal/followups.md` for the per-method implementation
> schedule.
