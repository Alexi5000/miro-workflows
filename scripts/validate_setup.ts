import { existsSync } from "node:fs";
import { repository } from "../server/db/database.js";
import { seedBoards, seedCredentials, seedTemplates, seedWorkspaces } from "../shared/seedData.js";

async function main() {
  await repository.migrate();
  for (const workspace of seedWorkspaces) await repository.upsertWorkspace(workspace);
  for (const credential of seedCredentials) await repository.upsertCredential(credential);
  for (const board of seedBoards) await repository.upsertBoard(board);
  for (const template of seedTemplates) await repository.upsertTemplate(template);

  const requiredFiles = [
    "server/index.ts",
    "server/bootstrap.ts",
    "server/db/schema.sql",
    "server/db/database.ts",
    "server/services/workflowService.ts",
    "server/config.ts",
    "shared/types.ts",
    "shared/seedData.ts",
    "shared/contracts/index.ts",
    "docs/ARCHITECTURE.md",
    "docs/BENCHMARK.md",
    "docs/CONTRACTS.md",
    "docs/TESTING.md",
    "docs/MCP-TOOLS.md",
    "docs/SKILLS.md",
    "docs/OAUTH.md",
    "docs/adr/README.md",
    "docs/adr/0001-demo-first-default.md",
    "docs/adr/0006-three-agent-harness.md",
    "miro-custom-mcp/src/index.ts",
    "miro-custom-mcp/src/miro-api.ts",
    "miro-custom-mcp/src/fake-miro-api.ts",
    "miro-custom-mcp/src/tools/registry.ts",
    "src/agents/harness.ts",
    "src/agents/grader.ts",
    "src/agents/plateau.ts",
    "src/agents/planner.ts",
    "src/agents/generator.ts",
    "src/agents/evaluator.ts",
    "src/lib/router.ts",
    "src/App.tsx",
    "src/styles.css",
    "src/api.ts",
    "tests/ui/app-routes.test.tsx",
    "vitest.config.ts",
    "vitest.dom.config.ts",
    "scripts/bench.ts",
    "scripts/helpers/bench-server.ts",
    "notebooks/index.md",
    "notebooks/sprint-retro-template.md",
    "notebooks/board-design-patterns.md",
    "notebooks/harness-design-notes.md",
    "Dockerfile.web",
    "Dockerfile.api",
    "Dockerfile.mcp",
    "docker-compose.yml",
    ".agents/skills/miro-board-design/SKILL.md",
    ".agents/skills/mcp-tool-authoring/SKILL.md",
    ".agents/skills/fde-pillar-review/SKILL.md",
    "AGENTS.md",
  ];

  const missing = requiredFiles.filter((file) => !existsSync(file));
  if (missing.length > 0) {
    console.error("Missing required files:", missing.join(", "));
    process.exit(1);
  }

  const summary = repository.getSummary();
  if (summary.totals.templates < 3 || summary.totals.boards < 2) {
    console.error("Seed data is incomplete. Run `pnpm run seed`.");
    process.exit(1);
  }

  console.log("Miro Workflows validation passed.");
  console.log(JSON.stringify({ totals: summary.totals, integration: summary.integration }, null, 2));
}

main().catch((err) => {
  console.error("Validate failed:", err);
  process.exit(1);
});
