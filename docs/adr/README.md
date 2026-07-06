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

## Conventions

- Number monotonically (`NNNN-kebab-title.md`).
- Status: `Proposed` → `Accepted` → `Superseded by ADR-NNNN`.
- Superseded ADRs stay in the folder; do not delete.
- Update the index when adding.
- Every load-bearing decision needs an ADR. Trivial refactors do not.

## v1.1+ candidates

- ADR-0011: Postgres + Drizzle ORM pivot (planned for v1.1).
- ADR-0012: Real OAuth 2.0 device-flow + token exchange (planned for v1.1).
- ADR-0013: react-router v7 data router (planned for v1.3).
- ADR-0014: Playwright e2e with visual snapshots (planned for v1.3).
- ADR-0015: Helm chart + GHCR signed images (planned for v1.1).
- ADR-0016: OpenTelemetry spans (planned for v1.1).
