# ADR-0002: Raw `node:http` server + zod for input validation

- Status: Accepted
- Date: 2026-07-05

## Context

The HTTP API needs to be inspectable, fast, and have zero production
dependencies (apart from runtime libs the user opted in to). Express and Fastify
are excellent but also large and implicit; in an FDE-grade repo we prefer the
smallest reasonable surface area.

## Decision

The HTTP API uses Node's built-in `node:http` directly:

- `server/bootstrap.ts` exposes `startServer({ port, corsOrigin })`.
- Routing is a small `if (path === ...)` ladder — no router.
- Bodies are collected with a 2-line `readBody()` helper.
- Every request body is parsed with a **zod schema** before service calls.
  Invalid input returns `400` with a structured error message via
  `ResponseError` (defined in `server/services/workflowService.ts`).
- CORS is a single static header; the allow-origin is config-driven.

## Consequences

- ✅ One file (~150 LoC) is the entire HTTP surface; easy to audit.
- ✅ Zero framework version drift concerns.
- ✅ Tests can `startServer({ port: 0 })` and bind an ephemeral port.
- ⚠️ No automatic OpenAPI generation — we publish the contract table in
  `README.md` and the typed contracts in `shared/contracts/`.
- ⚠️ Adding request validation elsewhere in the future means remembering the
  pattern; covered by `tests/api.test.ts` which asserts `400` on invalid bodies.

## Alternatives considered

- **Express**: rejected — adds ~12 MB to production image and a learning
  surface bigger than our handler.
- **Fastify**: rejected — same reasoning; future schema-decorator coupling.
- **Hono**: considered but not yet mature enough on Node 20 to bet on.
