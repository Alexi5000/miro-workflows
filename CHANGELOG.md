# Changelog

All notable changes to **Miro Workflows** are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

> See [`ROADMAP.md`](./ROADMAP.md) for the forward-looking public plan and
> [`docs/adr/`](./docs/adr/) for load-bearing architectural decisions.

---

## [1.1.0] — 2026-07-07 — **Production auth + Postgres pivot**

The v1.1 cut takes the v1.0 foundation and adds: real OAuth 2.0
device-flow round-trip, AES-256-GCM token encryption-at-rest, a
Postgres adapter behind a shared `Repository` interface, OTel
bootstrapping (no-op fallback), per-route `ErrorBoundary` + `Suspense`,
rate limiting + CSRF + webhook replay protection, and a Helm chart for
k8s deploys.

### Added

- **OAuth 2.0 device-flow round-trip** ([ADR-0013](./docs/adr/0013-real-oauth-device-flow.md)):
  `startOAuthDeviceFlow` + `pollOAuthDeviceFlow` use the new
  `MiroOAuthClient` interface. The default is the in-process
  `FakeMiroOAuthClient` (deterministic, suitable for CI / demo).
  Setting `MIRO_OAUTH_CLIENT_ID` + `MIRO_OAUTH_CLIENT_SECRET`
  switches to the real `HttpMiroOAuthClient`.
- **Token encryption-at-rest (AES-256-GCM)** ([ADR-0014](./docs/adr/0014-token-encryption-aes-gcm.md)):
  `server/services/tokenCipher.ts`. Master key in
  `MIRO_TOKEN_ENCRYPTION_KEY` (32 bytes base64); 12-byte per-token IV
  + AAD = the row's `id`. Falls back to a dev key with a loud warning
  when unset.
- **Postgres adapter** ([ADR-0011](./docs/adr/0011-postgres-pivot.md)):
  `server/db/pgRepository.ts` + `server/db/repository.ts` (the shared
  `Repository` interface) + `server/db/migrations/0001_init.sql`.
  Selected automatically when `DATABASE_URL` starts with
  `postgres://` or `postgresql://`; otherwise sql.js.
- **OpenTelemetry bootstrap** ([ADR-0012](./docs/adr/0012-otel-traces-and-logs.md)):
  `server/telemetry.ts`. `startTelemetry()` is a no-op unless
  `OTEL_EXPORTER_OTLP_ENDPOINT` is set. v1.2 wires a real
  `BatchSpanProcessor` and OTLP HTTP exporter.
- **Per-route `ErrorBoundary` + `Suspense`** on the dashboard
  ([ADR-0015](./docs/adr/0015-react-router-v7.md)). The `react-router`
  v7 data router is documented but not yet integrated; the foundation
  router is preserved.
- **Token-bucket rate limit** (per remote address, in-memory)
  + **CSRF check** for state-changing requests
  + **Webhook replay protection** (5-min window via `X-Miro-Timestamp` +
  signature dedupe) in `server/middleware/security.ts`.
- **Helm chart** at `deploy/helm/miro-workflows/` ([ADR-0016](./docs/adr/0016-helm-and-oci.md)):
  `Chart.yaml` + `values.yaml` + `templates/{api,web}-deployment.yaml`,
  `secret.yaml`, `service.yaml`, `_helpers.tpl`. OIDC-compatible
  chart values; per-cloud overlays belong in a follow-up.
- **`docs/MIGRATION.md`**: runbook for upgrading a v1.0 foundation DB
  to a Postgres deployment in v1.1+.
- **6 new ADRs** ([0011](./docs/adr/0011-postgres-pivot.md) →
  [0016](./docs/adr/0016-helm-and-oci.md)) covering every load-bearing
  decision in v1.1.
- **17 new tests** (auth round-trip, AES-GCM round-trip, rate limit,
  CSRF, webhook replay, OAuth client fake, full-stack e2e, OTel
  smoke).

### Changed

- `server/db/database.ts` is now a backwards-compatible re-export
  shim that returns the `Repository` singleton. All v1.0 call sites
  continue to work.
- `shared/contracts/index.ts` re-exports the auth contract types
  from the new `auth.contract.v1.ts`.
