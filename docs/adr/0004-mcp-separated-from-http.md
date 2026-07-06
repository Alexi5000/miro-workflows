# ADR-0004: Custom MCP package separated from HTTP API

- Status: Accepted
- Date: 2026-07-05

## Context

The Miro MCP server and the HTTP dashboard API both wrap Miro REST, but they
have **different transports and audiences**:

- The MCP server is a stdio process that brokers MCP `CallTool` requests from
  any MCP-compatible client (Claude, codex, Cursor, etc.).
- The HTTP API is an `node:http` server that drives the React dashboard.

Coupling them in one package risks:

- Duplicated transport plumbing.
- The dashboard needing `node-fetch` patches for tool dispatch.
- Schema versioning getting tangled with HTTP API versioning.

## Decision

Maintain **`miro-custom-mcp/`** as a standalone pnpm package with its own
`package.json`, `tsconfig.json`, dependencies (only `@modelcontextprotocol/sdk`
+ `zod`), and `vitest` setup. The HTTP API only depends on `shared/contracts/`
and `shared/types/` (not on the MCP package).

A shared `MiroApiClientLike` interface lives in `miro-custom-mcp/src/miro-api.ts`
and is implemented by both:

- `MiroApiClient` — live.
- `FakeMiroApiClient` — in-process demo.

The HTTP API's provider (`server/providers/miroProvider.ts`) is a **separate**
abstraction scoped to workflow execution; it does not share types with the MCP
package.

## Consequences

- ✅ Two clean surfaces: MCP `tools` registry + HTTP REST endpoints.
- ✅ Independent version cadence (`miro-custom-mcp/src/index.ts` is at 1.1.0).
- ✅ Single shared transport: `MiroApiClient` implements `MiroApiClientLike`.
- ⚠️ Tool schemas must be kept discoverable on the dashboard via
  `docs/MCP-TOOLS.md`; documented.

## Alternatives considered

- **Coupled package with one entry point**: rejected — would force the dashboard
  to depend on `@modelcontextprotocol/sdk`.
- **Use the official Miro MCP server**: considered — but it lacks board CRUD,
  batch operations, and our rate-limit handling.
