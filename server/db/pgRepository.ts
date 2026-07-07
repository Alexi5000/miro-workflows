/**
 * server/db/pgRepository.ts — Postgres-backed implementation of the
 * `Repository` contract. Selected automatically when `DATABASE_URL` starts
 * with `postgres://` or `postgresql://`.
 *
 * Schema: see `server/db/migrations/0001_init.sql`. This file is the
 * query layer; the schema itself is hand-maintained in SQL for v1.1 to
 * avoid adding a code-generation step. v1.2 may swap in Drizzle's
 * generated migrations.
 */
import pg from "pg";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  AuditEvent,
  AuthToken,
  Board,
  BoardItem,
  DashboardSummary,
  IntegrationCredential,
  RunDetail,
  WebhookDelivery,
  WorkflowRun,
  WorkflowRunMetrics,
  WorkflowTemplate,
  Workspace,
} from "../../shared/types.js";
import { getConfig } from "../config.js";
import type { Repository } from "./repository.js";

const { Pool } = pg;
type PoolClient = pg.PoolClient;

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  return value ? (JSON.parse(value) as T) : fallback;
}
function nowIso(): string { return new Date().toISOString(); }
function random8(): string { return crypto.randomUUID().replace(/-/g, "").slice(0, 16); }
function newId(prefix: string): string { return `${prefix}-${crypto.randomUUID()}`; }

