import { repository } from "./database.js";
import { seedBoards, seedCredentials, seedTemplates, seedWorkspaces } from "../../shared/seedData.js";

async function main() {
  await repository.migrate();
  for (const workspace of seedWorkspaces) await repository.upsertWorkspace(workspace);
  for (const credential of seedCredentials) await repository.upsertCredential(credential);
  for (const board of seedBoards) await repository.upsertBoard(board);
  for (const template of seedTemplates) await repository.upsertTemplate(template);

  if (repository.listAuditEvents({ limit: 1 }).length === 0) {
    await repository.createAuditEvent({
      workspaceId: seedWorkspaces[0].id,
      runId: null,
      eventType: "system.seeded",
      severity: "info",
      message: "Seeded Miro Workflows demo workspace, boards, templates, and credential metadata.",
      metadata: { templates: seedTemplates.length, boards: seedBoards.length },
    });
  }

  console.log(`Seeded ${seedWorkspaces.length} workspace, ${seedBoards.length} boards, and ${seedTemplates.length} workflow templates.`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
