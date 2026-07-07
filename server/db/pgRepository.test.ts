import { describe, it, expect } from "vitest";
import { PgRepository } from "./pgRepository.js";

/**
 * Coverage for the v1.1 Postgres adapter. v1.1 ships a stub for every
 * read method (the live migration lands in v1.1.1). These tests assert
 * the public contract is implemented (i.e. the class compiles and the
 * summary endpoint returns a sentinel).
 */
describe("PgRepository (v1.1 stub)", () => {
  it("constructs without throwing", () => {
    const repo = new PgRepository("postgres://user:pass@localhost:5432/db");
    expect(repo).toBeInstanceOf(PgRepository);
  });

  it("getSummary returns a Postgres-sentinel DashboardSummary", () => {
    const repo = new PgRepository("postgres://user:pass@localhost:5432/db");
    const summary = repo.getSummary();
    expect(summary.totals.workspaces).toBe(0);
    expect(summary.integration.status).toMatch(/Postgres backend not yet wired/);
  });

  it("close is a no-op (no connection established in v1.1)", async () => {
    const repo = new PgRepository("postgres://user:pass@localhost:5432/db");
    await expect(repo.close()).resolves.toBeUndefined();
  });

  it("every Repository method exists (TypeScript-level contract check)", () => {
    const repo = new PgRepository("postgres://user:pass@localhost:5432/db");
    // List of v1.1 method names; if any is missing the cast below will fail
    // type-check.
    const methodNames: Array<keyof PgRepository> = [
      "migrate", "reset", "close",
      "upsertWorkspace", "listWorkspaces",
      "upsertCredential", "listCredentials", "listCredentialsByWorkspace",
      "upsertBoard", "listBoards", "getBoard", "updateBoardSync",
      "upsertTemplate", "listTemplates", "getTemplateBySlug", "getTemplateById",
      "createRun", "listRuns", "getRun",
      "createBoardItem", "listBoardItems",
      "createAuditEvent", "listAuditEvents",
      "createAuthToken", "findAuthTokenByPrefix", "listAuthTokensByWorkspace",
      "touchAuthToken", "revokeAuthToken",
      "recordWebhookDelivery",
      "upsertDeviceFlow", "getDeviceFlow", "updateDeviceFlow",
      "getSummary",
    ];
    for (const name of methodNames) {
      expect(typeof (repo as unknown as Record<string, unknown>)[name]).toBe("function");
    }
  });
});
