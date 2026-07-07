/**
 * server/db/sqlJsRepository.ts — sql.js-backed implementation of the
 * `Repository` contract. Default adapter (Drizzle / Postgres lives at
 * `./pgRepository.ts`).
 */
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
import { getConfig, type AppConfig } from "../config.js";
import type { Repository } from "./repository.js";

interface SqlJsModule {
  SQL: SqlJsStatic;
  db: Database;
  persist: () => void;
}

let _module: SqlJsModule | null = null;
let _config: AppConfig = getConfig();

const parse = <T>(value: string | null | undefined, fallback: T): T =>
  value ? (JSON.parse(value) as T) : fallback;
const json = (value: unknown) => JSON.stringify(value ?? null);
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const random8 = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

async function ensureLoaded(): Promise<SqlJsModule> {
  if (_module) return _module;
  const SQL = await initSqlJs();
  const db = existsSync(_config.databasePath)
    ? new SQL.Database(readFileSync(_config.databasePath))
    : new SQL.Database();
  _module = {
    SQL,
    db,
    persist() {
      writeFileSync(_config.databasePath, Buffer.from(db.export()));
    },
  };
  return _module;
}

function all(sql: string, params: unknown[] = []) {
  if (!_module) throw new Error("Repository not initialized — call migrate() first.");
  const stmt = _module.db.prepare(sql);
  stmt.bind(params as never[]);
  const rows: unknown[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function get(sql: string, params: unknown[] = []) {
  return all(sql, params)[0] ?? null;
}

function run(sql: string, params: unknown[] = []) {
  if (!_module) throw new Error("Repository not initialized — call migrate() first.");
  _module.db.run(sql, params as never[]);
  _module.persist();
}

function mapWorkspace(row: any): Workspace {
  return { id: row.id, name: row.name, slug: row.slug, provider: row.provider, mode: row.mode, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}
function mapCredential(row: any): IntegrationCredential {
  return {
    id: row.id, workspaceId: row.workspace_id, provider: row.provider, credentialLabel: row.credential_label,
    scopes: parse(row.scopes_json, [] as string[]), expiresAt: row.expires_at || null, status: row.status,
    fromOAuthDeviceFlow: row.from_oauth_device_flow === 1 || row.from_oauth_device_flow === true,
  };
}
function mapBoard(row: any): Board {
  return { id: row.id, workspaceId: row.workspace_id, providerBoardId: row.provider_board_id, name: row.name, description: row.description, viewLink: row.view_link, status: row.status, lastSyncedAt: row.last_synced_at, createdAt: row.created_at };
}
function mapTemplate(row: any): WorkflowTemplate {
  return { id: row.id, slug: row.slug, name: row.name, category: row.category, description: row.description, outcome: row.outcome, defaultBoardId: row.default_board_id, estimatedMinutes: Number(row.estimated_minutes), steps: parse(row.steps_json, [] as never[]), status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}
function mapRun(row: any): WorkflowRun {
  return {
    id: row.id, templateId: row.template_id, templateName: row.template_name, boardId: row.board_id, boardName: row.board_name,
    status: row.status, triggeredBy: row.triggered_by, summary: row.summary,
    metrics: parse<WorkflowRunMetrics>(row.metrics_json, { totalSteps: 0, completedSteps: 0, createdItems: 0, syncDurationMs: 0, riskScore: 0 }),
    startedAt: row.started_at, finishedAt: row.finished_at || null,
  };
}
function mapItem(row: any): BoardItem {
  return { id: row.id, runId: row.run_id, boardId: row.board_id, providerItemId: row.provider_item_id, itemType: row.item_type, title: row.title, payload: parse(row.payload_json, {}), createdAt: row.created_at };
}
function mapAudit(row: any): AuditEvent {
  return { id: row.id, workspaceId: row.workspace_id, runId: row.run_id || null, eventType: row.event_type, severity: row.severity, message: row.message, metadata: parse(row.metadata_json, {}), createdAt: row.created_at };
}
function mapAuthToken(row: any): AuthToken {
  return {
    id: row.id, workspaceId: row.workspace_id, label: row.label, prefix: row.prefix,
    digest: row.digest, scopes: parse(row.scopes_json, []), createdAt: row.created_at,
    expiresAt: row.expires_at, lastUsedAt: row.last_used_at, revokedAt: row.revoked_at,
    createdBy: row.created_by,
  };
}
function mapWebhook(row: any): WebhookDelivery {
  return {
    id: row.id, source: row.source, externalId: row.external_id, workspaceId: row.workspace_id,
    receivedAt: row.received_at, processedAt: row.processed_at, status: row.status,
    payload: parse(row.payload_json, {}),
  };
}
function mapDeviceFlow(row: any) {
  return {
    id: row.id, workspaceId: row.workspace_id, clientId: row.client_id, deviceCode: row.device_code, userCode: row.user_code,
    verificationUri: row.verification_uri, expiresAt: row.expires_at, intervalSec: Number(row.interval_sec), status: row.status,
    credentialId: row.credential_id || null, createdAt: row.created_at, updatedAt: row.updated_at, lastPolledAt: row.last_polled_at || null,
  };
}

export class SqlJsRepository implements Repository {
  async migrate(): Promise<void> {
    const m = await ensureLoaded();
    m.db.run(readFileSync(resolve("server/db/schema.sql"), "utf-8"));
    // v1.1: add the `from_oauth_device_flow` column to existing
    // `integration_credentials` tables (CREATE TABLE IF NOT EXISTS is a
    // no-op for pre-existing tables, so we must ALTER).
    const cols = m.db.exec("PRAGMA table_info('integration_credentials')");
    const hasFlag = (cols[0]?.values ?? []).some((row) => row[1] === "from_oauth_device_flow");
    if (!hasFlag) {
      m.db.run(`ALTER TABLE integration_credentials ADD COLUMN from_oauth_device_flow INTEGER NOT NULL DEFAULT 0`);
    }
    // v1.1: also create the oauth_device_flows table if missing.
    m.db.run(`CREATE TABLE IF NOT EXISTS oauth_device_flows (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      client_id TEXT NOT NULL,
      device_code TEXT NOT NULL,
      user_code TEXT NOT NULL,
      verification_uri TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      interval_sec INTEGER NOT NULL DEFAULT 5,
      status TEXT NOT NULL DEFAULT 'pending',
      credential_id TEXT REFERENCES integration_credentials(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_polled_at TEXT
    )`);
    m.db.run(`CREATE INDEX IF NOT EXISTS idx_oauthflow_workspace ON oauth_device_flows(workspace_id)`);
    m.persist();
  }
  async reset(): Promise<void> {
    const m = await ensureLoaded();
    m.db.run("DELETE FROM oauth_device_flows; DELETE FROM auth_tokens; DELETE FROM webhook_deliveries; DELETE FROM audit_events; DELETE FROM board_items; DELETE FROM workflow_runs; DELETE FROM workflow_templates; DELETE FROM boards; DELETE FROM integration_credentials; DELETE FROM workspaces;");
    m.persist();
  }
  async close(): Promise<void> {
    if (_module) {
      _module.persist();
    }
  }
  async upsertWorkspace(workspace: Workspace): Promise<void> {
    const m = await ensureLoaded();
    m.db.run(
      `INSERT INTO workspaces (id, name, slug, provider, mode, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, slug=excluded.slug, provider=excluded.provider, mode=excluded.mode, status=excluded.status, updated_at=excluded.updated_at`,
      [workspace.id, workspace.name, workspace.slug, workspace.provider, workspace.mode, workspace.status, workspace.createdAt, workspace.updatedAt],
    );
    m.persist();
  }
  async upsertCredential(credential: IntegrationCredential): Promise<void> {
    const m = await ensureLoaded();
    m.db.run(
      `INSERT INTO integration_credentials (id, workspace_id, provider, credential_label, scopes_json, expires_at, status, from_oauth_device_flow) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET credential_label=excluded.credential_label, scopes_json=excluded.scopes_json, expires_at=excluded.expires_at, status=excluded.status, from_oauth_device_flow=excluded.from_oauth_device_flow, updated_at=CURRENT_TIMESTAMP`,
      [credential.id, credential.workspaceId, credential.provider, credential.credentialLabel, json(credential.scopes), credential.expiresAt, credential.status, credential.fromOAuthDeviceFlow ? 1 : 0],
    );
    m.persist();
  }
  async upsertBoard(board: Board): Promise<void> {
    const m = await ensureLoaded();
    m.db.run(
      `INSERT INTO boards (id, workspace_id, provider_board_id, name, description, view_link, status, last_synced_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, view_link=excluded.view_link, status=excluded.status, last_synced_at=excluded.last_synced_at`,
      [board.id, board.workspaceId, board.providerBoardId, board.name, board.description, board.viewLink, board.status, board.lastSyncedAt, board.createdAt],
    );
    m.persist();
  }
  async upsertTemplate(template: WorkflowTemplate): Promise<void> {
    const m = await ensureLoaded();
    m.db.run(
      `INSERT INTO workflow_templates (id, slug, name, category, description, outcome, default_board_id, estimated_minutes, steps_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug, name=excluded.name, category=excluded.category, description=excluded.description, outcome=excluded.outcome, default_board_id=excluded.default_board_id, estimated_minutes=excluded.estimated_minutes, steps_json=excluded.steps_json, status=excluded.status, updated_at=excluded.updated_at`,
      [template.id, template.slug, template.name, template.category, template.description, template.outcome, template.defaultBoardId, template.estimatedMinutes, json(template.steps), template.status, template.createdAt, template.updatedAt],
    );
    m.persist();
  }
  listWorkspaces(): Workspace[] { return all("SELECT * FROM workspaces ORDER BY name").map(mapWorkspace); }
  listCredentials(): IntegrationCredential[] { return all("SELECT * FROM integration_credentials ORDER BY credential_label").map(mapCredential); }
  listCredentialsByWorkspace(workspaceId: string): IntegrationCredential[] { return all("SELECT * FROM integration_credentials WHERE workspace_id = ? ORDER BY credential_label", [workspaceId]).map(mapCredential); }
  listBoards(): Board[] { return all("SELECT * FROM boards ORDER BY name").map(mapBoard); }
  getBoard(boardId: string): Board | null { const row = get("SELECT * FROM boards WHERE id = ?", [boardId]); return row ? mapBoard(row) : null; }
  listTemplates(): WorkflowTemplate[] { return all("SELECT * FROM workflow_templates ORDER BY category, name").map(mapTemplate); }
  getTemplateBySlug(slug: string): WorkflowTemplate | null { const row = get("SELECT * FROM workflow_templates WHERE slug = ?", [slug]); return row ? mapTemplate(row) : null; }
  getTemplateById(templateId: string): WorkflowTemplate | null { const row = get("SELECT * FROM workflow_templates WHERE id = ?", [templateId]); return row ? mapTemplate(row) : null; }
  listRuns(limit = 25) { return all(`SELECT r.*, t.name AS template_name, b.name AS board_name FROM workflow_runs r JOIN workflow_templates t ON t.id = r.template_id JOIN boards b ON b.id = r.board_id ORDER BY r.started_at DESC LIMIT ?`, [limit]).map(mapRun); }
  getRun(runId: string): RunDetail | null {
    const row = get(`SELECT r.*, t.name AS template_name, b.name AS board_name FROM workflow_runs r JOIN workflow_templates t ON t.id = r.template_id JOIN boards b ON b.id = r.board_id WHERE r.id = ?`, [runId]);
    if (!row) return null;
    const run = mapRun(row);
    const template = this.getTemplateById(run.templateId);
    const board = this.getBoard(run.boardId);
    if (!template || !board) return null;
    return { ...run, template, board, items: this.listBoardItems(run.id), auditEvents: this.listAuditEvents({ runId: run.id, limit: 50 }) };
  }
  async createRun(input: { templateId: string; boardId: string; status: WorkflowRun["status"]; triggeredBy: string; summary: string; metrics: WorkflowRunMetrics; startedAt?: string; finishedAt?: string | null }) {
    const m = await ensureLoaded();
    const runId = id("run");
    m.db.run(
      `INSERT INTO workflow_runs (id, template_id, board_id, status, triggered_by, summary, metrics_json, started_at, finished_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [runId, input.templateId, input.boardId, input.status, input.triggeredBy, input.summary, json(input.metrics), input.startedAt || now(), input.finishedAt ?? null],
    );
    m.persist();
    return this.getRun(runId)!;
  }
  async createBoardItem(input: Omit<BoardItem, "id" | "createdAt">): Promise<BoardItem> {
    const m = await ensureLoaded();
    const item: BoardItem = { id: id("item"), createdAt: now(), ...input };
    m.db.run(
      `INSERT INTO board_items (id, run_id, board_id, provider_item_id, item_type, title, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [item.id, item.runId, item.boardId, item.providerItemId, item.itemType, item.title, json(item.payload), item.createdAt],
    );
    m.persist();
    return item;
  }
  listBoardItems(runId: string): BoardItem[] { return all("SELECT * FROM board_items WHERE run_id = ? ORDER BY created_at", [runId]).map(mapItem); }
  async createAuditEvent(input: Omit<AuditEvent, "id" | "createdAt">): Promise<AuditEvent> {
    const m = await ensureLoaded();
    const event: AuditEvent = { id: id("audit"), createdAt: now(), ...input };
    m.db.run(
      `INSERT INTO audit_events (id, workspace_id, run_id, event_type, severity, message, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [event.id, event.workspaceId, event.runId, event.eventType, event.severity, event.message, json(event.metadata), event.createdAt],
    );
    m.persist();
    return event;
  }
  listAuditEvents(input: { workspaceId?: string; runId?: string; limit?: number } = {}) {
    if (input.runId) return all("SELECT * FROM audit_events WHERE run_id = ? ORDER BY created_at DESC LIMIT ?", [input.runId, input.limit || 25]).map(mapAudit);
    if (input.workspaceId) return all("SELECT * FROM audit_events WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?", [input.workspaceId, input.limit || 25]).map(mapAudit);
    return all("SELECT * FROM audit_events ORDER BY created_at DESC LIMIT ?", [input.limit || 25]).map(mapAudit);
  }
  async updateBoardSync(boardId: string): Promise<Board | null> { run("UPDATE boards SET last_synced_at = ? WHERE id = ?", [now(), boardId]); return this.getBoard(boardId); }
  getSummary(): DashboardSummary {
    const totals = get(`SELECT (SELECT COUNT(*) FROM workspaces) AS workspaces, (SELECT COUNT(*) FROM boards) AS boards, (SELECT COUNT(*) FROM workflow_templates) AS templates, (SELECT COUNT(*) FROM workflow_runs) AS runs, (SELECT COUNT(*) FROM workflow_runs WHERE status='completed') AS completedRuns, (SELECT COUNT(*) FROM board_items) AS createdItems`) as { workspaces: number; boards: number; templates: number; runs: number; completedRuns: number; createdItems: number };
    return {
      totals,
      integration: { mode: _config.providerMode, status: _config.providerMode === "miro" ? "Miro token configured" : "Demo mode - no Miro token required", hasAccessToken: Boolean(_config.miroAccessToken) },
      recentRuns: this.listRuns(5),
      boards: this.listBoards(),
      templates: this.listTemplates(),
    };
  }
  async createAuthToken(input: Pick<AuthToken, "workspaceId" | "label" | "prefix" | "digest" | "scopes" | "expiresAt" | "lastUsedAt" | "revokedAt" | "createdBy" | "createdAt"> & { id?: string }): Promise<AuthToken> {
    const m = await ensureLoaded();
    const tokenId = input.id ?? `tok-${random8()}`;
    m.db.run(
      `INSERT INTO auth_tokens (id, workspace_id, label, prefix, digest, scopes_json, created_at, expires_at, last_used_at, revoked_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tokenId, input.workspaceId, input.label, input.prefix, input.digest, json(input.scopes), input.createdAt, input.expiresAt, input.lastUsedAt, input.revokedAt, input.createdBy],
    );
    m.persist();
    return { ...input, id: tokenId } as AuthToken;
  }
  async findAuthTokenByPrefix(prefix: string): Promise<AuthToken | null> {
    const rows = all(`SELECT * FROM auth_tokens WHERE prefix = ? AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1`, [prefix]);
    return rows.length ? mapAuthToken(rows[0]) : null;
  }
  async listAuthTokensByWorkspace(workspaceId: string): Promise<AuthToken[]> {
    return all(`SELECT * FROM auth_tokens WHERE workspace_id = ? ORDER BY created_at DESC`, [workspaceId]).map(mapAuthToken);
  }
  async touchAuthToken(id: string): Promise<void> { run(`UPDATE auth_tokens SET last_used_at = ? WHERE id = ?`, [now(), id]); }
  async revokeAuthToken(id: string): Promise<void> { run(`UPDATE auth_tokens SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL`, [now(), id]); }
  async recordWebhookDelivery(input: Pick<WebhookDelivery, "source" | "externalId" | "workspaceId" | "payload"> & { id?: string; status?: WebhookDelivery["status"]; processedAt?: string | null; receivedAt?: string }): Promise<{ inserted: boolean; row: WebhookDelivery }> {
    const whId = input.id ?? `wh-${random8()}`;
    const receivedAt = input.receivedAt ?? now();
    const status = input.status ?? "received";
    try {
      const m = await ensureLoaded();
      m.db.run(
        `INSERT INTO webhook_deliveries (id, source, external_id, workspace_id, received_at, processed_at, status, payload_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [whId, input.source, input.externalId, input.workspaceId, receivedAt, input.processedAt ?? null, status, json(input.payload)],
      );
      m.persist();
      return { inserted: true, row: { id: whId, source: input.source, externalId: input.externalId, workspaceId: input.workspaceId, receivedAt, processedAt: input.processedAt ?? null, status, payload: input.payload } };
    } catch (err) {
      const existing = all(`SELECT * FROM webhook_deliveries WHERE source = ? AND external_id = ?`, [input.source, input.externalId]);
      if (existing.length) return { inserted: false, row: mapWebhook(existing[0]) };
      throw err;
    }
  }
  async upsertDeviceFlow(input: { id: string; workspaceId: string; clientId: string; deviceCode: string; userCode: string; verificationUri: string; expiresAt: string; intervalSec: number }): Promise<void> {
    const m = await ensureLoaded();
    m.db.run(
      `INSERT INTO oauth_device_flows (id, workspace_id, client_id, device_code, user_code, verification_uri, expires_at, interval_sec, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
       ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at`,
      [input.id, input.workspaceId, input.clientId, input.deviceCode, input.userCode, input.verificationUri, input.expiresAt, input.intervalSec, now(), now()],
    );
    m.persist();
  }
  async getDeviceFlow(id: string) {
    const rows = all("SELECT * FROM oauth_device_flows WHERE id = ?", [id]);
    return rows.length ? mapDeviceFlow(rows[0]) : null;
  }
  async updateDeviceFlow(id: string, patch: Partial<{ status: string; credentialId: string | null; lastPolledAt: string | null; updatedAt: string }>): Promise<void> {
    const fields: string[] = [];
    const params: unknown[] = [];
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      fields.push(`${k === "lastPolledAt" ? "last_polled_at" : k === "credentialId" ? "credential_id" : k} = ?`);
      params.push(v);
    }
    if (!fields.length) return;
    fields.push("updated_at = ?"); params.push(now());
    params.push(id);
    run(`UPDATE oauth_device_flows SET ${fields.join(", ")} WHERE id = ?`, params);
  }
}

/** Reset the cached module — exposed for tests. */
export function _resetSqlJsForTests(): void {
  _module = null;
  _config = getConfig();
}
