import type { Board, BoardItem, WorkflowTemplate } from "../../shared/types.js";

export interface WorkflowProviderResult {
  items: Omit<BoardItem, "id" | "createdAt">[];
  syncDurationMs: number;
  providerMode: "demo" | "miro";
}

export interface WorkflowProvider {
  executeTemplate(template: WorkflowTemplate, board: Board, runId: string): Promise<WorkflowProviderResult>;
  syncBoard(board: Board): Promise<{ status: string; itemCount: number; providerMode: "demo" | "miro" }>;
}

export class DemoMiroProvider implements WorkflowProvider {
  async executeTemplate(template: WorkflowTemplate, board: Board, runId: string): Promise<WorkflowProviderResult> {
    const start = performance.now();
    const items = template.steps.flatMap((step, index) => {
      const base = {
        runId,
        boardId: board.id,
        providerItemId: `demo-${runId}-${step.id}`,
        itemType: step.type,
        title: step.name,
        payload: {
          description: step.description,
          config: step.config,
          order: index + 1,
          board: board.providerBoardId,
          simulated: true,
        },
      };
      if (step.type === "review") {
        return [base, { ...base, providerItemId: `${base.providerItemId}-checklist`, itemType: "checklist", title: `${step.name} checklist` }];
      }
      return [base];
    });
    return { items, syncDurationMs: Math.round(performance.now() - start), providerMode: "demo" };
  }

  async syncBoard(_board: Board): Promise<{ status: string; itemCount: number; providerMode: "demo" | "miro" }> {
    return { status: "demo-sync-complete", itemCount: 0, providerMode: "demo" as const };
  }
}

export class MiroRestProvider extends DemoMiroProvider {
  constructor(private readonly token: string) { super(); }

  override async syncBoard(board: Board): Promise<{ status: string; itemCount: number; providerMode: "demo" | "miro" }> {
    if (!this.token) return super.syncBoard(board);
    const response = await fetch(`https://api.miro.com/v2/boards/${encodeURIComponent(board.providerBoardId)}/items?limit=10`, {
      headers: { Authorization: `Bearer ${this.token}`, Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Miro board sync failed with ${response.status}`);
    const data = await response.json() as { data?: unknown[] };
    return { status: "miro-sync-complete", itemCount: data.data?.length || 0, providerMode: "miro" as const };
  }
}
