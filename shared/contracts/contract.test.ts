import { describe, it, expect } from "vitest";
import {
  parseContract,
  listContractVersions,
  SPRINT_CONTRACT_VERSION,
  sprintContractV1,
  auditEventContractV1,
} from "./index.js";

describe("sprint/audit/run_result contracts", () => {
  it("exposes a single canonical version for now", () => {
    expect(listContractVersions("sprint")).toEqual([SPRINT_CONTRACT_VERSION]);
    expect(listContractVersions("audit")).toEqual(["1.0.0"]);
    expect(listContractVersions("run_result")).toEqual(["1.0.0"]);
  });

  it("parses a minimal valid sprint payload", () => {
    const result = parseContract<unknown>("sprint", { templateSlug: "prd-to-board" });
    expect(result.version).toBe("1.0.0");
    expect((result.value as { triggeredBy: string }).triggeredBy).toBe("local-user");
  });

  it("rejects an empty templateSlug", () => {
    expect(() => parseContract("sprint", { templateSlug: "" })).toThrow(/validation failed/);
  });

  it("rejects an unknown contract version", () => {
    expect(() => parseContract("sprint", { templateSlug: "x" }, { version: "9.9.9" })).toThrow(/Unknown contract version/);
  });

  it("validates an audit event payload", () => {
    const result = auditEventContractV1.safeParse({
      workspaceId: "ws-1",
      runId: null,
      eventType: "demo.event",
      severity: "info",
      message: "hello",
      metadata: {},
    });
    expect(result.success).toBe(true);
  });

  it("exposes a stable sprintContractV1 schema", () => {
    // shape pinning — bump deliberately
    expect(Object.keys(sprintContractV1.shape)).toEqual(["templateSlug", "boardId", "triggeredBy", "parameters"]);
  });
});
