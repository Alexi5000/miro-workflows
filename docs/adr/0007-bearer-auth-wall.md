# ADR-0007: Bearer-token auth wall on write endpoints

- Status: Accepted
- Date: 2026-07-06

## Context

The API originally exposed every endpoint anonymously. Even in demo mode
this leaks the workflow execution surface (`POST /api/runs` runs a Miro
template end-to-end), and any production deploy would be trivially
abusable. We need a scope-based auth wall BEFORE the first production
launch, ideally with the smallest dep footprint.

## Decision

- Every write endpoint (`POST`, `DELETE`) goes through `requireScope(scope)`
  which validates the `Authorization: Bearer <token>` header.
- Tokens are workspace-scoped, scope-bounded (`dashboard:read`,
  `dashboard:write`, `workspaces:read`, `workspaces:write`,
  `credentials:read`, `credentials:write`, `runs:read`, `runs:write`,
  `audit:read`, `webhooks:write`).
- Tokens are stored as HMAC-SHA256 digests + a 8-char plaintext prefix for
  lookup. Plaintext is shown once at issuance and never returned again.
- `MIRO_WORKFLOWS_TOKEN_SECRET` (env var, 32+ bytes in prod) signs the
  digests. A dev fallback is used in test/development and a loud warning
  is emitted at boot.
- `POST /api/auth/tokens` issues tokens; `DELETE /api/auth/tokens/:id`
  revokes. Both are auth-gated themselves (bootstrapping happens via env
  or out-of-band in real deploys).
- `requireScope()` is implemented in `server/services/authService.ts` and
  wired into `server/bootstrap.ts`. A `RequestContext` carries the
  verified auth per request so the structured access log can stamp the
  workspace.

## Consequences

- ✅ CI tests assert that write endpoints return 401/403 without a
  bearer (`tests/api.test.ts`, `tests/e2e/stack.test.tsx`).
- ✅ OpenAPI 3.1 spec enumerates the `bearerAuth` security scheme and
  marks every write endpoint as `security: [{ bearerAuth: [...] }]`
  (`scripts/generate_openapi.ts`).
- ⚠️ `DELETE /api/credentials/:id` is audit-only; it does not actually
  delete the row. Real deletion lands in v1.1 alongside the Postgres
  pivot.
- ⚠️ No token rotation yet. v1.1 adds refresh tokens + a `/auth/refresh`
  endpoint.

## Alternatives considered

- **HTTP Basic auth**: rejected — credentials sent on every request, no
  per-scope isolation, no rotation.
- **OAuth bearer at the edge (Kong/Envoy)**: rejected for foundation —
  the in-process `requireScope()` is enough for the demo and gets us out
  of the gate quickly. The auth wall is a middleware-style function so
  swapping to edge enforcement later is a single line.
- **JWT**: rejected — adds a parsing surface area we don't need. Our
  scope list is small; opaque random tokens work.
