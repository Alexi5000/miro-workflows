# Architecture Decision Records

This directory captures **load-bearing** architectural choices — decisions that
shape the codebase and would be costly to reverse. Each ADR follows the
[Michael Nygard template](https://github.com/joelparkerhenderson/architecture-decision-record).

## Index

| ADR | Title | Status |
| --- | --- | --- |
| [ADR-0001](0001-demo-first-default.md) | Demo-first by default, live Miro opt-in via env | Accepted |
| [ADR-0002](0002-raw-http-with-zod.md) | Raw `node:http` server (no Express) + zod | Accepted |
| [ADR-0003](0003-sql-js-for-local-dev.md) | `sql.js` for local dev, file-backed SQLite | Accepted |
| [ADR-0004](0004-mcp-separated-from-http.md) | Custom MCP package separated from HTTP API | Accepted |
| [ADR-0005](0005-vite-spa-no-next.md) | React + Vite single-page dashboard, not Next.js | Accepted |
| [ADR-0006](0006-three-agent-harness.md) | Three-agent Planner → Generator → Evaluator harness | Accepted |

## Conventions

- Number monotonically.
- Filename `NNNN-kebab-title.md`.
- Status: `Proposed` → `Accepted` → `Superseded by ADR-NNNN`.
- Superseded ADRs stay in the folder; do not delete.
- Status `Accepted` with no supersession is the active decision.

## Adding a new ADR

1. Pick the next number.
2. Use `template.md` (in this folder) as the skeleton.
3. Update this README index.
