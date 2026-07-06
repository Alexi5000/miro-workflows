#!/usr/bin/env tsx
/**
 * scripts/build_contracts.ts — Generate JSON-Schema artifacts from zod contracts.
 * Run via `pnpm run contracts:build`.
 *
 * Exports `buildContractArtifacts(targetDir)` so unit tests can target an
 * isolated directory and avoid touching committed artifacts.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSprintJsonSchema, buildAuditJsonSchema } from "../shared/contracts/json-schema.js";

export function buildContractArtifacts(targetDir: string): { sprint: string; audit: string } {
  mkdirSync(targetDir, { recursive: true });
  const sprint = buildSprintJsonSchema();
  const audit = buildAuditJsonSchema();
  const sprintPath = resolve(targetDir, "sprint.contract.v1.json");
  const auditPath = resolve(targetDir, "audit.contract.v1.json");
  writeFileSync(sprintPath, JSON.stringify(sprint, null, 2) + "\n");
  writeFileSync(auditPath, JSON.stringify(audit, null, 2) + "\n");
  return { sprint: sprintPath, audit: auditPath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const here = dirname(fileURLToPath(import.meta.url));
  const contractsDir = resolve(here, "..", "shared", "contracts");
  const written = buildContractArtifacts(contractsDir);
  console.log("Wrote " + written.sprint + " and " + written.audit);
}
