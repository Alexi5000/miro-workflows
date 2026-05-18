import { repository } from "./database.js";
import { seedBoards, seedCredentials, seedTemplates, seedWorkspaces } from "../../shared/seedData.js";

repository.migrate();
for (const workspace of seedWorkspaces) repository.upsertWorkspace(workspace);
for (const credential of seedCredentials) repository.upsertCredential(credential);
for (const board of seedBoards) repository.upsertBoard(board);
for (const template of seedTemplates) repository.upsertTemplate(template);

if (repository.listAuditEvents({ limit: 1 }).length === 0) {
  repository.createAuditEvent({
    workspaceId: seedWorkspaces[0].id,
    runId: null,
    eventType: "system.seeded",
    severity: "info",
    message: "Seeded Miro Workflows demo workspace, boards, templates, and credential metadata.",
    metadata: { templates: seedTemplates.length, boards: seedBoards.length },
  });
}

console.log(`Seeded ${seedWorkspaces.length} workspace, ${seedBoards.length} boards, and ${seedTemplates.length} workflow templates.`);
