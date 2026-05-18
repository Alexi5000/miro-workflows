import type { AuditEvent, Board, DashboardSummary, RunDetail, WorkflowRun, WorkflowTemplate, Workspace } from "../shared/types";

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

export const api = {
  summary: () => request<DashboardSummary>("/api/summary"),
  templates: () => request<{ data: WorkflowTemplate[] }>("/api/templates"),
  boards: () => request<{ data: Board[] }>("/api/boards"),
  workspaces: () => request<{ data: Workspace[] }>("/api/workspaces"),
  runs: () => request<{ data: WorkflowRun[] }>("/api/runs"),
  runDetail: (runId: string) => request<RunDetail>(`/api/runs/${runId}`),
  auditEvents: () => request<{ data: AuditEvent[] }>("/api/audit-events?limit=8"),
  startRun: (templateSlug: string, boardId: string, triggeredBy = "dashboard-user") => request<RunDetail>("/api/runs", { method: "POST", body: JSON.stringify({ templateSlug, boardId, triggeredBy }) }),
  syncBoards: () => request<{ data: Array<{ boardId: string; boardName: string; status: string; itemCount: number; providerMode: string }> }>("/api/sync/boards", { method: "POST" }),
};
