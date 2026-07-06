import { describe, it, expect } from "vitest";
import { FakeMiroApiClient } from "../src/fake-miro-api.js";

describe("FakeMiroApiClient — demo mode safety net", () => {
  it("lists, creates, and deletes boards", async () => {
    const c = new FakeMiroApiClient();
    expect((await c.listBoards()).data).toHaveLength(0);
    const a = await c.createBoard({ name: "Sprint 23" });
    const b = await c.createBoard({ name: "Product Discovery" });
    expect((await c.listBoards()).data).toHaveLength(2);
    await c.updateBoard(a.id, { name: "Sprint 23 — Renamed" });
    expect((await c.getBoard(a.id)).name).toMatch(/Renamed/);
    await c.deleteBoard(b.id);
    expect((await c.listBoards()).data.map((x) => x.id)).toEqual([a.id]);
  });

  it("stores items per board and updates/deletes them", async () => {
    const c = new FakeMiroApiClient();
    const board = await c.createBoard({ name: "Demo" });
    const s = await c.create_sticky_note(board.id, { content: "hello", x: 0, y: 0 });
    const t = await c.create_text(board.id, { content: "title", x: 10, y: 10 });
    const list = await c.get_board_items(board.id);
    expect(list.data.map((i) => i.type).sort()).toEqual(["sticky_note", "text"]);
    const updated = await c.update_item(board.id, s.id, { position: { x: 50, y: 50 } });
    expect((updated as { position: { x: number } }).position.x).toBe(50);
    await c.delete_item(board.id, t.id);
    expect((await c.get_board_items(board.id)).data).toHaveLength(1);
  });

  it("returns board members deterministically", async () => {
    const c = new FakeMiroApiClient();
    const board = await c.createBoard({ name: "Demo" });
    const res = await c.listBoardMembers(board.id);
    expect(res.data[0].role).toBe("owner");
  });
});
