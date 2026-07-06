# Miro Workflows Architecture

**Author:** Manus AI  
**Repository:** `Alexi5000/miro-workflows`  
**Status:** Production buildout blueprint

## Executive Summary

Miro Workflows is being expanded from a TypeScript MCP utility into a production-ready workflow operations application for teams that transform visual collaboration into reusable execution systems. The repository will preserve the existing custom Miro MCP server while adding a database-backed API, a polished React dashboard, seedable workflow templates, operational audit trails, and provider abstractions that support both demo mode and real Miro automation.

The design is intentionally TypeScript-first. The frontend, backend, shared contracts, and MCP package use the same language, which keeps schema definitions, validation rules, and workflow models consistent across the repository. The runtime has been standardized on Node.js and pnpm for portability, while the directory layout is structured so the backend can later be adapted to Docker, Postgres, Redis, or managed deployment platforms without changing the domain model.

## External Platform Findings

Miro's hosted MCP server is positioned around two primary use cases: generating diagrams from product requirements, code, GitHub URLs, and text descriptions, and generating code from Miro board content such as PRDs, diagrams, and images.[1] Miro's REST quickstart documents a service-account style path for board automation and recommends expiring authorization tokens for stronger security, with access tokens expiring after one hour and refresh tokens after sixty days.[2] Miro's Node.js OAuth quickstart demonstrates an Express-based OAuth flow with `MIRO_CLIENT_ID`, `MIRO_CLIENT_SECRET`, and `MIRO_REDIRECT_URL` environment variables, and explicitly cautions that production deployments should use real user identifiers rather than volatile session identifiers.[3] Miro's data persistence guide states that the default Node client storage is in-memory and recommends a custom database-backed storage implementation for production deployments.[4]

| Platform concern | Production implication for this repository |
|---|---|
| MCP support | Keep the existing custom MCP server as an integration adapter rather than the whole product. |
| REST API tokens | Add backend configuration for demo mode, service-account tokens, and future OAuth-connected workspaces. |
| OAuth storage | Model connected workspaces and credentials metadata in a database without committing secrets. |
| Rate limits and auditability | Persist workflow runs, board operations, and audit events so teams can review automation behavior. |
| Enterprise enablement | Document that hosted Miro MCP may require organization-level enablement on Enterprise plans. |

## Application Layers

The production buildout uses a compact full-stack monorepo that is easy to run locally and clear enough for contributors to extend. The root package orchestrates validation, development, seed, and build scripts. The `server` directory owns API routes, persistence, seed data, provider services, and runtime configuration. The `src` directory owns the React application and API client. The `shared` directory owns cross-layer contracts, seed constants, and TypeScript types. The `miro-custom-mcp` directory remains the MCP package and continues to expose precise board item tools.

| Layer | Directory | Responsibility |
|---|---|---|
| Frontend | `src/` | React dashboard, workflow catalog, board run review, connection status, and operational analytics. |
| Backend API | `server/` | HTTP API (raw `node:http` + zod), workflow execution, database access, provider abstraction, and audit logging. |
| Shared model | `shared/` | Workflow, board, run, audit, and API response contracts used by both frontend and backend. |
| Typed contracts | `shared/contracts/` | Versioned zod + JSON-Schema source of truth (sprint, audit-event, run-result). |
| Database | `server/db/` | `sql.js` SQLite, schema, seed data, and repository-backed persistence helpers. |
| Miro MCP | `miro-custom-mcp/` | 20 custom MCP tools (boards + items + composite) over stdio. Live and demo modes. |
| Containerization | `Dockerfile.web`, `Dockerfile.api`, `Dockerfile.mcp`, `docker-compose.yml` | Multi-stage builds + a single `docker compose up` for the full stack. |
| Documentation | `docs/` | Architecture, setup, contracts, testing, skills, MCP tool catalog, ADRs. |
| ADRs | `docs/adr/` | One Nygard-template ADR per load-bearing architectural choice. |

## Data Model

The database is SQLite for local development and repository portability. The schema is designed around normalized tables that map directly to production concepts and can be migrated to Postgres later. JSON columns are stored as text with consistent serialization helpers. Secrets are represented only by metadata in source-controlled schema and sample data.

| Table | Purpose | Important fields |
|---|---|---|
| `workspaces` | Logical team or organization connection boundary. | `id`, `name`, `slug`, `provider`, `mode`, `status`, `created_at`, `updated_at`. |
| `integration_credentials` | Credential metadata and connection state, not plaintext secrets. | `id`, `workspace_id`, `provider`, `credential_label`, `scopes_json`, `expires_at`, `status`. |
| `boards` | Known Miro or demo boards used by workflow runs. | `id`, `workspace_id`, `provider_board_id`, `name`, `view_link`, `status`, `last_synced_at`. |
| `workflow_templates` | Reusable workflow blueprints. | `id`, `slug`, `name`, `category`, `description`, `default_board_id`, `steps_json`, `status`. |
| `workflow_runs` | Executions of workflow templates against boards. | `id`, `template_id`, `board_id`, `status`, `triggered_by`, `summary`, `metrics_json`, `started_at`, `finished_at`. |
| `board_items` | Items created, synced, or read during workflow runs. | `id`, `run_id`, `board_id`, `provider_item_id`, `item_type`, `title`, `payload_json`. |
| `audit_events` | Immutable operational history for users and automation. | `id`, `workspace_id`, `run_id`, `event_type`, `severity`, `message`, `metadata_json`, `created_at`. |

## API Contract

The API is intentionally pragmatic and easy to consume from a static React dashboard. All endpoints return JSON with stable shapes. Mutation endpoints validate required fields, write audit events, and return the resulting resource rather than only a status code.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Returns service status, runtime mode, database status, and timestamp. |
| `GET` | `/api/summary` | Returns dashboard statistics, recent runs, active boards, and integration state. |
| `GET` | `/api/workspaces` | Lists configured workspaces and connection statuses. |
| `GET` | `/api/boards` | Lists boards with workflow and sync metadata. |
| `GET` | `/api/templates` | Lists reusable workflow templates. |
| `GET` | `/api/templates/:slug` | Returns one workflow template with step definitions. |
| `POST` | `/api/runs` | Starts a workflow run in demo or Miro mode for a template and board. |
| `GET` | `/api/runs` | Lists workflow runs with template, board, and metrics summaries. |
| `GET` | `/api/runs/:id` | Returns a run with related board items and audit events. |
| `GET` | `/api/audit-events` | Lists recent audit events for operations review. |
| `POST` | `/api/sync/boards` | Performs a configured board sync and records an audit event. |

## Provider Strategy

The provider layer exposes a common interface for board workflows. `DemoMiroProvider` creates deterministic local artifacts without requiring credentials. `MiroRestProvider` is prepared to call the Miro REST API when `MIRO_ACCESS_TOKEN` is present. This protects local development and CI from failing due to missing secrets while preserving a real integration path for production teams.

> **Security principle:** the repository can demonstrate schema and credential lifecycle metadata, but it must never commit real access tokens, refresh tokens, client secrets, OAuth codes, or personal board data.

## References

[1]: https://developers.miro.com/docs/miro-mcp "Miro's MCP Server"  
[2]: https://developers.miro.com/docs/rest-api-build-your-first-hello-world-app "Miro REST API Quickstart"  
[3]: https://developers.miro.com/docs/miro-nodejs-quickstart-with-oauth-and-express "Miro Node.js client quickstart with OAuth and Express"  
[4]: https://developers.miro.com/docs/miro-nodejs-implement-storage-for-data-persistence "Miro Node.js Implement Data Storage"
