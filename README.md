# Miro Workflows

**Miro Workflows** is a production-ready TypeScript application for turning visual collaboration boards into repeatable, observable workflow operations. The repository now includes a polished React dashboard, a Node.js API, a persistent SQLite database layer powered by `sql.js`, reusable workflow templates, audit trails, seed data, validation scripts, and the existing custom MCP server for direct Miro board automation.

The project is designed to run immediately in **demo mode** without secrets, while remaining ready for a real Miro integration through environment variables and provider adapters. Miro positions MCP as a way for compatible clients to query data, trigger actions, and access real-time context in Miro boards, and its REST API applications rely on scoped permissions such as `board:read` and `board:write`.[1] [2]

> **Production intent.** This repository is no longer a TypeScript utility folder. It is a full-stack workflow operations product with a dashboard, backend services, database schemas, provider boundaries, seeded examples, and documentation suitable for real teams.

## What changed in this buildout

| Area | Production buildout |
| --- | --- |
| Frontend | Added a responsive React command center with workflow catalog, board sync controls, recent runs, audit events, and run detail inspection. |
| Backend | Added a Node.js API with health, summary, workspace, board, template, run, audit, and sync endpoints. |
| Database | Added SQLite schema files, seed data, migrations, and a file-persisted `sql.js` repository layer that works without native build steps. |
| Provider layer | Added a demo provider for zero-secret local development and a Miro REST provider boundary for token-backed board sync. |
| MCP | Preserved the custom Miro MCP package and wired root-level scripts for MCP development and builds. |
| Quality | Added seed, validation, smoke test, typecheck, and build scripts for release readiness. |
| Documentation | Rewrote the README and added architecture documentation covering API contracts, data model, security, and deployment posture. |

## Product architecture

The application separates visual collaboration workflows into a clear four-layer architecture. The React client is the operator-facing cockpit, the API coordinates workflow execution and sync behavior, the database records state and auditability, and the provider layer keeps Miro-specific behavior isolated from the core application.

| Layer | Responsibility | Key files |
| --- | --- | --- |
| React dashboard | Presents workflow templates, board status, execution history, audit events, and operational details. | `src/App.tsx`, `src/api.ts`, `src/styles.css` |
| Node API | Serves JSON endpoints, validates requests, runs workflow templates, and exposes production health signals. | `server/index.ts`, `server/services/workflowService.ts` |
| SQLite persistence | Stores workspaces, credentials metadata, boards, templates, runs, artifacts, and audit events. | `server/db/schema.sql`, `server/db/database.ts`, `server/db/seed.ts` |
| Integration providers | Provides demo mode and token-backed Miro REST sync behind a stable interface. | `server/providers/miroProvider.ts` |
| MCP server | Maintains direct tool-style Miro board operations for agent clients. | `miro-custom-mcp/src/index.ts`, `miro-custom-mcp/src/miro-api.ts` |

Miro's Node.js OAuth quickstart demonstrates a backend authorization flow based on environment variables, server-side routes, and authorization callbacks.[3] Miro's data persistence guidance also explains that production integrations should avoid default in-memory token storage and use a custom persistence layer for authorization state.[4] This repository reflects those patterns by storing connection metadata and workflow history in the database while keeping token values in the environment.

## Repository structure

```text
miro-workflows/
├── docs/
│   └── ARCHITECTURE.md
├── miro-custom-mcp/
│   ├── src/index.ts
│   └── src/miro-api.ts
├── server/
│   ├── config.ts
│   ├── db/
│   │   ├── database.ts
│   │   ├── schema.sql
│   │   └── seed.ts
│   ├── providers/miroProvider.ts
│   └── services/workflowService.ts
├── shared/types.ts
├── src/
│   ├── App.tsx
│   ├── api.ts
│   ├── main.tsx
│   └── styles.css
├── scripts/
│   ├── smoke_api.ts
│   └── validate_setup.ts
├── index.html
├── vite.config.ts
└── package.json
```

## Database schema

The database schema is intentionally normalized around production workflow operations. It supports demo usage today and can be migrated to Postgres or another managed SQL database later without changing the product model.

| Table | Purpose |
| --- | --- |
| `workspaces` | Represents a connected organization, team, or demo workspace. |
| `integration_credentials` | Stores credential metadata, scopes, expiry dates, and connection status without committing token secrets. |
| `boards` | Tracks Miro boards or demo board references used by templates and sync jobs. |
| `workflow_templates` | Stores reusable workflow definitions, step configuration, category, outcome, and default board mapping. |
| `workflow_runs` | Records each workflow execution, status, summary, metrics, and timestamps. |
| `board_items` | Records generated artifacts associated with a workflow run and target board. |
| `audit_events` | Stores operational events for run creation, sync activity, warnings, and validation history. |

