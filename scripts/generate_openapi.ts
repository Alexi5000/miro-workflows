#!/usr/bin/env tsx
/**
 * scripts/generate_openapi.ts — produce `docs/openapi.json` from the
 * typed contracts and the explicit route list below.
 *
 * Why hand-rolled vs. an openapi-generator gradle?
 *  - We have ~12 endpoints; the toolchain overhead isn't worth it.
 *  - The contracts are the source of truth; if the API drifts the CI contract
 *    test will fail loudly, and `pnpm run openapi:build` will regenerate
 *    the spec so consumers see the change.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSprintJsonSchema,
  buildAuditJsonSchema,
  buildRunResultJsonSchema,
  buildStartRunRequestJsonSchema,
  buildUpsertCredentialRequestJsonSchema,
  buildIssueAuthTokenJsonSchema,
  buildIssueTokenJsonSchema,
  buildWorkspaceIdPathJsonSchema,
  buildListRunsQueryJsonSchema,
  buildListAuditQueryJsonSchema,
} from "../shared/contracts/index.js";

interface OpenAPIRoute {
  method: "get" | "post" | "delete";
  path: string;
  summary: string;
  tags: string[];
  requestSchema?: unknown;
  querySchema?: unknown;
  responseSchema?: unknown;
  parameters?: Array<{ name: string; in: "path" | "query"; required: boolean; schema?: unknown }>;
  security?: Array<Record<string, string[]>>;
}

const routes: OpenAPIRoute[] = [
  { method: "get", path: "/api/health", summary: "Liveness + DB ping + provider mode.", tags: ["meta"] },
  { method: "get", path: "/api/summary", summary: "Dashboard summary (totals, runs, templates, integration).", tags: ["meta"] },
  { method: "get", path: "/api/workspaces", summary: "List workspaces + credential metadata.", tags: ["workspaces"] },
  { method: "get", path: "/api/boards", summary: "List boards.", tags: ["boards"] },
  {
    method: "get", path: "/api/boards/{id}/items", summary: "Per-board artifact viewer.",
    tags: ["boards"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
  },
  { method: "get", path: "/api/templates", summary: "List workflow templates.", tags: ["templates"] },
  { method: "get", path: "/api/templates/{slug}", summary: "Get one template.", tags: ["templates"], parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }] },
  {
    method: "get", path: "/api/runs", summary: "List recent runs.", tags: ["runs"],
    querySchema: buildListRunsQueryJsonSchema(),
    responseSchema: { type: "object", properties: { data: { type: "array", items: { $ref: buildRunResultJsonSchema().$id } } } },
  },
  {
    method: "post", path: "/api/runs", summary: "Start a workflow run.", tags: ["runs"],
    requestSchema: buildStartRunRequestJsonSchema(),
    responseSchema: buildRunResultJsonSchema(),
    security: [{ bearerAuth: ["runs:write"] }],
  },
  { method: "get", path: "/api/runs/{id}", summary: "Get one run with items + audit.", tags: ["runs"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }] },
  {
    method: "get", path: "/api/audit-events", summary: "Recent audit events.", tags: ["audit"],
    querySchema: buildListAuditQueryJsonSchema(),
    responseSchema: { type: "object", properties: { data: { type: "array", items: { $ref: buildAuditJsonSchema().$id } } } },
  },
  { method: "post", path: "/api/sync/boards", summary: "Sync configured boards (live provider).", tags: ["boards"], security: [{ bearerAuth: ["boards:write"] }] },
  {
    method: "post", path: "/api/credentials", summary: "Attach credential metadata to a workspace.", tags: ["credentials"],
    requestSchema: buildUpsertCredentialRequestJsonSchema(), security: [{ bearerAuth: ["credentials:write"] }],
  },
  {
    method: "delete", path: "/api/credentials/{id}", summary: "Revoke a credential.", tags: ["credentials"],
    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
    security: [{ bearerAuth: ["credentials:write"] }],
  },
  {
    method: "post", path: "/api/auth/tokens", summary: "Issue a bearer token.", tags: ["auth"],
    requestSchema: buildIssueAuthTokenJsonSchema(), security: [{ bearerAuth: ["dashboard:write"] }],
  },
  {
    method: "get", path: "/api/auth/tokens", summary: "List tokens for the caller's workspace.", tags: ["auth"],
    security: [{ bearerAuth: ["dashboard:read"] }],
  },
  {
    method: "delete", path: "/api/auth/tokens/{id}", summary: "Revoke a token.", tags: ["auth"],
    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
    security: [{ bearerAuth: ["dashboard:write"] }],
  },
  {
    method: "post", path: "/api/webhooks/miro", summary: "Receive a Miro webhook (HMAC + dedupe).", tags: ["webhooks"],
    security: [{ bearerAuth: ["webhooks:write"] }],
  },
  {
    method: "post", path: "/api/workspaces/{id}/oauth/device-code", summary: "Start an OAuth device-flow (DEMO STUB).", tags: ["oauth"],
    parameters: [{ name: "id", in: "path", required: true, schema: buildWorkspaceIdPathJsonSchema() }],
    requestSchema: buildIssueTokenJsonSchema(),
  },
  { method: "get", path: "/metrics", summary: "Prometheus metrics.", tags: ["meta"] },
];

function buildSpec() {
  const components: Record<string, unknown> = {};
  const all: Array<{ id: string; schema: unknown }> = [
    { id: "Sprint", schema: buildSprintJsonSchema() },
    { id: "AuditEvent", schema: buildAuditJsonSchema() },
    { id: "RunResult", schema: buildRunResultJsonSchema() },
    { id: "StartRunRequest", schema: buildStartRunRequestJsonSchema() },
    { id: "UpsertCredentialRequest", schema: buildUpsertCredentialRequestJsonSchema() },
    { id: "IssueAuthToken", schema: buildIssueAuthTokenJsonSchema() },
    { id: "IssueToken", schema: buildIssueTokenJsonSchema() },
    { id: "WorkspaceIdPath", schema: buildWorkspaceIdPathJsonSchema() },
    { id: "ListRunsQuery", schema: buildListRunsQueryJsonSchema() },
    { id: "ListAuditQuery", schema: buildListAuditQueryJsonSchema() },
  ];
  for (const s of all) components[s.id] = s.schema;
  const paths: Record<string, Record<string, unknown>> = {};
  for (const r of routes) {
    const op: Record<string, unknown> = { summary: r.summary, tags: r.tags, operationId: `${r.method}-${r.path.replace(/[^a-z0-9]+/gi, "-")}` };
    if (r.security) op.security = r.security;
    const params: unknown[] = [];
    for (const p of r.parameters ?? []) params.push({ name: p.name, in: p.in, required: p.required, schema: p.schema });
    if (r.querySchema) params.push({ name: "limit", in: "query", required: false, schema: { type: "string" } });
    if (params.length) op.parameters = params;
    const body = r.requestSchema;
    if (body) op.requestBody = { required: true, content: { "application/json": { schema: body } } };
    op.responses = { 200: { description: "OK", content: { "application/json": { schema: r.responseSchema ?? { type: "object" } } } }, 4: { description: "Client error" }, 5: { description: "Server error" } };
    if (!paths[r.path]) paths[r.path] = {};
    paths[r.path][r.method] = op;
  }
  return {
    openapi: "3.1.0",
    info: { title: "Miro Workflows API", version: "1.0.0", description: "Auto-generated from the typed contracts in `shared/contracts/`." },
    servers: [{ url: "/" }],
    components: {
      ...components,
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "MW_<hex>" } },
    },
    security: [],
    tags: routes.reduce<Record<string, { name: string; description?: string }>>((acc, r) => {
      for (const t of r.tags) if (!acc[t]) acc[t] = { name: t };
      return acc;
    }, {}),
    paths,
  };
}

export function generateOpenApi(): unknown {
  return buildSpec();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const here = dirname(fileURLToPath(import.meta.url));
  const outDir = resolve(here, "..", "docs");
  mkdirSync(outDir, { recursive: true });
  const out = resolve(outDir, "openapi.json");
  writeFileSync(out, JSON.stringify(generateOpenApi(), null, 2));
  console.log(`Wrote ${out}`);
}
