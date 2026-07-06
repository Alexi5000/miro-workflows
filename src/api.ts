import type { AuditEvent, Board, BoardItem, DashboardSummary, RunDetail, WorkflowRun, WorkflowTemplate, Workspace } from "../shared/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export interface CredentialRecord {
  id: string;
  workspaceId: string;
  provider: "miro";
  credentialLabel: string;
  scopes: string[];
  expiresAt: string | null;
  status: string;
  /** True when the credential is configured via env (demo) vs OAuth device flow. */
  fromOAuthDeviceFlow: boolean;
}

export interface CredentialUpsertResponse {
  credential: CredentialRecord;
  deviceFlow: { userCode: string; verificationUri: string; expiresIn: number } | null;
}

export const api = {
  summary: () => request<DashboardSummary>("/api/summary"),
  templates: () => request<{ data: WorkflowTemplate[] }>("/api/templates"),
  boards: () => request<{ data: Board[] }>("/api/boards"),
  workspaces: () => request<{ data: Workspace[]; credentials: CredentialRecord[] }>("/api/workspaces"),
  runs: () => request<{ data: WorkflowRun[] }>("/api/runs"),
  runDetail: (runId: string) => request<RunDetail>(`/api/runs/${runId}`),
  auditEvents: () => request<{ data: AuditEvent[] }>("/api/audit-events?limit=8"),
  startRun: (templateSlug: string, boardId: string, triggeredBy = "dashboard-user") => request<RunDetail>("/api/runs", { method: "POST", body: JSON.stringify({ templateSlug, boardId, triggeredBy }) }),
  syncBoards: () => request<{ data: Array<{ boardId: string; boardName: string; status: string; itemCount: number; providerMode: string }> }>("/api/sync/boards", { method: "POST" }),
  boardItems: (boardId: string) => request<{ data: BoardItem[]; board: Board }>(`/api/boards/${boardId}/items`),
  upsertCredential: (body: { workspaceId: string; credentialLabel: string; scopes: string[]; expiresAt?: string }) => request<CredentialUpsertResponse>("/api/credentials", { method: "POST", body: JSON.stringify(body) }),
  deleteCredential: (id: string) => request<{ ok: true }>(`/api/credentials/${id}`, { method: "DELETE" }),
  startOAuthDeviceFlow: (workspaceId: string) => request<{ userCode: string; verificationUri: string; expiresIn: number }>(`/api/workspaces/${workspaceId}/oauth/device-code`, { method: "POST" }),
};
