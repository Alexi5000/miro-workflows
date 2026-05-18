import initSqlJs from "sql.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AuditEvent, Board, BoardItem, DashboardSummary, IntegrationCredential, RunDetail, WorkflowRun, WorkflowRunMetrics, WorkflowTemplate, Workspace } from "../../shared/types.js";
import { getConfig } from "../config.js";

const config = getConfig();
const SQL = await initSqlJs();
const db = existsSync(config.databasePath) ? new SQL.Database(readFileSync(config.databasePath)) : new SQL.Database();

function persist() { writeFileSync(config.databasePath, Buffer.from(db.export())); }
export function migrate() { db.run(readFileSync(resolve("server/db/schema.sql"), "utf-8")); persist(); }

const parse = <T>(value: string | null | undefined, fallback: T): T => value ? JSON.parse(value) as T : fallback;
const json = (value: unknown) => JSON.stringify(value ?? null);
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

function all(sql: string, params: unknown[] = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params as any[]);
  const rows: any[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}
function get(sql: string, params: unknown[] = []) { return all(sql, params)[0] || null; }
function run(sql: string, params: unknown[] = []) { db.run(sql, params as any[]); persist(); }

function mapWorkspace(row: any): Workspace { return { id: row.id, name: row.name, slug: row.slug, provider: row.provider, mode: row.mode, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapCredential(row: any): IntegrationCredential { return { id: row.id, workspaceId: row.workspace_id, provider: row.provider, credentialLabel: row.credential_label, scopes: parse(row.scopes_json, []), expiresAt: row.expires_at || null, status: row.status }; }
function mapBoard(row: any): Board { return { id: row.id, workspaceId: row.workspace_id, providerBoardId: row.provider_board_id, name: row.name, description: row.description, viewLink: row.view_link, status: row.status, lastSyncedAt: row.last_synced_at, createdAt: row.created_at }; }
function mapTemplate(row: any): WorkflowTemplate { return { id: row.id, slug: row.slug, name: row.name, category: row.category, description: row.description, outcome: row.outcome, defaultBoardId: row.default_board_id, estimatedMinutes: Number(row.estimated_minutes), steps: parse(row.steps_json, []), status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }; }
function mapRun(row: any): WorkflowRun { return { id: row.id, templateId: row.template_id, templateName: row.template_name, boardId: row.board_id, boardName: row.board_name, status: row.status, triggeredBy: row.triggered_by, summary: row.summary, metrics: parse<WorkflowRunMetrics>(row.metrics_json, { totalSteps: 0, completedSteps: 0, createdItems: 0, syncDurationMs: 0, riskScore: 0 }), startedAt: row.started_at, finishedAt: row.finished_at || null }; }
function mapItem(row: any): BoardItem { return { id: row.id, runId: row.run_id, boardId: row.board_id, providerItemId: row.provider_item_id, itemType: row.item_type, title: row.title, payload: parse(row.payload_json, {}), createdAt: row.created_at }; }
function mapAudit(row: any): AuditEvent { return { id: row.id, workspaceId: row.workspace_id, runId: row.run_id || null, eventType: row.event_type, severity: row.severity, message: row.message, metadata: parse(row.metadata_json, {}), createdAt: row.created_at }; }

export const repository = {
  migrate,
  reset() { run("DELETE FROM audit_events; DELETE FROM board_items; DELETE FROM workflow_runs; DELETE FROM workflow_templates; DELETE FROM boards; DELETE FROM integration_credentials; DELETE FROM workspaces;"); },
  upsertWorkspace(workspace: Workspace) {
    run(`INSERT INTO workspaces (id, name, slug, provider, mode, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, slug=excluded.slug, provider=excluded.provider, mode=excluded.mode, status=excluded.status, updated_at=excluded.updated_at`, [workspace.id, workspace.name, workspace.slug, workspace.provider, workspace.mode, workspace.status, workspace.createdAt, workspace.updatedAt]);
  },
  upsertCredential(credential: IntegrationCredential) {
    run(`INSERT INTO integration_credentials (id, workspace_id, provider, credential_label, scopes_json, expires_at, status) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET credential_label=excluded.credential_label, scopes_json=excluded.scopes_json, expires_at=excluded.expires_at, status=excluded.status, updated_at=CURRENT_TIMESTAMP`, [credential.id, credential.workspaceId, credential.provider, credential.credentialLabel, json(credential.scopes), credential.expiresAt, credential.status]);
  },
  upsertBoard(board: Board) {
    run(`INSERT INTO boards (id, workspace_id, provider_board_id, name, description, view_link, status, last_synced_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, view_link=excluded.view_link, status=excluded.status, last_synced_at=excluded.last_synced_at`, [board.id, board.workspaceId, board.providerBoardId, board.name, board.description, board.viewLink, board.status, board.lastSyncedAt, board.createdAt]);
  },
  upsertTemplate(template: WorkflowTemplate) {
    run(`INSERT INTO workflow_templates (id, slug, name, category, description, outcome, default_board_id, estimated_minutes, steps_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug, name=excluded.name, category=excluded.category, description=excluded.description, outcome=excluded.outcome, default_board_id=excluded.default_board_id, estimated_minutes=excluded.estimated_minutes, steps_json=excluded.steps_json, status=excluded.status, updated_at=excluded.updated_at`, [template.id, template.slug, template.name, template.category, template.description, template.outcome, template.defaultBoardId, template.estimatedMinutes, json(template.steps), template.status, template.createdAt, template.updatedAt]);
  },
  listWorkspaces: () => all("SELECT * FROM workspaces ORDER BY name").map(mapWorkspace),
  listCredentials: () => all("SELECT * FROM integration_credentials ORDER BY credential_label").map(mapCredential),
  listBoards: () => all("SELECT * FROM boards ORDER BY name").map(mapBoard),
  getBoard: (boardId: string) => { const row = get("SELECT * FROM boards WHERE id = ?", [boardId]); return row ? mapBoard(row) : null; },
  listTemplates: () => all("SELECT * FROM workflow_templates ORDER BY category, name").map(mapTemplate),
  getTemplateBySlug: (slug: string) => { const row = get("SELECT * FROM workflow_templates WHERE slug = ?", [slug]); return row ? mapTemplate(row) : null; },
  getTemplateById: (templateId: string) => { const row = get("SELECT * FROM workflow_templates WHERE id = ?", [templateId]); return row ? mapTemplate(row) : null; },
  listRuns(limit = 25) { return all(`SELECT r.*, t.name AS template_name, b.name AS board_name FROM workflow_runs r JOIN workflow_templates t ON t.id = r.template_id JOIN boards b ON b.id = r.board_id ORDER BY r.started_at DESC LIMIT ?`, [limit]).map(mapRun); },
  getRun(runId: string): RunDetail | null {
    const row = get(`SELECT r.*, t.name AS template_name, b.name AS board_name FROM workflow_runs r JOIN workflow_templates t ON t.id = r.template_id JOIN boards b ON b.id = r.board_id WHERE r.id = ?`, [runId]);
    if (!row) return null;
    const run = mapRun(row);
    const template = this.getTemplateById(run.templateId);
    const board = this.getBoard(run.boardId);
    if (!template || !board) return null;
    return { ...run, template, board, items: this.listBoardItems(run.id), auditEvents: this.listAuditEvents({ runId: run.id, limit: 50 }) };
  },
  createRun(input: { templateId: string; boardId: string; status: WorkflowRun["status"]; triggeredBy: string; summary: string; metrics: WorkflowRunMetrics; startedAt?: string; finishedAt?: string | null }) {
    const runId = id("run");
    run(`INSERT INTO workflow_runs (id, template_id, board_id, status, triggered_by, summary, metrics_json, started_at, finished_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [runId, input.templateId, input.boardId, input.status, input.triggeredBy, input.summary, json(input.metrics), input.startedAt || now(), input.finishedAt ?? null]);
    return this.getRun(runId)!;
  },
  createBoardItem(input: Omit<BoardItem, "id" | "createdAt">) {
    const item: BoardItem = { id: id("item"), createdAt: now(), ...input };
    run(`INSERT INTO board_items (id, run_id, board_id, provider_item_id, item_type, title, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [item.id, item.runId, item.boardId, item.providerItemId, item.itemType, item.title, json(item.payload), item.createdAt]);
    return item;
  },
  listBoardItems: (runId: string) => all("SELECT * FROM board_items WHERE run_id = ? ORDER BY created_at", [runId]).map(mapItem),
  createAuditEvent(input: Omit<AuditEvent, "id" | "createdAt">) {
    const event: AuditEvent = { id: id("audit"), createdAt: now(), ...input };
    run(`INSERT INTO audit_events (id, workspace_id, run_id, event_type, severity, message, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [event.id, event.workspaceId, event.runId, event.eventType, event.severity, event.message, json(event.metadata), event.createdAt]);
    return event;
  },
  listAuditEvents(input: { workspaceId?: string; runId?: string; limit?: number } = {}) {
    if (input.runId) return all("SELECT * FROM audit_events WHERE run_id = ? ORDER BY created_at DESC LIMIT ?", [input.runId, input.limit || 25]).map(mapAudit);
    if (input.workspaceId) return all("SELECT * FROM audit_events WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?", [input.workspaceId, input.limit || 25]).map(mapAudit);
    return all("SELECT * FROM audit_events ORDER BY created_at DESC LIMIT ?", [input.limit || 25]).map(mapAudit);
  },
  updateBoardSync(boardId: string) { run("UPDATE boards SET last_synced_at = ? WHERE id = ?", [now(), boardId]); return this.getBoard(boardId); },
  getSummary(): DashboardSummary {
    const totals = get(`SELECT (SELECT COUNT(*) FROM workspaces) AS workspaces, (SELECT COUNT(*) FROM boards) AS boards, (SELECT COUNT(*) FROM workflow_templates) AS templates, (SELECT COUNT(*) FROM workflow_runs) AS runs, (SELECT COUNT(*) FROM workflow_runs WHERE status='completed') AS completedRuns, (SELECT COUNT(*) FROM board_items) AS createdItems`) as any;
    return { totals, integration: { mode: config.providerMode, status: config.providerMode === "miro" ? "Miro token configured" : "Demo mode - no Miro token required", hasAccessToken: Boolean(config.miroAccessToken) }, recentRuns: this.listRuns(5), boards: this.listBoards(), templates: this.listTemplates() };
  },
};
