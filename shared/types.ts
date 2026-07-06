export type ProviderMode = "demo" | "miro";
export type ResourceStatus = "active" | "draft" | "archived" | "degraded" | "connected" | "disconnected";
export type WorkflowRunStatus = "queued" | "running" | "completed" | "failed";
export type AuditSeverity = "info" | "warning" | "error";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  provider: "miro";
  mode: ProviderMode;
  status: ResourceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationCredential {
  id: string;
  workspaceId: string;
  provider: "miro";
  credentialLabel: string;
  scopes: string[];
  expiresAt: string | null;
  status: ResourceStatus;
  /** True when the credential is configured via OAuth device flow (vs env). */
  fromOAuthDeviceFlow?: boolean;
}

export interface Board {
  id: string;
  workspaceId: string;
  providerBoardId: string;
  name: string;
  description: string;
  viewLink: string;
  status: ResourceStatus;
  lastSyncedAt: string;
  createdAt: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: "frame" | "sticky_note" | "card" | "connector" | "text" | "sync" | "review";
  description: string;
  config: Record<string, unknown>;
}

export interface WorkflowTemplate {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  outcome: string;
  defaultBoardId: string;
  estimatedMinutes: number;
  steps: WorkflowStep[];
  status: ResourceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRunMetrics {
  totalSteps: number;
  completedSteps: number;
  createdItems: number;
  syncDurationMs: number;
  riskScore: number;
}

export interface WorkflowRun {
  id: string;
  templateId: string;
  templateName?: string;
  boardId: string;
  boardName?: string;
  status: WorkflowRunStatus;
  triggeredBy: string;
  summary: string;
  metrics: WorkflowRunMetrics;
  startedAt: string;
  finishedAt: string | null;
}

export interface BoardItem {
  id: string;
  runId: string;
  boardId: string;
  providerItemId: string;
  itemType: string;
  title: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  workspaceId: string;
  runId: string | null;
  eventType: string;
  severity: AuditSeverity;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuthToken {
  id: string;
  workspaceId: string;
  label: string;
  /** Short public prefix (first 8 chars of plaintext) used for lookup. */
  prefix: string;
  /** HMAC-SHA256 digest of the plaintext. We never store the plaintext. */
  digest: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdBy: string;
}

export interface WebhookDelivery {
  id: string;
  source: string;
  externalId: string;
  workspaceId: string;
  receivedAt: string;
  processedAt: string | null;
  status: "received" | "processed" | "failed" | "duplicate";
  payload: Record<string, unknown>;
}

export interface DashboardSummary {
  totals: {
    workspaces: number;
    boards: number;
    templates: number;
    runs: number;
    completedRuns: number;
    createdItems: number;
  };
  integration: {
    mode: ProviderMode;
    status: string;
    hasAccessToken: boolean;
  };
  recentRuns: WorkflowRun[];
  boards: Board[];
  templates: WorkflowTemplate[];
}

export interface RunDetail extends WorkflowRun {
  template: WorkflowTemplate;
  board: Board;
  items: BoardItem[];
  auditEvents: AuditEvent[];
}
