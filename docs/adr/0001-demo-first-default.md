# ADR-0001: Demo-first by default, live Miro opt-in via env

- Status: Accepted
- Date: 2026-07-05

## Context

Miro Workflows is a public, agent-friendly repo. Contributors, CI, and demo
deployments must boot **without** an external Miro account or token. Yet the
real product is the integration with `https://api.miro.com`. We need a default
that just runs.

## Decision

The HTTP API and MCP server both default to **demo mode**:

- `server/config.ts` reads `MIRO_PROVIDER_MODE` (if `demo` or `miro`) and falls
  back to deriving mode from the presence of `MIRO_ACCESS_TOKEN`.
- `miro-custom-mcp/src/index.ts` instantiates `FakeMiroApiClient` when no token
  is present (or `MIRO_PROVIDER_MODE=demo`), `MiroApiClient` otherwise.
- `docker-compose.yml` injects `MIRO_PROVIDER_MODE=${MIRO_PROVIDER_MODE:-demo}`.

In demo mode:

- The HTTP API serves seeded boards/templates; `/api/sync/boards` returns
  synthetic results; `/api/runs` emits synthetic `BoardItem` rows.
- The MCP server returns deterministic shapes from `FakeMiroApiClient`.

## Consequences

- ✅ Anyone can `pnpm install && pnpm test` and contribute without Miro.
- ✅ CI is hermetic and deterministic.
- ⚠️ Demo responses must NOT leak into production paths; the typed errors
  (`MiroAuthError`, `MiroRateLimitError`) only fire in live mode.
- ⚠️ Tests must explicitly delete `MIRO_*` env vars (`tests/setup.ts`,
  `miro-custom-mcp/tests/setup.ts`) to avoid accidental live calls.

## Alternatives considered

- **Always-live with mock fixtures**: rejected — would force every contributor
  to obtain a Miro account.
- **Two binaries (`miro-workflows-demo`, `miro-workflows`)**: rejected — adds
  packaging complexity for a flag that fits in three lines of TypeScript.
