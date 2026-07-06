# AGENTS.md — Miro Workflows Procedural Memory

> This file is the **first** instruction a coding agent reads when working in
> this repository. Keep it short, opinionated, and dated. Update it in the same
> PR that changes the underlying convention.

## Project one-liner

**Miro Workflows** is a production-grade TypeScript command center for Miro
boards: a React dashboard, a Node HTTP API, a SQLite layer, and a custom MCP
server. **Demo-first by default**, live Miro activates only when
`MIRO_ACCESS_TOKEN` is present.

## Layout map

| Path | Role |
| --- | --- |
| `src/` | React + Vite dashboard (UI only, no business logic). |
| `server/` | Node HTTP API (raw `node:http` + zod). |
| `shared/` | Type definitions and zod contracts (`shared/contracts/`). |
| `miro-custom-mcp/` | Standalone MCP server (transport: stdio). |
| `scripts/` | Dev/ops scripts (validate, smoke, build, contract check). |
| `tests/` | Vitest unit + integration tests. |
| `.agents/skills/` | Authoring-time skills for coding agents. |
| `src/agents/` | Three-agent harness (Planner / Generator / Evaluator) + grader + plateau. |
| `notebooks/` | Human-authored decision logs (not imported at runtime). |
| `docs/adr/` | Architecture Decision Records (one per load-bearing choice). |
| `docs/BENCHMARK.md` | Honest, reproducible benchmark + helper `scripts/bench.ts`. |

## Commands (canonical)

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install all workspaces. |
| `pnpm run seed` | Seed the local SQLite database. |
| `pnpm run dev:api` | API dev server on `:8787`. |
| `pnpm run dev:web` | Web dashboard on `:5173` (proxies `/api` → API). |
| `pnpm run typecheck` | Strict TS check, 0 errors required. |
| `pnpm run test` | Vitest unit + integration suite (server + contracts + agents). |
| `pnpm run test:ui` | React render tests in jsdom (App routes). |
| `pnpm run test:all` | Both configs sequentially. |
| `pnpm run coverage` | Vitest with `@vitest/coverage-v8`. |
| `pnpm run contracts:check` | Assert sprint / audit / run contracts are monotonic. |
| `pnpm run contracts:build` | Emit JSON-Schema artifacts. |
| `pnpm run bench` | Reproducible HTTP + harness benchmark; see `docs/BENCHMARK.md`. |
| `pnpm run agent:run -- "task"` | Run the three-agent harness end-to-end (offline stub). |
| `pnpm run validate` | File + seed sanity check. |
| `pnpm run smoke` | End-to-end workflow + sync in demo mode. |
| `pnpm run ci` | typecheck + contracts:check + test + test:ui + smoke + validate. |
| `pnpm run build` | Build web + API + MCP packages. |
| `pnpm run mcp:dev` | Run the MCP server in dev. |
| `pnpm run mcp:test` | Run the MCP package vitest suite. |
| `pnpm run docker:up` | Bring up `docker-compose.yml` (web + api + mcp). |
| `pnpm run docker:down` | Tear down the compose stack. |

> **Do not** use bun. pnpm is canonical. `bun.lock` / `bunfig.toml` are
> vestigial and ignored.

## Conventions

- **TypeScript strict ESM.** `tsconfig.json` and `tsconfig.server.json` both
  enforce `strict: true`. The MCP package has its own `tsconfig.json`.
- **No `any` in `shared/`.** Use zod schemas + inferred types.
- **IDs**: server emits `run-<uuid>`, `item-<uuid>`, `audit-<uuid>`; MCP uses
  Miro-supplied IDs unchanged.
- **HTTP errors**: route handlers must throw `ResponseError(status, message)`
  (defined in `server/services/workflowService.ts`). Never raw `Error`.
- **Audit events**: every state-changing operation must call
  `repository.createAuditEvent`. No silent writes.
- **Demo mode is the default.** CI runs in demo mode. Set `MIRO_ACCESS_TOKEN`
  only when explicitly exercising the live provider. Use `MIRO_PROVIDER_MODE`
  to force `"demo"` even when a token is set.
- **MCP errors**: return `{ isError: true, content: [{type:"text", text: …}] }`.
  Never throw raw `Error` from a tool handler.
- **429 handling**: MCP client retries with exponential backoff + jitter
  respecting `Retry-After`; max 4 attempts. Do not silence 429s.
- **JSON in DB**: columns ending in `_json` are `JSON.stringify`-ed on write,
  `JSON.parse`-d on read.

## Do / Don't

- ✅ Do write tests with Vitest next to the code they cover.
- ✅ Do bump a contract version when changing its shape (see `docs/CONTRACTS.md`).
- ✅ Do add a new ADR for every load-bearing architectural choice.
- ✅ Do use the demo `FakeMiroApiClient` when developing without a Miro token.
- ❌ Don't hardcode Miro board IDs or tokens in source.
- ❌ Don't bypass `ResponseError` with raw `throw new Error(...)` in routes.
- ❌ Don't store secrets in source — use `.env` (never committed) or secret
  managers.
- ❌ Don't swallow HTTP errors with `try { … } catch {}`.
- ❌ Don't add runtime dependencies without an ADR.

## Skills (read when relevant)

- `.agents/skills/miro-board-design/SKILL.md` — board composition patterns.
- `.agents/skills/mcp-tool-authoring/SKILL.md` — add a new MCP tool.
- `.agents/skills/fde-pillar-review/SKILL.md` — the 12-pillar audit.

## Pointers (canonical docs)

- `docs/ARCHITECTURE.md` — system model.
- `docs/SETUP.md` — local + Docker setup.
- `docs/CONTRACTS.md` — version policy for typed contracts.
- `docs/TESTING.md` — coverage policy + how to add tests.
- `docs/SKILLS.md` — how to author `.agents/skills/*.md`.
- `docs/MCP-TOOLS.md` — full MCP tool catalog.
- `docs/BENCHMARK.md` — reproducible benchmark + what we did NOT measure.
- `notebooks/` — human-authored decision logs.
- `docs/adr/` — Architecture Decision Records.

## Troubleshooting

- **API exits with "Missing URL"**: older `node:http` quirk; update Node to 20+.
- **`sqlite://` not respected**: only `DATABASE_URL` is honored; legacy
  `DATABASE_PATH` was renamed. See ADR-0003.
- **Tests hang**: ensure no live `MIRO_ACCESS_TOKEN` is exported in the test
  environment — `tests/setup.ts` clears it.
- **Bench hangs at "seed done"**: ensure the ephemeral port pick succeeded.
  `startServer({ port: 0 })` resolves on `listening`; if you re-wrap it with
  `once("listening")` and the event already fired, the promise never settles.

_Last revised: 2026-07-05 — Foundation PR #2 (added pillars 4, 5, 6, 7, 10)._
