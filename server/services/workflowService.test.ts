import { describe, it, expect, beforeAll } from "vitest";
import { repository } from "../db/database.js";
import { seedBoards, seedCredentials, seedTemplates, seedWorkspaces } from "../../shared/seedData.js";
import { ResponseError, startWorkflowRun, syncBoards } from "./workflowService.js";

beforeAll(async () => {
  await repository.migrate();
  for (const workspace of seedWorkspaces) await repository.upsertWorkspace(workspace);
  for (const credential of seedCredentials) await repository.upsertCredential(credential);
  for (const board of seedBoards) await repository.upsertBoard(board);
  for (const template of seedTemplates) await repository.upsertTemplate(template);
});

describe("startWorkflowRun", () => {
  it("executes a known template in demo mode and records an audit event", async () => {
    const detail = await startWorkflowRun({ templateSlug: "prd-to-board", triggeredBy: "vitest" });
    expect(detail).toBeTruthy();
    expect(detail?.status).toBe("completed");
    expect(detail?.metrics.createdItems).toBeGreaterThan(0);
    const audit = repository.listAuditEvents({ runId: detail!.id });
    expect(audit.some((e) => e.eventType === "workflow.completed")).toBe(true);
  });

  it("throws a 400 ResponseError on invalid contract payload", async () => {
    await expect(startWorkflowRun({})).rejects.toBeInstanceOf(ResponseError);
    try {
      await startWorkflowRun({});
    } catch (err) {
      expect(err).toBeInstanceOf(ResponseError);
      expect((err as ResponseError).status).toBe(400);
    }
  });

  it("throws a 404 ResponseError on unknown template", async () => {
    try {
      await startWorkflowRun({ templateSlug: "does-not-exist" });
      throw new Error("expected to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ResponseError);
      expect((err as ResponseError).status).toBe(404);
    }
  });
});

describe("syncBoards", () => {
  it("emits one board.synced audit event per board", async () => {
    const results = await syncBoards();
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.status && r.providerMode)).toBe(true);
    const recent = repository.listAuditEvents({ limit: 50 });
    expect(recent.filter((e) => e.eventType === "board.synced").length).toBeGreaterThan(0);
  });
});
