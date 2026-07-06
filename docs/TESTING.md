# Testing

Miro Workflows uses **Vitest** as its single test runner across both packages.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm test` | Run root suite (server, contracts, scripts, integration). |
| `pnpm run coverage` | Vitest coverage with `@vitest/coverage-v8`. |
| `pnpm run mcp:test` | Run the MCP package suite. |
| `pnpm run ci` | `typecheck && contracts:check && test && smoke && validate`. |

## Coverage thresholds

Configured in `vitest.config.ts`:

| Metric | Threshold |
| --- | --- |
| Statements | **80%** |
| Lines | **80%** |
| Functions | **80%** |
| Branches | **65%** |

Below any threshold → CI fails (vitest exits 1).

## What we cover

- `server/services/workflowService.test.ts` — happy path, 400 contract, 404 unknown template, sync audit events.
- `server/providers/miroProvider.test.ts` — demo provider counts/IDs/sync, live provider error & success mapping.
- `tests/api.test.ts` — boots the server on an ephemeral port and exercises every documented endpoint.
- `shared/contracts/contract.test.ts` — schema version, parse, unknown-version rejection.
- `shared/contracts/json-schema.test.ts` — emitter output shape.
- `scripts/check_contract_versions.test.ts`, `scripts/build_contracts.test.ts` — registry + artifact integrity.
- `miro-custom-mcp/tests/fake-miro-api.test.ts` — demo client surface.
- `miro-custom-mcp/tests/miro-api.test.ts` — auth/429/500 mapping.
- `miro-custom-mcp/tests/tools.contract.test.ts` — every registered tool parses an example and produces a serializable result; one end-to-end happy path.

## How tests stay hermetic

- `tests/setup.ts` (root) and `miro-custom-mcp/tests/setup.ts` clear `MIRO_*`
  env vars and point `DATABASE_URL` at an isolated `/tmp` SQLite file.
- A SQLite file is **per-process**: tests never share state.
- No MCP test issues a real fetch — every client is mocked or `FakeMiroApiClient`.

## Adding a test

1. Co-locate as `*.test.ts` next to or near the unit under test.
2. Update Vitest's `include` glob if it lives in a new directory.
3. Prefer `safeParse` + typed `expect` over `any`.
4. Keep tests deterministic — never rely on `Date.now()` for assertions.
