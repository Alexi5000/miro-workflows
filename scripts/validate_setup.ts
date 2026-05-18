import { existsSync } from "node:fs";
import { repository } from "../server/db/database.js";

repository.migrate();

const requiredFiles = [
  "server/index.ts",
  "server/db/schema.sql",
  "server/db/database.ts",
  "server/services/workflowService.ts",
  "shared/types.ts",
  "shared/seedData.ts",
  "docs/ARCHITECTURE.md",
  "miro-custom-mcp/src/index.ts",
];

const missing = requiredFiles.filter((file) => !existsSync(file));
const summary = repository.getSummary();

if (missing.length > 0) {
  console.error("Missing required files:", missing.join(", "));
  process.exit(1);
}

if (summary.totals.templates < 3 || summary.totals.boards < 2) {
  console.error("Seed data is incomplete. Run `pnpm run seed`.");
  process.exit(1);
}

console.log("Miro Workflows validation passed.");
console.log(JSON.stringify({ totals: summary.totals, integration: summary.integration }, null, 2));
