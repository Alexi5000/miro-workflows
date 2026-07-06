/**
 * shared/contracts/json-schema.ts — JSON-Schema emitter via `zod-to-json-schema`.
 *
 * The previous hand-rolled emitter was removed; we now use the well-tested
 * upstream package and add our own envelope (id, title, additionalProperties).
 */
import { zodToJsonSchema } from "zod-to-json-schema";
import type { ZodTypeAny } from "zod";
import {
  SPRINT_CONTRACT_VERSION,
  AUDIT_CONTRACT_VERSION,
  sprintContractV1,
  auditEventContractV1,
  runResultContractV1,
  issueTokenContractV1,
  startRunContractV1,
  upsertCredentialContractV1,
  listRunsQueryContractV1,
  listAuditQueryContractV1,
  issueAuthTokenContractV1,
  workspaceIdPathContractV1,
  AUTH_CONTRACT_VERSION,
} from "./index.js";

export interface JsonSchema {
  $schema: string;
  $id: string;
  title: string;
  type: "object";
  additionalProperties: boolean;
  required?: string[];
  properties: Record<string, unknown>;
}

function envelope<S extends ZodTypeAny>(schema: S, id: string, title: string): JsonSchema {
  const inner = zodToJsonSchema(schema, { target: "jsonSchema7" }) as Record<string, unknown>;
  const required = typeof inner.required === "string" ? [inner.required] : Array.isArray(inner.required) ? (inner.required as string[]) : undefined;
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: id,
    title,
    type: "object",
    additionalProperties: false,
    required,
    properties: (inner.properties as Record<string, unknown>) ?? {},
  };
}

export const buildSprintJsonSchema = (): JsonSchema => envelope(sprintContractV1, `https://miro-workflows.dev/contracts/sprint.v${SPRINT_CONTRACT_VERSION}.json`, `MiroWorkflows.Sprint.v${SPRINT_CONTRACT_VERSION}`);
export const buildAuditJsonSchema = (): JsonSchema => envelope(auditEventContractV1, `https://miro-workflows.dev/contracts/audit.v${AUDIT_CONTRACT_VERSION}.json`, `MiroWorkflows.AuditEvent.v${AUDIT_CONTRACT_VERSION}`);
export const buildRunResultJsonSchema = (): JsonSchema => envelope(runResultContractV1, `https://miro-workflows.dev/contracts/run_result.v${SPRINT_CONTRACT_VERSION}.json`, `MiroWorkflows.RunResult.v${SPRINT_CONTRACT_VERSION}`);
export const buildIssueTokenJsonSchema = (): JsonSchema => envelope(issueTokenContractV1, `https://miro-workflows.dev/contracts/issue_token.v${AUTH_CONTRACT_VERSION}.json`, `MiroWorkflows.IssueToken.v${AUTH_CONTRACT_VERSION}`);
export const buildStartRunRequestJsonSchema = (): JsonSchema => envelope(startRunContractV1, `https://miro-workflows.dev/contracts/start_run_request.v1.json`, "MiroWorkflows.StartRunRequest.v1");
export const buildUpsertCredentialRequestJsonSchema = (): JsonSchema => envelope(upsertCredentialContractV1, `https://miro-workflows.dev/contracts/upsert_credential_request.v1.json`, "MiroWorkflows.UpsertCredentialRequest.v1");
export const buildListRunsQueryJsonSchema = (): JsonSchema => envelope(listRunsQueryContractV1, `https://miro-workflows.dev/contracts/list_runs_query.v1.json`, "MiroWorkflows.ListRunsQuery.v1");
export const buildListAuditQueryJsonSchema = (): JsonSchema => envelope(listAuditQueryContractV1, `https://miro-workflows.dev/contracts/list_audit_query.v1.json`, "MiroWorkflows.ListAuditQuery.v1");
export const buildIssueAuthTokenJsonSchema = (): JsonSchema => envelope(issueAuthTokenContractV1, `https://miro-workflows.dev/contracts/issue_auth_token.v${AUTH_CONTRACT_VERSION}.json`, `MiroWorkflows.IssueAuthToken.v${AUTH_CONTRACT_VERSION}`);
export const buildWorkspaceIdPathJsonSchema = (): JsonSchema => envelope(workspaceIdPathContractV1, `https://miro-workflows.dev/contracts/workspace_id_path.v1.json`, "MiroWorkflows.WorkspaceIdPath.v1");
