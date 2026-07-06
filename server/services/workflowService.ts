import type { WorkflowRunMetrics } from "../../shared/types.js";
import { parseContract, type SprintContractV1 } from "../../shared/contracts/index.js";
import { getConfig } from "../config.js";
import { repository } from "../db/database.js";
import { DemoMiroProvider, MiroRestProvider, type WorkflowProvider } from "../providers/miroProvider.js";

const config = getConfig();
const provider: WorkflowProvider = config.providerMode === "miro" ? new MiroRestProvider(config.miroAccessToken) : new DemoMiroProvider();

export async function startWorkflowRun(raw: unknown) {
  let parsed;
  try {
    parsed = parseContract<SprintContractV1>("sprint", raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ResponseError(400, `Invalid sprint contract — ${message}`);
  }
  const input = parsed.value;
  const template = repository.getTemplateBySlug(input.templateSlug);
  if (!template) throw new ResponseError(404, `Unknown workflow template: ${input.templateSlug}`);
  const board = repository.getBoard(input.boardId || template.defaultBoardId);
  if (!board) throw new ResponseError(404, `Unknown board: ${input.boardId || template.defaultBoardId}`);

  const runId = `run-${crypto.randomUUID()}`;
  const providerResult = await provider.executeTemplate(template, board, runId);
  const metrics: WorkflowRunMetrics = {
    totalSteps: template.steps.length,
    completedSteps: template.steps.length,
    createdItems: providerResult.items.length,
    syncDurationMs: providerResult.syncDurationMs,
    riskScore: Math.max(1, Math.min(10, 11 - template.steps.length)),
  };

  const run = await repository.createRun({
    templateId: template.id,
    boardId: board.id,
    status: "completed",
    triggeredBy: input.triggeredBy,
    summary: `Executed ${template.name} against ${board.name} in ${providerResult.providerMode} mode and prepared ${providerResult.items.length} board artifacts.`,
    metrics,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
  });

  for (const item of providerResult.items) await repository.createBoardItem({ ...item, runId: run.id });
  await repository.createAuditEvent({
    workspaceId: board.workspaceId,
    runId: run.id,
    eventType: "workflow.completed",
    severity: "info",
    message: `Workflow ${template.name} completed for board ${board.name}.`,
    metadata: { providerMode: providerResult.providerMode, createdItems: providerResult.items.length, templateSlug: template.slug },
  });
  return repository.getRun(run.id);
}

export async function syncBoards() {
  const boards = repository.listBoards();
  const results = [];
  for (const board of boards) {
    const result = await provider.syncBoard(board);
    repository.updateBoardSync(board.id);
    repository.createAuditEvent({
      workspaceId: board.workspaceId,
      runId: null,
      eventType: "board.synced",
      severity: "info",
      message: `Synced board ${board.name} with status ${result.status}.`,
      metadata: result,
    });
    results.push({ boardId: board.id, boardName: board.name, ...result });
  }
  return results;
}

export class ResponseError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
