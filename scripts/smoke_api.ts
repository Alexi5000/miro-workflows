import { repository } from "../server/db/database.js";
import { startWorkflowRun, syncBoards } from "../server/services/workflowService.js";
import { seedBoards, seedCredentials, seedTemplates, seedWorkspaces } from "../shared/seedData.js";

async function main() {
  await repository.migrate();
  for (const workspace of seedWorkspaces) await repository.upsertWorkspace(workspace);
  for (const credential of seedCredentials) await repository.upsertCredential(credential);
  for (const board of seedBoards) await repository.upsertBoard(board);
  for (const template of seedTemplates) await repository.upsertTemplate(template);

  const run = await startWorkflowRun({ templateSlug: "prd-to-board", triggeredBy: "smoke-test" });
  const sync = await syncBoards();

  if (!run || run.status !== "completed") throw new Error("Workflow smoke run failed.");
  if (sync.length === 0) throw new Error("Board sync smoke test failed.");

  console.log("Smoke test passed.");
  console.log(JSON.stringify({ runId: run.id, createdItems: run.metrics.createdItems, syncedBoards: sync.length }, null, 2));
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