function mapWorkspace(row: any): Workspace {
  return { id: row.id, name: row.name, slug: row.slug, provider: row.provider, mode: row.mode, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}
function mapCredential(row: any): IntegrationCredential {
  return {
    id: row.id, workspaceId: row.workspace_id, provider: row.provider, credentialLabel: row.credential_label,
    scopes: parseJson<string[]>(row.scopes_json, []), expiresAt: row.expires_at || null, status: row.status,
    fromOAuthDeviceFlow: row.from_oauth_device_flow === true,
  };
}
function mapBoard(row: any): Board {
  return { id: row.id, workspaceId: row.workspace_id, providerBoardId: row.provider_board_id, name: row.name, description: row.description, viewLink: row.view_link, status: row.status, lastSyncedAt: row.last_synced_at, createdAt: row.created_at };
}
function mapTemplate(row: any): WorkflowTemplate {
  return { id: row.id, slug: row.slug, name: row.name, category: row.category, description: row.description, outcome: row.outcome, defaultBoardId: row.default_board_id, estimatedMinutes: Number(row.estimated_minutes), steps: parseJson(row.steps_json, [] as never[]), status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}
function mapRun(row: any): WorkflowRun {
  return {
    id: row.id, templateId: row.template_id, templateName: row.template_name, boardId: row.board_id, boardName: row.board_name,
    status: row.status, triggeredBy: row.triggered_by, summary: row.summary,
    metrics: parseJson<WorkflowRunMetrics>(row.metrics_json, { totalSteps: 0, completedSteps: 0, createdItems: 0, syncDurationMs: 0, riskScore: 0 }),
    startedAt: row.started_at, finishedAt: row.finished_at || null,
  };
}
function mapItem(row: any): BoardItem {
  return { id: row.id, runId: row.run_id, boardId: row.board_id, providerItemId: row.provider_item_id, itemType: row.item_type, title: row.title, payload: parseJson(row.payload_json, {}), createdAt: row.created_at };
}
function mapAudit(row: any): AuditEvent {
  return { id: row.id, workspaceId: row.workspace_id, runId: row.run_id || null, eventType: row.event_type, severity: row.severity, message: row.message, metadata: parseJson(row.metadata_json, {}), createdAt: row.created_at };
}
function mapAuthToken(row: any): AuthToken {
  return {
    id: row.id, workspaceId: row.workspace_id, label: row.label, prefix: row.prefix,
    digest: row.digest, scopes: parseJson<string[]>(row.scopes_json, []), createdAt: row.created_at,
    expiresAt: row.expires_at, lastUsedAt: row.last_used_at, revokedAt: row.revoked_at, createdBy: row.created_by,
  };
}
function mapWebhook(row: any): WebhookDelivery {
  return { id: row.id, source: row.source, externalId: row.external_id, workspaceId: row.workspace_id, receivedAt: row.received_at, processedAt: row.processed_at, status: row.status, payload: parseJson(row.payload_json, {}) };
}
function mapDeviceFlow(row: any) {
  return {
    id: row.id, workspaceId: row.workspace_id, clientId: row.client_id, deviceCode: row.device_code, userCode: row.user_code,
    verificationUri: row.verification_uri, expiresAt: row.expires_at, intervalSec: Number(row.interval_sec), status: row.status,
    credentialId: row.credential_id || null, createdAt: row.created_at, updatedAt: row.updated_at, lastPolledAt: row.last_polled_at || null,
  };
}

export class PgRepository implements Repository {
  private pool: pg.Pool;
  private client: PoolClient | null = null;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 20, idleTimeoutMillis: 30_000 });
  }

  private async db(): Promise<PoolClient> {
    if (this.client) return this.client;
    this.client = await this.pool.connect();
    return this.client;
  }

  async migrate(): Promise<void> {
    const c = await this.db();
    const sql = readFileSync(resolve("server/db/migrations/0001_init.sql"), "utf-8");
    await c.query(sql);
  }

  async reset(): Promise<void> {
    const c = await this.db();
    await c.query(`TRUNCATE oauth_device_flows, auth_tokens, webhook_deliveries, audit_events, board_items, workflow_runs, workflow_templates, boards, integration_credentials, workspaces RESTART IDENTITY CASCADE`);
  }

  async close(): Promise<void> {
    if (this.client) { this.client.release(); this.client = null; }
    await this.pool.end();
  }

  async upsertWorkspace(workspace: Workspace): Promise<void> {
    const c = await this.db();
    await c.query(
      `INSERT INTO workspaces (id, name, slug, provider, mode, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug, provider=EXCLUDED.provider, mode=EXCLUDED.mode, status=EXCLUDED.status, updated_at=EXCLUDED.updated_at`,
      [workspace.id, workspace.name, workspace.slug, workspace.provider, workspace.mode, workspace.status, workspace.createdAt, workspace.updatedAt],
    );
  }
  async upsertCredential(credential: IntegrationCredential): Promise<void> {
    const c = await this.db();
    await c.query(
      `INSERT INTO integration_credentials (id, workspace_id, provider, credential_label, scopes_json, expires_at, status, from_oauth_device_flow)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET credential_label=EXCLUDED.credential_label, scopes_json=EXCLUDED.scopes_json, expires_at=EXCLUDED.expires_at, status=EXCLUDED.status, from_oauth_device_flow=EXCLUDED.from_oauth_device_flow, updated_at=CURRENT_TIMESTAMP`,
      [credential.id, credential.workspaceId, credential.provider, credential.credentialLabel, JSON.stringify(credential.scopes), credential.expiresAt, credential.status, credential.fromOAuthDeviceFlow],
    );
  }
  async upsertBoard(board: Board): Promise<void> {
    const c = await this.db();
    await c.query(
      `INSERT INTO boards (id, workspace_id, provider_board_id, name, description, view_link, status, last_synced_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, view_link=EXCLUDED.view_link, status=EXCLUDED.status, last_synced_at=EXCLUDED.last_synced_at`,
      [board.id, board.workspaceId, board.providerBoardId, board.name, board.description, board.viewLink, board.status, board.lastSyncedAt, board.createdAt],
    );
  }
  async upsertTemplate(template: WorkflowTemplate): Promise<void> {
    const c = await this.db();
    await c.query(
      `INSERT INTO workflow_templates (id, slug, name, category, description, outcome, default_board_id, estimated_minutes, steps_json, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET slug=EXCLUDED.slug, name=EXCLUDED.name, category=EXCLUDED.category, description=EXCLUDED.description, outcome=EXCLUDED.outcome, default_board_id=EXCLUDED.default_board_id, estimated_minutes=EXCLUDED.estimated_minutes, steps_json=EXCLUDED.steps_json, status=EXCLUDED.status, updated_at=EXCLUDED.updated_at`,
      [template.id, template.slug, template.name, template.category, template.description, template.outcome, template.defaultBoardId, template.estimatedMinutes, JSON.stringify(template.steps), template.status, template.createdAt, template.updatedAt],
    );
  }
  listWorkspaces(): Workspace[] { return []; /* async; deferred to v1.1.1 — see ADR-0011 */ }
  listCredentials(): IntegrationCredential[] { return []; }
  listCredentialsByWorkspace(workspaceId: string): IntegrationCredential[] { return []; }
  listBoards(): Board[] { return []; }
  getBoard(boardId: string): Board | null { return null; }
  listTemplates(): WorkflowTemplate[] { return []; }
  getTemplateBySlug(slug: string): WorkflowTemplate | null { return null; }
  getTemplateById(id: string): WorkflowTemplate | null { return null; }
  listRuns(limit = 25): WorkflowRun[] { return []; }
  getRun(runId: string): RunDetail | null { return null; }
  async createRun(_input: { templateId: string; boardId: string; status: WorkflowRun["status"]; triggeredBy: string; summary: string; metrics: WorkflowRunMetrics; startedAt?: string; finishedAt?: string | null }): Promise<RunDetail> { throw new Error("PgRepository.createRun is not yet implemented; use SqlJsRepository via DATABASE_URL=sqlite://... for v1.1 foundation. (ADR-0011)"); }
  async createBoardItem(_input: Omit<BoardItem, "id" | "createdAt">): Promise<BoardItem> { throw new Error("not implemented"); }
  listBoardItems(_runId: string): BoardItem[] { return []; }
  async createAuditEvent(_input: Omit<AuditEvent, "id" | "createdAt">): Promise<AuditEvent> { throw new Error("not implemented"); }
  listAuditEvents(_input: { workspaceId?: string; runId?: string; limit?: number } = {}): AuditEvent[] { return []; }
  async updateBoardSync(_boardId: string): Promise<Board | null> { return null; }
  getSummary(): DashboardSummary {
    const config = getConfig();
    return { totals: { workspaces: 0, boards: 0, templates: 0, runs: 0, completedRuns: 0, createdItems: 0 }, integration: { mode: config.providerMode, status: "Postgres backend not yet wired", hasAccessToken: false }, recentRuns: [], boards: [], templates: [] };
  }
  async createAuthToken(_input: Pick<AuthToken, "workspaceId" | "label" | "prefix" | "digest" | "scopes" | "expiresAt" | "lastUsedAt" | "revokedAt" | "createdBy" | "createdAt"> & { id?: string }): Promise<AuthToken> { throw new Error("not implemented"); }
  async findAuthTokenByPrefix(_prefix: string): Promise<AuthToken | null> { return null; }
  async listAuthTokensByWorkspace(_workspaceId: string): Promise<AuthToken[]> { return []; }
  async touchAuthToken(_id: string): Promise<void> { /* noop */ }
  async revokeAuthToken(_id: string): Promise<void> { /* noop */ }
  async recordWebhookDelivery(_input: Pick<WebhookDelivery, "source" | "externalId" | "workspaceId" | "payload"> & { id?: string; status?: WebhookDelivery["status"]; processedAt?: string | null; receivedAt?: string }): Promise<{ inserted: boolean; row: WebhookDelivery }> { return { inserted: false, row: { id: "noop", source: "noop", externalId: "noop", workspaceId: "noop", receivedAt: nowIso(), processedAt: null, status: "received", payload: {} } }; }
  async upsertDeviceFlow(_input: { id: string; workspaceId: string; clientId: string; deviceCode: string; userCode: string; verificationUri: string; expiresAt: string; intervalSec: number }): Promise<void> { /* noop */ }
  async getDeviceFlow(_id: string) { return null; }
  async updateDeviceFlow(_id: string, _patch: Partial<{ status: string; credentialId: string | null; lastPolledAt: string | null; updatedAt: string }>): Promise<void> { /* noop */ }
}
