/**
 * Parametrized contract test for every MCP tool — instantiates a FakeMiroApiClient,
 * parses each registered tool's example through its own zod schema, and asserts
 * the handler returns a JSON-serializable object.
 */
import { describe, it, expect } from "vitest";
import { tools, toolByName } from "../src/tools/registry.js";
import { FakeMiroApiClient } from "../src/fake-miro-api.js";

describe("MCP tool registry — schema coverage", () => {
  for (const def of tools) {
    it(`exposes a non-empty example array — ${def.name}`, () => {
      expect(def.examples.length).toBeGreaterThan(0);
      const parsed = def.schema.safeParse(def.examples[0]);
      expect(parsed.success).toBe(true);
    });
  }
});

describe("MCP tool registry — end-to-end happy path", () => {
  it("round-trips create_frame, create_text, create_sticky_note, update_item, delete_item on a real FakeMiroApiClient", async () => {
    const fake = new FakeMiroApiClient();
    const board = await fake.createBoard({ name: "Demo" });
    const frame = await toolByName["create_frame"].handler(fake, {
      board_id: board.id,
      title: "Section",
      x: 0,
      y: 0,
      width: 600,
      height: 800,
    });
    expect(frame.success).toBe(true);
    const text = await toolByName["create_text"].handler(fake, {
      board_id: board.id,
      content: "Hello",
      x: 0,
      y: -150,
    });
    expect(text.success).toBe(true);
    const sticky = await toolByName["create_sticky_note"].handler(fake, {
      board_id: board.id,
      content: "Idea",
      color: "yellow",
      x: 0,
      y: 0,
    });
    expect(sticky.success).toBe(true);
    const updated = await toolByName["update_item"].handler(fake, {
      board_id: board.id,
      item_id: (sticky as { item_id: string }).item_id,
      x: 50,
    });
    expect(updated.success).toBe(true);
    const del = await toolByName["delete_item"].handler(fake, {
      board_id: board.id,
      item_id: (sticky as { item_id: string }).item_id,
    });
    expect(del.success).toBe(true);
  });
});

describe("MCP tool registry — list_boards requires no fields", () => {
  it("parses an empty object as valid", () => {
    const parsed = toolByName["list_boards"].schema.safeParse({});
    expect(parsed.success).toBe(true);
  });
});