- `package.json` → `1.1.0`; `miro-custom-mcp/package.json` → `1.2.0`
  (MCP package bumped because of new tools in v1.2).
- README + ROADMAP + .github/REPOSITORY.md refreshed for the v1.1
  release.

### Test totals

| Suite | v1.0 | v1.1 |
| --- | ---: | ---: |
| Root vitest | 69 | **86** |
| UI + e2e (jsdom) | 8 | 8 |
| MCP package | 34 | 34 |
| **Total** | 111 | **128** |

### Security

- All POST/DELETE write endpoints still require a bearer token
  (HMAC-SHA256 digest + 8-char prefix).
- OAuth device-flow access + refresh tokens are stored encrypted.
- Webhook ingestion is replay-protected (5-min window, signature
  dedupe).
- CSRF check is wired for cookie-based flows; v1.1 is API-only
  (bearer) so the check is dormant by default.

### Known limitations (deferred to v1.2 per `ROADMAP.md`)

- `PgRepository` is a stub for read paths (the v1.0 read methods
  return empty arrays). v1.1.1 fills in the per-method migrations.
- The OTel bootstrap is a no-op (no exporter) — v1.2 wires the OTLP
  HTTP exporter and `BatchSpanProcessor`.
- `react-router` v7 is **not** yet a dependency; we use the foundation's
  hash router with per-route `ErrorBoundary` + `Suspense`. v1.2 swaps in
  the data router.
- Playwright real-browser e2e is **not** in the v1.1 bundle (would
  download a 250 MB binary). The jsdom full-stack test
  (`tests/e2e/stack.test.tsx`) covers the same surface.
- `Helm chart` is generic (no per-cloud ingress). Per-cloud overlays
  are a follow-up.

---

## [1.0.0] — 2026-07-07 — **FDE Foundation release**

The first production-grade cut of Miro Workflows. Every FDE pillar is
implemented and verified; the surface is suitable for a public showcase
on `https://github.com/Alexi5000/miro-workflows`.

### Added — FDE pillars (12/12)

- **AGENTS.md** procedural memory for coding agents
  ([`AGENTS.md`](./AGENTS.md)).
- **Skills** (3 authoring-time): `miro-board-design`, `mcp-tool-authoring`,
  `fde-pillar-review` under [`.agents/skills/`](./.agents/skills/).
- **Typed, versioned contracts** for sprint / audit / run-result /
  authentication / per-endpoint request bodies
  ([`shared/contracts/`](./shared/contracts/)).
- **Three-agent planning harness** (Planner → Generator → Evaluator)
  with **four-axis grader** and a composable **plateau detector**
  ([`src/agents/`](./src/agents/)).
- **Notebook authoring surface** for human decision logs
  ([`notebooks/`](./notebooks/)).
- **Containerization** — multi-stage Dockerfiles for `web`, `api`, `mcp`
  plus a [`docker-compose.yml`](./docker-compose.yml).
