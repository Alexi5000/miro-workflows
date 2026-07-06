import { describe, it, expect } from "vitest";
import {
  startRunContractV1,
  upsertCredentialContractV1,
  listRunsQueryContractV1,
  issueAuthTokenContractV1,
  parseOrThrow,
} from "./api.contracts.v1.js";

describe("per-endpoint request contracts (v1)", () => {
  it("startRunContractV1 accepts a valid sprint", () => {
    const r = startRunContractV1.safeParse({ templateSlug: "prd-to-board" });
    expect(r.success).toBe(true);
  });

  it("startRunContractV1 rejects an empty templateSlug", () => {
    expect(startRunContractV1.safeParse({ templateSlug: "" }).success).toBe(false);
  });

  it("upsertCredentialContractV1 requires a workspaceId", () => {
    expect(upsertCredentialContractV1.safeParse({ credentialLabel: "x" }).success).toBe(false);
  });

  it("upsertCredentialContractV1 rejects a workspaceId with spaces", () => {
    expect(upsertCredentialContractV1.safeParse({ workspaceId: "has space" }).success).toBe(false);
  });

  it("listRunsQueryContractV1 coerces a string limit", () => {
    const r = listRunsQueryContractV1.safeParse({ limit: "50" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(50);
  });

  it("listRunsQueryContractV1 caps the limit at 200", () => {
    expect(listRunsQueryContractV1.safeParse({ limit: 9999 }).success).toBe(false);
  });

  it("issueAuthTokenContractV1 requires at least one scope", () => {
    expect(issueAuthTokenContractV1.safeParse({ workspaceId: "ws-1", scopes: [] }).success).toBe(false);
  });

  it("parseOrThrow returns the parsed value on success", () => {
    const out = parseOrThrow(startRunContractV1, { templateSlug: "ok" }, "POST /api/runs");
    expect(out.templateSlug).toBe("ok");
  });

  it("parseOrThrow throws with .issues on failure", () => {
    try {
      parseOrThrow(startRunContractV1, {}, "POST /api/runs");
      throw new Error("expected to throw");
    } catch (err) {
      const e = err as Error & { issues?: unknown };
      expect(e.issues).toBeDefined();
    }
  });
});
