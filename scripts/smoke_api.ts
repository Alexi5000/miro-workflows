import { repository } from "../server/db/database.js";
import { startWorkflowRun, syncBoards } from "../server/services/workflowService.js";

repository.migrate();
const run = await startWorkflowRun({ templateSlug: "prd-to-board", triggeredBy: "smoke-test" });
const sync = await syncBoards();

if (!run || run.status !== "completed") throw new Error("Workflow smoke run failed.");
if (sync.length === 0) throw new Error("Board sync smoke test failed.");

console.log("Smoke test passed.");
console.log(JSON.stringify({ runId: run.id, createdItems: run.metrics.createdItems, syncedBoards: sync.length }, null, 2));
