# Architecture Decision Records

This directory captures **load-bearing** architectural choices — decisions that
shape the codebase and would be costly to reverse. Each ADR follows the
[Michael Nygard template](https://github.com/joelparkerhenderson/architecture-decision-record).

## Index

| ADR | Title | Status | Date |
| --- | --- | --- | --- |
| [ADR-0001](0001-demo-first-default.md) | Demo-first by default, live Miro opt-in via env | Accepted | 2026-07-05 |
| [ADR-0002](0002-raw-http-with-zod.md) | Raw `node:http` server (no Express) + zod | Accepted | 2026-07-05 |
| [ADR-0003](0003-sql-js-for-local-dev.md) | `sql.js` for local dev, file-backed SQLite | Accepted | 2026-07-05 |
| [ADR-0004](0004-mcp-separated-from-http.md) | Custom MCP package separated from HTTP API | Accepted | 2026-07-05 |
| [ADR-0005](0005-vite-spa-no-next.md) | React + Vite single-page dashboard, not Next.js | Accepted | 2026-07-05 |
| [ADR-0006](0006-three-agent-harness.md) | Three-agent Planner → Generator → Evaluator harness | Accepted | 2026-07-05 |
| [ADR-0007](0007-bearer-auth-wall.md) | Bearer-token auth wall on write endpoints | Accepted | 2026-07-06 |
| [ADR-0008](0008-structured-logging-and-metrics.md) | Structured access logging + Prometheus `/metrics` | Accepted | 2026-07-06 |
| [ADR-0009](0009-webhook-hmac-and-dedupe.md) | Webhook ingestion with HMAC + idempotent dedupe | Accepted | 2026-07-06 |
| [ADR-0010](0010-zod-to-json-schema.md) | Drop hand-rolled JSON-Schema emitter for `zod-to-json-schema` | Accepted | 2026-07-06 |
| [ADR-0011](0011-postgres-pivot.md) | Postgres + Drizzle ORM pivot | Accepted | 2026-07-07 |
| [ADR-0012](0012-otel-traces-and-logs.md) | OpenTelemetry traces + structured logs | Accepted | 2026-07-07 |
| [ADR-0013](0013-real-oauth-device-flow.md) | Real Miro OAuth 2.0 device-flow round-trip | Accepted | 2026-07-07 |
| [ADR-0014](0014-token-encryption-aes-gcm.md) | Token encryption-at-rest (AES-256-GCM) | Accepted | 2026-07-07 |
| [ADR-0015](0015-react-router-v7.md) | react-router v7 (data router) | Accepted | 2026-07-07 |
| [ADR-0016](0016-helm-and-oci.md) | Helm chart + GHCR OIDC publish | Accepted | 2026-07-07 |

## Conventions

- Number monotonically (`NNNN-kebab-title.md`).
- Status: `Proposed` → `Accepted` → `Superseded by ADR-NNNN`.
- Superseded ADRs stay in the folder; do not delete.
- Update the index when adding.
- Every load-bearing decision needs an ADR. Trivial refactors do not.

## v1.2+ candidates

- ADR-0017: KMS-backed token cipher (AWS KMS / GCP KMS) — replaces the
  env-var master key from ADR-0014.
- ADR-0018: Workspace-level rate limiting (token bucket per `workspace_id`).
- ADR-0019: Audit-event streaming to S3 / GCS for long-term retention.
- ADR-0020: Replay protection for the webhook endpoint (timestamp + nonce
  window) — extends ADR-0009.
- ADR-0021: Per-cloud Helm overlays (EKS / GKE / AKS).
- ADR-0022: React Suspense + `useTransition` (deferred — covered by
  ADR-0015 but not yet implemented).