## API surface

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Returns runtime health, provider mode, database path, and timestamp. |
| `GET` | `/api/summary` | Returns dashboard totals, integration status, boards, templates, and recent runs. |
| `GET` | `/api/workspaces` | Lists workspaces and credential metadata. |
| `GET` | `/api/boards` | Lists tracked boards. |
| `GET` | `/api/templates` | Lists workflow templates. |
| `GET` | `/api/templates/:slug` | Returns one workflow template by slug. |
| `GET` | `/api/runs` | Lists recent workflow runs. |
| `POST` | `/api/runs` | Executes a workflow template against a board. |
| `GET` | `/api/runs/:id` | Returns run detail, generated items, template, board, and audit events. |
| `GET` | `/api/audit-events` | Lists recent audit events. |
| `POST` | `/api/sync/boards` | Syncs configured boards through the active provider. |

## Quick start

Install dependencies, seed the database, validate the application, and start the API. The default mode requires no Miro token and writes a local SQLite database under `data/miro-workflows.sqlite`.

```bash
pnpm install
pnpm run seed
pnpm run validate
pnpm run smoke
pnpm run dev:api
```

Open a second terminal for the Vite development server.

```bash
pnpm run dev:web
```

The dashboard runs at `http://localhost:5173`, while the API runs at `http://localhost:8787`. In production, `pnpm run build:web` creates static assets in `dist/`, and the API can serve those assets from the same Node process.

## Environment configuration

Create a local `.env` file only when you need to override defaults or connect a real Miro token. Do not commit secret values.

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `8787` | Node API port. |
| `CORS_ORIGIN` | `*` | CORS origin for API responses. |
| `DATABASE_PATH` | `data/miro-workflows.sqlite` | SQLite file path used by the repository layer. |
| `MIRO_PROVIDER_MODE` | `demo` | Use `demo` for seeded local workflows or `miro` for token-backed sync. |
| `MIRO_ACCESS_TOKEN` | empty | Optional Miro REST API token for live board sync. |
| `VITE_API_BASE_URL` | empty | Optional frontend API base URL for deployed environments. |

Miro recommends expiring authorization tokens for stronger security in REST API applications, and the OAuth tutorial uses environment variables for client credentials and redirect URLs.[2] [3] The current buildout supports a service-token style integration for board sync while preserving the schema and provider boundary needed for a future OAuth connection flow.

## Available scripts

| Command | Purpose |
| --- | --- |
| `pnpm run dev:api` | Starts the Node API with TypeScript watch mode. |
| `pnpm run dev:web` | Starts the Vite React dashboard. |
| `pnpm run seed` | Applies the schema and seeds demo workspace, boards, templates, and audit state. |
| `pnpm run validate` | Verifies that schema, seed data, and summary state are healthy. |
| `pnpm run smoke` | Runs a full workflow execution and board sync smoke test. |
| `pnpm run typecheck` | Runs strict TypeScript checks across frontend, backend, shared code, and scripts. |
| `pnpm run build:web` | Builds the React dashboard for production. |
| `pnpm run build:api` | Compiles the backend TypeScript project. |
| `pnpm run build` | Runs frontend, backend, and MCP builds. |
| `pnpm run mcp:dev` | Starts the custom MCP package in development mode. |
| `pnpm run mcp:build` | Builds the custom MCP package. |

## Workflow templates included

| Template | Category | Operational outcome |
| --- | --- | --- |
| Sprint Planning Accelerator | Agile delivery | Converts planning steps into structured agenda, prioritization, risk review, and commitments. |
| Product Discovery Canvas | Product strategy | Produces discovery artifacts for users, jobs, evidence, experiments, and decisions. |
| Incident Review Retro | Operations | Creates a post-incident narrative, timeline, root-cause review, and prevention plan. |

## Production readiness checklist

The repository is set up for production-style development, but live deployments should still complete environment-specific hardening. In particular, teams should add managed hosting, an external SQL database, rate limiting, centralized logging, a secret manager, and a full OAuth flow if user-specific Miro authorization is required.

| Capability | Current status | Production note |
| --- | --- | --- |
| TypeScript frontend and backend | Complete | Strict typecheck is wired at the root. |
| Persistent local database | Complete | Uses SQLite via `sql.js`; replace with managed SQL for multi-user production. |
| Demo mode | Complete | Works without secrets for review, demos, and CI smoke tests. |
| Miro token-backed provider | Ready | Set `MIRO_PROVIDER_MODE=miro` and `MIRO_ACCESS_TOKEN` for live sync. |
| OAuth persistence model | Prepared | Credential metadata exists; token encryption and refresh flow should be added before multi-user production. |
| Auditability | Complete | Workflow execution and sync events are recorded in `audit_events`. |
| MCP continuity | Complete | Existing custom MCP server remains in the repository and builds independently. |

## References

[1]: https://developers.miro.com/docs/miro-mcp "Miro MCP documentation"
[2]: https://developers.miro.com/docs/rest-api-build-your-first-hello-world-app "Miro REST API quickstart"
[3]: https://developers.miro.com/docs/miro-nodejs-quickstart-with-oauth-and-express "Miro Node.js quickstart with OAuth and Express"
[4]: https://developers.miro.com/docs/miro-nodejs-implement-storage-for-data-persistence "Miro Node.js data persistence guide"
