import { describe, it, expect } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildContractArtifacts } from "./build_contracts.js";

describe("scripts/build_contracts.ts", () => {
  it("writes sprint + audit JSON-Schema artifacts to a target dir", () => {
    const dir = mkdtempSync(join(tmpdir(), "miro-contracts-"));
    const written = buildContractArtifacts(dir);

    expect(existsSync(written.sprint)).toBe(true);
    expect(existsSync(written.audit)).toBe(true);

    const sprint = JSON.parse(readFileSync(written.sprint, "utf-8"));
    const audit = JSON.parse(readFileSync(written.audit, "utf-8"));
    expect(sprint.$schema).toMatch(/draft\/2020-12/);
    expect(audit.properties.severity.enum).toEqual(["info", "warning", "error"]);

    rmSync(dir, { recursive: true, force: true });
  });
});