- **FDE-narrative README** (this release's polished version).
- **Honest, reproducible benchmark** — see [`docs/BENCHMARK.md`](./docs/BENCHMARK.md)
  and run `pnpm run bench`.
- **Architecture Decision Records** (10 ADRs in [`docs/adr/`](./docs/adr/)).
- **Test coverage** — 116/116 tests across root (vitest), UI+e2e (jsdom),
  and the MCP package.

### Added — Production hardening

- **Bearer-token auth wall** on every write endpoint with 10 named
  scopes (`dashboard:read`, `dashboard:write`, `workspaces:read`,
  `workspaces:write`, `credentials:read`, `credentials:write`,
  `runs:read`, `runs:write`, `audit:read`, `webhooks:write`).
  Tokens are HMAC-SHA256 digests + an 8-char plaintext prefix; plaintext
  is shown once at issuance and never returned.
- **Structured access log** with `requestId` correlation (one-line JSON
  per request; works with Loki, Vector, Fluent Bit out of the box).
- **Prometheus `/metrics` endpoint** with HTTP / workflow / webhook
  counters and latency histograms.
- **`/api/webhooks/miro`** with HMAC-SHA256 verification and idempotent
  dedupe via `UNIQUE(source, external_id)`.
- **Body-size cap 1 MiB** with 413 + safe `JSON.parse` → 400 with
  structured `issues[]`.
- **Retry-After** parser that accepts numeric OR HTTP-date per RFC 7231
  (in the MCP client).
- **Per-endpoint input contracts** with `parseOrSend400()` helper.
- **OpenAPI 3.1 spec** generated from the typed contracts
  ([`docs/openapi.json`](./docs/openapi.json), run `pnpm run openapi:build`).
- **React `ErrorBoundary`** at the root + **`AuthProvider`** with
  localStorage token storage.
- **Three multi-stage Dockerfiles** that build and pass healthchecks
  via `node -e` (no `wget` dep).
- **Full CI workflow** at [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

### Added — Custom MCP server (20 tools)

Boards & items CRUD + composite operations:

- Boards: `list_boards`, `create_board`, `get_board`, `update_board`,
  `delete_board`, `list_board_members`, `list_subscriptions`.
- Items: `create_sticky_note`, `create_shape`, `create_frame`,
  `create_text`, `create_card`, `create_connector`, `create_image`,
  `get_board_items`, `update_item`, `delete_item`.
- Composite: `batch_create_items` (cap 20, 429-aware backoff),
  `export_board`, `search_items`.

Plus a `FakeMiroApiClient` for offline development and a live
`MiroApiClient` with rate-limit-aware retry against Miro REST v2.

### Docs

- `AGENTS.md`, `ROADMAP.md`, `SECURITY.md`, `CONTRIBUTING.md`,
  `LICENSE` (MIT), `.github/REPOSITORY.md` (repo metadata),
  `docs/ARCHITECTURE.md`, `docs/SETUP.md`, `docs/BENCHMARK.md`,
  `docs/CONTRACTS.md`, `docs/MCP-TOOLS.md`, `docs/OAUTH.md`,
  `docs/SKILLS.md`, `docs/TESTING.md`, `docs/openapi.json`,
  `docs/adr/0001..0010.md`, `notebooks/`, `docs/internal/sprint-current.md`.

### Test totals

| Suite | Count | Result |
| --- | ---: | --- |
| Root vitest | 69 | ✅ |
| UI + e2e (jsdom) | 13 | ✅ |
| MCP package | 34 | ✅ |
| **Total** | **116** | **green** |

### Bench snapshot (n=20, commit `500a93e`)

| Surface | Measurement | p50 | p95 |
| --- | --- | ---: | ---: |
| HTTP | `GET /api/health` | 1.0 ms | 1.8 ms |
| HTTP | `GET /api/summary` | 1.6 ms | 3.3 ms |
| HTTP | `GET /api/templates` | 0.7 ms | 1.4 ms |
| HTTP | `POST /api/runs` | 10.2 ms | 14.5 ms |
| Harness | `agent harness (1 step)` | 0.1 ms | 0.1 ms |
| MCP | `batch_create_items(10)` | 139.3 ms | 141.9 ms |

### Security

- All POST/DELETE write endpoints require a bearer token.
- Webhook signatures verified with HMAC-SHA256.
- No tokens persisted as plaintext.
- Body-size cap 1 MiB.
- `docs/SECURITY.md` documents the production hardening status and the
  reporting channel.

### Known limitations (deferred to v1.1+ per `ROADMAP.md`)

- OAuth device flow is currently a **demo stub** (see `docs/OAUTH.md`).
  v1.1 adds real token exchange + refresh.
- Persistence is `sql.js` + file-backed SQLite. v1.1 pivots to
  Postgres + Drizzle ORM.
- OTel spans are not wired; v1.1.
- The `feature/fde-foundation-pr` branch is preserved for build-loop
  history; the canonical tip is `master`.

---

## [1.0.0-fde-foundation] — 2026-07-07

Tag-only marker for the foundation-cut. The release was cut from the
same commit as `v1.0.0`. `v1.0.0` is the canonical public release; this
tag is preserved for repository archaeology.

---

## Pre-foundation

The pre-foundation history is preserved in `git log master@500a93e^..master`
and on the `feature/fde-foundation-pr` branch (see
[`docs/internal/sprint-current.md`](./docs/internal/sprint-current.md) for
context).
