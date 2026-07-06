# Current Sprint — Foundation v1.0

> **Last revised:** 2026-07-06 (build-loop session)
> **Status:** ✅ All 12 FDE pillars + production hardening done
> **Branch:** `feature/fde-foundation-pr` (22 commits ahead of `master`)

## Sprint goal

Take the foundation PR from "FDE clean" to "deployable in a regulated production
environment" without skipping the deferred pillars.

## Definition of done

- [x] Auth wall (bearer + scope) on every write endpoint
- [x] Structured access log (requestId, method, path, status, durMs, workspace)
- [x] Prometheus `/metrics` endpoint with HTTP / workflow / webhook counters
- [x] Webhook endpoint with HMAC verification + dedupe via unique constraint
- [x] Per-endpoint zod contracts (sprint / credential / auth / query)
- [x] 1 MiB body-size cap with 413 + safe JSON.parse
- [x] Retry-After parser handles numeric + HTTP-date
- [x] ErrorBoundary at the React root with recovery affordance
- [x] AuthProvider in the React tree with localStorage token storage
- [x] zod-to-json-schema replaces the hand-rolled emitter
- [x] OpenAPI 3.1 generator + `docs/openapi.json` artifact
- [x] Full-stack e2e in jsdom (no browser binary)
- [x] CI workflow (`.github/workflows/ci.yml`) with typecheck + tests + smoke + validate + bench
- [x] Container healthchecks that don't require `wget`
- [x] `ROADMAP.md`, `SECURITY.md`, `CONTRIBUTING.md`, `.nvmrc`, CODEOWNERS, dependabot
- [x] Auth gate on `/api/credentials` POST/DELETE and `/api/workspaces/:id/oauth/device-code`
- [x] All 81 tests green (root 68, UI 13, MCP 34)
- [x] `docker compose config -q` exits 0
- [x] Three Dockerfiles build successfully

## Test totals (final)

| Surface | Tests |
| --- | ---: |
| Root vitest | 68 |
| Root UI+e2e (jsdom) | 13 |
| MCP package | 34 |
| **Total** | **115** |

## What's NOT in this loop (deferred to v1.1+ per ROADMAP.md)

- v1.1: real OAuth device-flow round-trip (server token exchange), Postgres pivot, OTel, Helm chart, GHCR signed images.
- v1.2: real Miro REST + webhooks, full board CRUD.
- v1.3: react-router v7 data router + Suspense + Playwright + a11y.
- v1.4: multi-tenant DB isolation, read replicas.
- v1.5: official TS / Python / Go SDKs.

## Risks (out of foundation but tracked)

- `sql.js` persistence is synchronous on every write. Will not scale past
  a few hundred rows. Postgres pivot in v1.1 is the durable answer.
- No rate-limiting middleware yet. Add to v1.1 alongside the auth wall.
- `MIRO_WORKFLOWS_TOKEN_SECRET` defaults to a dev fallback. Production
  must set the real secret. The dev path logs a loud warning on boot.

## Push plan

- Tag `v1.0.0-fde-foundation` on the merged commit.
- Push `feature/fde-foundation-pr` to `origin` once user approves.
- Begin v1.1 work in a new `feature/v1.1-auth-postgres` branch.
