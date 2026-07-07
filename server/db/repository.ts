/**
 * server/db/repository.ts — The single contract every consumer depends on.
 *
 * Two concrete adapters: `SqlJsRepository` (current, default) and
 * `PgRepository` (v1.1, opt-in). The selector `getRepository()` returns
 * one based on `DATABASE_URL`.
 */
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
import { SqlJsRepository } from "./sqlJsRepository.js";
import { PgRepository } from "./pgRepository.js";

export interface Repository {
  // Bootstrap
  migrate(): Promise<void>;
  reset(): Promise<void>;
  close(): Promise<void>;

  // Workspaces
  upsertWorkspace(workspace: Workspace): Promise<void>;
  listWorkspaces(): Workspace[];

  // Credentials
  upsertCredential(credential: IntegrationCredential): Promise<void>;
  listCredentials(): IntegrationCredential[];
  listCredentialsByWorkspace(workspaceId: string): IntegrationCredential[];

  // Boards
  upsertBoard(board: Board): Promise<void>;
  listBoards(): Board[];
  getBoard(boardId: string): Board | null;
  updateBoardSync(boardId: string): Promise<Board | null>;

  // Templates
  upsertTemplate(template: WorkflowTemplate): Promise<void>;
  listTemplates(): WorkflowTemplate[];
  getTemplateBySlug(slug: string): WorkflowTemplate | null;
  getTemplateById(id: string): WorkflowTemplate | null;

  // Runs
  createRun(input: { templateId: string; boardId: string; status: WorkflowRun["status"]; triggeredBy: string; summary: string; metrics: WorkflowRunMetrics; startedAt?: string; finishedAt?: string | null }): Promise<RunDetail>;
  listRuns(limit?: number): WorkflowRun[];
  getRun(runId: string): RunDetail | null;

  // Board items
  createBoardItem(input: Omit<BoardItem, "id" | "createdAt">): Promise<BoardItem>;
  listBoardItems(runId: string): BoardItem[];

  // Audit
  createAuditEvent(input: Omit<AuditEvent, "id" | "createdAt">): Promise<AuditEvent>;
  listAuditEvents(input: { workspaceId?: string; runId?: string; limit?: number }): AuditEvent[];

  // Auth tokens
  createAuthToken(input: Pick<AuthToken, "workspaceId" | "label" | "prefix" | "digest" | "scopes" | "expiresAt" | "lastUsedAt" | "revokedAt" | "createdBy" | "createdAt"> & { id?: string }): Promise<AuthToken>;
  findAuthTokenByPrefix(prefix: string): Promise<AuthToken | null>;
  listAuthTokensByWorkspace(workspaceId: string): Promise<AuthToken[]>;
  touchAuthToken(id: string): Promise<void>;
  revokeAuthToken(id: string): Promise<void>;

  // Webhook deliveries
  recordWebhookDelivery(input: Pick<WebhookDelivery, "source" | "externalId" | "workspaceId" | "payload"> & { id?: string; status?: WebhookDelivery["status"]; processedAt?: string | null; receivedAt?: string }): Promise<{ inserted: boolean; row: WebhookDelivery }>;

  // v1.1: OAuth device flows
  upsertDeviceFlow(input: { id: string; workspaceId: string; clientId: string; deviceCode: string; userCode: string; verificationUri: string; expiresAt: string; intervalSec: number }): Promise<void>;
  getDeviceFlow(id: string): Promise<{ id: string; workspaceId: string; clientId: string; deviceCode: string; userCode: string; verificationUri: string; expiresAt: string; intervalSec: number; status: string; credentialId: string | null; createdAt: string; updatedAt: string; lastPolledAt: string | null } | null>;
  updateDeviceFlow(id: string, patch: Partial<{ status: string; credentialId: string | null; lastPolledAt: string | null; updatedAt: string }>): Promise<void>;

  // Summary
  getSummary(): DashboardSummary;
}

let _repo: Repository | null = null;
let _kind: "sql.js" | "postgres" | null = null;

export function repositoryKind(): "sql.js" | "postgres" | null {
  return _kind;
}

/** Pick the right repository based on the DATABASE_URL scheme. */
export function getRepository(): Repository {
  if (_repo) return _repo;
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    _repo = new PgRepository(url);
    _kind = "postgres";
  } else {
    _repo = new SqlJsRepository();
    _kind = "sql.js";
  }
  return _repo;
}

export function _resetRepositoryForTests(): void {
  _repo = null;
  _kind = null;
}

/** Test-only: force a specific repository implementation. */
export function _setRepositoryForTests(repo: Repository, kind: "sql.js" | "postgres"): void {
  _repo = repo;
  _kind = kind;
}
