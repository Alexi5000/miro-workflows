# Miro Workflows Setup Guide

This guide explains how to run **Miro Workflows** as a full-stack TypeScript application. The default path uses demo mode, which means you can validate the dashboard, API, database schema, workflow templates, and audit trail without a Miro token.

## Prerequisites

| Requirement | Recommended version | Purpose |
| --- | --- | --- |
| Node.js | 22 or later | Runs the API, scripts, Vite, and MCP package. |
| pnpm | 10 or later | Installs dependencies and runs workspace scripts. |
| Git | Current stable | Clones and contributes to the repository. |
| Miro account | Optional for demo mode | Required only when using live Miro REST sync. |

## Local installation

Clone the repository and install dependencies.

```bash
git clone https://github.com/Alexi5000/miro-workflows.git
cd miro-workflows
pnpm install
```

Seed and validate the local database.

```bash
pnpm run seed
pnpm run validate
pnpm run smoke
```

Start the API server.

```bash
pnpm run dev:api
```

Start the React dashboard in a second terminal.

```bash
pnpm run dev:web
```

The dashboard is available at `http://localhost:5173`, and the API is available at `http://localhost:8787`.

## Environment variables

The application works without an `.env` file in demo mode. Add one only when you need to override defaults or connect live Miro sync.

```bash
cp .env.example .env
```

| Variable | Example | Description |
| --- | --- | --- |
| `PORT` | `8787` | API server port. |
| `CORS_ORIGIN` | `http://localhost:5173` | Browser origin allowed to call the API. |
| `DATABASE_PATH` | `data/miro-workflows.sqlite` | SQLite file path. |
| `MIRO_PROVIDER_MODE` | `demo` or `miro` | Selects demo provider or Miro REST provider. |
| `MIRO_ACCESS_TOKEN` | `access-token-value` | Optional token used only when `MIRO_PROVIDER_MODE=miro`. |
| `VITE_API_BASE_URL` | `https://example.com` | Optional deployed API origin for the React client. |

## Live Miro sync

Set the provider mode and token before starting the API.

```bash
MIRO_PROVIDER_MODE=miro MIRO_ACCESS_TOKEN=your-token pnpm run dev:api
```

The current provider uses the token for board sync. Workflow execution remains safe to run in demo style until team-specific write operations are expanded and approved.

## Production build

Run all production checks and builds.

```bash
pnpm run typecheck
pnpm run build:web
pnpm run build:api
pnpm run mcp:build
pnpm run validate
pnpm run smoke
```

For a single command, use the root build script (which chains the above plus `mcp:build`):

```bash
pnpm run build
```

## Tests

| Command | Purpose |
| --- | --- |
| `pnpm test` | Vitest suite for server, contracts, scripts. |
| `pnpm run coverage` | With `@vitest/coverage-v8`, fails if below the 80% threshold. |
| `pnpm run mcp:test` | Vitest suite for the MCP package. |
| `pnpm run ci` | typecheck + contracts:check + test + smoke + validate. |

See [`docs/TESTING.md`](TESTING.md) for the full coverage policy.

## Docker

Bring up the full stack (web + api + mcp + a `miro-data` named volume).

```bash
docker compose up --build
```

This will:

- Run the React/Vite dashboard on `http://localhost:5173`, proxying `/api` to the api service.
- Run the HTTP API on `http://localhost:8787` with a SQLite database mounted in a named volume.
- Boot the MCP server in stdio mode (attach via `docker compose attach miro-mcp` or wire a host MCP client to it).
- Default to demo mode; pass `MIRO_PROVIDER_MODE=miro` and `MIRO_ACCESS_TOKEN=...` in `.env` to switch to live Miro.

Tear it down:

```bash
docker compose down -v
```

## Custom MCP package

The MCP package is retained under `miro-custom-mcp/`. Install its package dependencies when working on MCP tools directly.

```bash
cd miro-custom-mcp
pnpm install
pnpm run dev
```

The MCP server reads `MIRO_ACCESS_TOKEN` from the environment and communicates over stdio for MCP-compatible clients. With no token, it runs in **demo mode** against `FakeMiroApiClient`, so agents can iterate without Miro.
