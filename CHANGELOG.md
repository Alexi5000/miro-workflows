# Changelog

All notable changes to **Miro Workflows** are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

> See [`ROADMAP.md`](./ROADMAP.md) for the forward-looking public plan and
> [`docs/adr/`](./docs/adr/) for load-bearing architectural decisions.

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
