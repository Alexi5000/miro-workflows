import { describe, it, expect } from "vitest";
import { DemoMiroProvider, MiroRestProvider } from "./miroProvider.js";
import type { Board, WorkflowTemplate } from "../../shared/types.js";

const board: Board = {
  id: "board-1",
  workspaceId: "ws-1",
  providerBoardId: "prov-1",
  name: "Test Board",
  description: "",
  viewLink: "",
  status: "active",
  lastSyncedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

const template: WorkflowTemplate = {
  id: "tpl-1",
  slug: "test",
  name: "Test",
  category: "x",
  description: "x",
  outcome: "x",
  defaultBoardId: "board-1",
  estimatedMinutes: 5,
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  steps: [
    { id: "s1", name: "Frame", type: "frame", description: "", config: {} },
    { id: "s2", name: "Note", type: "sticky_note", description: "", config: {} },
    { id: "s3", name: "Review", type: "review", description: "", config: {} },
  ],
};

describe("DemoMiroProvider", () => {
  it("emits one item per template step, plus a checklist for review steps", async () => {
    const provider = new DemoMiroProvider();
    const result = await provider.executeTemplate(template, board, "run-abc");
    // 3 steps + 1 checklist from the review step
    expect(result.items).toHaveLength(4);
    expect(result.items.find((i) => i.itemType === "checklist")).toBeDefined();
    expect(result.providerMode).toBe("demo");
    expect(result.syncDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("uses a per-run prefix for synthetic IDs", async () => {
    const provider = new DemoMiroProvider();
    const result = await provider.executeTemplate(template, board, "run-xyz");
    for (const item of result.items) {
      expect(item.providerItemId.startsWith("demo-run-xyz-")).toBe(true);
    }
  });

  it("returns a deterministic syncBoard result", async () => {
    const provider = new DemoMiroProvider();
    const result = await provider.syncBoard(board);
    expect(result.status).toBe("demo-sync-complete");
    expect(result.itemCount).toBe(0);
    expect(result.providerMode).toBe("demo");
  });
});

describe("MiroRestProvider", () => {
  it("falls back to demo sync when no token is configured", async () => {
    const provider = new MiroRestProvider("");
    const result = await provider.syncBoard(board);
    expect(result.providerMode).toBe("demo");
  });

  it("surfaces Miro API failures with the upstream status", async () => {
    const original = global.fetch;
    global.fetch = (async () => new Response("nope", { status: 500 })) as unknown as typeof fetch;
    try {
      const provider = new MiroRestProvider("test-token");
      await expect(provider.syncBoard(board)).rejects.toThrow(/500/);
    } finally {
      global.fetch = original;
    }
  });

  it("counts items returned from a real Miro response", async () => {
    const original = global.fetch;
    global.fetch = (async () =>
      new Response(JSON.stringify({ data: [{ id: "a" }, { id: "b" }, { id: "c" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as unknown as typeof fetch;
    try {
      const provider = new MiroRestProvider("test-token");
      const result = await provider.syncBoard(board);
      expect(result.providerMode).toBe("miro");
      expect(result.itemCount).toBe(3);
    } finally {
      global.fetch = original;
    }
  });
});
