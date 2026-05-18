# Miro Workflows

![Miro Workflows enterprise hero](assets/readme/hero.png)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=0B1026)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-production-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-API-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-sql.js-003B57?logo=sqlite&logoColor=white)](https://sql.js.org/)
[![MCP](https://img.shields.io/badge/MCP-enabled-8D52FF)](https://modelcontextprotocol.io/)
[![Miro](https://img.shields.io/badge/Miro-ready-FFD02F?logo=miro&logoColor=050038)](https://developers.miro.com/)

**Miro Workflows** is an enterprise-grade TypeScript application for converting visual collaboration into repeatable, auditable, and observable workflow operations. The repository now ships as a complete product surface with a React command center, Node.js API, SQLite-backed persistence, reusable workflow templates, operational audit trails, demo-first seed data, optional Miro REST synchronization, and a custom MCP server for direct board automation.

> **Executive positioning.** This is no longer a utility repository. It is a production-ready workflow operations platform that lets teams model board-based work, execute templates, preserve run history, and keep the Miro integration boundary clean enough for real deployment hardening.

![Miro Workflows capability badges](assets/readme/capability-badges.svg)

## Product experience

The operator experience is designed around a command-center model. Teams can inspect board health, choose a workflow template, execute a run, review generated artifacts, and trace every important event through the audit stream. The application starts in **demo mode** with no secrets, but its provider boundary is ready for token-backed Miro sync when `MIRO_PROVIDER_MODE=miro` and `MIRO_ACCESS_TOKEN` are configured.

![Miro Workflows dashboard preview](assets/readme/dashboard-preview.png)

| Experience layer | Enterprise outcome |
| --- | --- |
| **Workflow cockpit** | Operators can see boards, templates, recent runs, execution health, and integration state from one dashboard. |
| **Template execution** | Repeatable workflows standardize sprint planning, discovery, and incident review rituals. |
| **Board sync boundary** | Demo and live Miro providers are isolated behind one service contract, reducing integration risk. |
| **Audit trail** | Workflow runs, board sync attempts, generated artifacts, and warnings are recorded for accountability. |
| **MCP continuity** | The custom MCP package remains available for agent clients that need direct Miro board actions. |

## Motion: from board idea to auditable operation

The workflow model intentionally separates the **template**, **execution**, **persistence**, **sync**, and **audit** steps. That separation keeps the system understandable for operators, testable for engineers, and extensible for future OAuth, multi-tenant, and managed database deployments.

![Animated workflow trace](assets/readme/workflow-motion.gif)

## Architecture at a glance

The production architecture uses a layered model: the React client presents the operator experience, the Node.js API coordinates workflow actions, the SQLite repository records state, and the provider layer keeps external Miro behavior isolated from application logic. Miro documents MCP as a way for compatible clients to access real-time context and trigger Miro actions, while Miro REST applications rely on scoped authorization such as board read and write permissions.[1] [2]

![Miro Workflows production architecture](assets/readme/architecture.png)

| Layer | Responsibility | Key paths |
| --- | --- | --- |
| **React dashboard** | Presents workflow templates, board status, sync controls, execution history, audit events, and run detail. | [`src/App.tsx`](src/App.tsx), [`src/api.ts`](src/api.ts), [`src/styles.css`](src/styles.css) |
| **Node.js API** | Serves JSON endpoints, validates requests, executes templates, exposes health, and serves production web assets. | [`server/index.ts`](server/index.ts), [`server/services/workflowService.ts`](server/services/workflowService.ts) |
| **SQLite persistence** | Stores workspaces, credential metadata, boards, templates, runs, generated board items, and audit events. | [`server/db/schema.sql`](server/db/schema.sql), [`server/db/database.ts`](server/db/database.ts), [`server/db/seed.ts`](server/db/seed.ts) |
| **Provider boundary** | Switches between zero-secret demo behavior and token-backed Miro REST synchronization. | [`server/providers/miroProvider.ts`](server/providers/miroProvider.ts) |
| **Custom MCP server** | Preserves direct tool-style Miro board operations for MCP-compatible clients and agent workflows. | [`miro-custom-mcp`](miro-custom-mcp), [`miro-custom-mcp/src/index.ts`](miro-custom-mcp/src/index.ts) |

Miro's Node.js OAuth quickstart demonstrates a server-side authorization pattern using environment variables, backend routes, and redirect callbacks.[3] Miro's data persistence guide also explains why production integrations should replace default in-memory token storage with a custom persistence layer.[4] This repository reflects those guidance patterns by persisting connection metadata and workflow history while keeping token values out of source control.

## Enterprise navigation

| Destination | Link | Why it matters |
| --- | --- | --- |
| **Architecture guide** | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Describes the system model, API contract, schema, security posture, and deployment path. |
| **Setup guide** | [`docs/SETUP.md`](docs/SETUP.md) | Provides local development, environment, Miro provider, MCP, and validation instructions. |
| **Environment template** | [`.env.example`](.env.example) | Documents safe defaults and optional live Miro synchronization variables. |
| **Database schema** | [`server/db/schema.sql`](server/db/schema.sql) | Defines the persistent model for workspaces, credentials, boards, templates, runs, artifacts, and audit events. |
| **Seed data** | [`shared/seedData.ts`](shared/seedData.ts) | Powers demo mode with production-shaped boards, workflow templates, and sample activity. |
| **Custom MCP package** | [`miro-custom-mcp/README.md`](miro-custom-mcp/README.md) | Explains the Node.js MCP package for direct board automation. |

## API surface

The API is intentionally compact and production-oriented. It exposes health, summary, workspace, board, template, run, audit, and sync endpoints that the React dashboard consumes through a typed client.

![Miro Workflows API contract](assets/readme/api-contract.png)

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
| `GET` | `/api/runs/:id` | Returns run detail, generated items, template metadata, board metadata, and audit events. |
| `GET` | `/api/audit-events` | Lists recent operational audit events. |
| `POST` | `/api/sync/boards` | Syncs configured boards through the active provider. |

## Database schema

The schema is normalized around workflow operations and can evolve toward Postgres or another managed SQL database without changing the domain model. The local implementation uses `sql.js` so the repository can seed, validate, smoke test, and build without native SQLite compilation.

| Table | Purpose |
| --- | --- |
| `workspaces` | Represents a connected organization, team, or demo workspace. |
| `integration_credentials` | Stores credential metadata, scopes, expiry dates, and connection status without committing token secrets. |
| `boards` | Tracks Miro boards or demo board references used by templates and sync jobs. |
| `workflow_templates` | Stores reusable workflow definitions, step configuration, category, outcome, and default board mapping. |
| `workflow_runs` | Records each workflow execution, status, summary, metrics, and timestamps. |
| `board_items` | Records generated artifacts associated with a workflow run and target board. |
| `audit_events` | Stores operational events for run creation, sync activity, warnings, and validation history. |

## Quick start

The default path requires no Miro token. It installs dependencies, seeds a local SQLite file under `data/miro-workflows.sqlite`, validates the schema and seed data, runs an API smoke test, and starts the backend.

```bash
pnpm install
pnpm run seed
pnpm run validate
pnpm run smoke
pnpm run dev:api
```

Open a second terminal for the React dashboard.

```bash
pnpm run dev:web
```

The dashboard runs at [`http://localhost:5173`](http://localhost:5173), while the API runs at [`http://localhost:8787`](http://localhost:8787). For a production build, `pnpm run build:web` creates static assets in `dist/`, and the API can serve those assets from the same Node process.

## Environment configuration

Create a local `.env` file only when you need to override defaults or connect to a real Miro token. Never commit secret values.

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `8787` | Node API port. |
| `CORS_ORIGIN` | `*` | CORS origin for API responses. |
| `DATABASE_PATH` | `data/miro-workflows.sqlite` | SQLite file path used by the repository layer. |
| `MIRO_PROVIDER_MODE` | `demo` | Uses `demo` for seeded local workflows or `miro` for token-backed sync. |
| `MIRO_ACCESS_TOKEN` | empty | Optional Miro REST API token for live board sync. |
| `VITE_API_BASE_URL` | empty | Optional frontend API base URL for deployed environments. |

Miro recommends expiring authorization tokens for stronger REST API security, and the Node.js OAuth tutorial keeps client credentials and redirect settings in environment variables.[2] [3] This buildout supports a service-token style provider for live board sync today while preserving the schema and provider boundary needed for a future OAuth connection flow.

## Production scripts

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

The seed data includes production-shaped templates that represent common facilitation and delivery rituals. These examples are intentionally practical so teams can extend the template model rather than starting from a blank board.

| Template | Category | Operational outcome |
| --- | --- | --- |
| **Sprint Planning Accelerator** | Agile delivery | Converts planning steps into structured agenda, prioritization, risk review, and commitments. |
| **Product Discovery Canvas** | Product strategy | Produces discovery artifacts for users, jobs, evidence, experiments, and decisions. |
| **Incident Review Retro** | Operations | Creates a post-incident narrative, timeline, root-cause review, and prevention plan. |

## Production readiness posture

The repository is ready for serious engineering review and production-style development. Live deployments should still complete environment-specific hardening around hosting, managed storage, observability, rate limiting, secret management, and full OAuth for user-specific Miro authorization.

| Capability | Current status | Production note |
| --- | --- | --- |
| **TypeScript frontend and backend** | Complete | Strict root-level type checking is wired. |
| **Responsive dashboard** | Complete | React command center is styled for operator workflows and executive demos. |
| **Persistent local database** | Complete | Uses SQLite via `sql.js`; replace with managed SQL for multi-user production. |
| **Demo mode** | Complete | Works without secrets for review, demos, and CI smoke tests. |
| **Miro token-backed provider** | Ready | Set `MIRO_PROVIDER_MODE=miro` and `MIRO_ACCESS_TOKEN` for live sync. |
| **OAuth persistence model** | Prepared | Credential metadata exists; token encryption and refresh flow should be added before multi-user production. |
| **Auditability** | Complete | Workflow execution and sync events are recorded in `audit_events`. |
| **MCP continuity** | Complete | Existing custom MCP server remains in the repository and builds independently. |

## Repository structure

```text
miro-workflows/
├── assets/readme/             # Enterprise README graphics and motion assets
├── docs/
│   ├── ARCHITECTURE.md        # System architecture, API contract, schema, security, deployment notes
│   └── SETUP.md               # Local setup, environment, validation, and MCP guidance
├── miro-custom-mcp/           # Node.js custom MCP server for Miro board automation
├── server/                    # Node.js API, database layer, provider boundary, workflow service
├── shared/                    # Shared TypeScript domain types and seed data
├── src/                       # React dashboard, API client, and production styling
├── scripts/                   # Validation, smoke test, token helper, asset generation
├── index.html                 # Vite entry point
├── vite.config.ts             # Web development and production build configuration
└── package.json               # Root scripts for app, API, validation, and MCP package
```

## Links and references

| Resource | Purpose |
| --- | --- |
| [Miro Developer Platform](https://developers.miro.com/) | Official developer documentation for Miro REST APIs, OAuth, app setup, and integration patterns. |
| [Miro MCP documentation](https://developers.miro.com/docs/miro-mcp) | Official documentation for Miro MCP capabilities and supported client workflows. |
| [Miro REST quickstart](https://developers.miro.com/docs/rest-api-build-your-first-hello-world-app) | Official REST API quickstart covering scopes and basic board operations. |
| [Miro Node.js OAuth quickstart](https://developers.miro.com/docs/miro-nodejs-quickstart-with-oauth-and-express) | Official Node.js OAuth and Express flow reference. |
| [Miro data persistence guide](https://developers.miro.com/docs/miro-nodejs-implement-storage-for-data-persistence) | Official guidance on replacing in-memory token storage with persistent storage. |
| [Model Context Protocol](https://modelcontextprotocol.io/) | Protocol background for MCP-compatible tools and agent clients. |

## References

[1]: https://developers.miro.com/docs/miro-mcp "Miro MCP documentation"
[2]: https://developers.miro.com/docs/rest-api-build-your-first-hello-world-app "Miro REST API quickstart"
[3]: https://developers.miro.com/docs/miro-nodejs-quickstart-with-oauth-and-express "Miro Node.js quickstart with OAuth and Express"
[4]: https://developers.miro.com/docs/miro-nodejs-implement-storage-for-data-persistence "Miro Node.js data persistence guide"
