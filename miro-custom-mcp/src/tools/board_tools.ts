import { z } from "zod";
import type { MiroApiClientLike } from "../miro-api.js";

// ---------- list_boards ----------
export const list_boards_schema = z.object({
  limit: z.number().int().min(1).max(50).optional().describe("Page size, 1–50"),
  cursor: z.string().optional().describe("Pagination cursor from a previous response"),
});

export const list_boards_examples: Array<z.infer<typeof list_boards_schema>> = [{ limit: 25 }];

export async function list_boards(client: MiroApiClientLike, params: z.infer<typeof list_boards_schema>) {
  const res = await client.listBoards({ limit: params.limit, cursor: params.cursor });
  return { success: true, total: res.data.length, data: res.data, cursor: res.cursor || null };
}

// ---------- create_board ----------
export const create_board_schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  policy: z.record(z.string(), z.unknown()).optional(),
});

export const create_board_examples: Array<z.infer<typeof create_board_schema>> = [
  { name: "Sprint 23 — Architecture Review", description: "Auto-generated board for the Q3 sprint review." },
];

export async function create_board(client: MiroApiClientLike, params: z.infer<typeof create_board_schema>) {
  const board = await client.createBoard(params);
  return { success: true, board_id: board.id, data: board };
}

// ---------- get_board ----------
export const get_board_schema = z.object({ board_id: z.string().min(1) });
export const get_board_examples: Array<z.infer<typeof get_board_schema>> = [{ board_id: "demo-board" }];

export async function get_board(client: MiroApiClientLike, params: z.infer<typeof get_board_schema>) {
  const board = await client.getBoard(params.board_id);
  return { success: true, data: board };
}

// ---------- update_board ----------
export const update_board_schema = z.object({
  board_id: z.string().min(1),
  name: z.string().optional(),
  description: z.string().optional(),
});
export const update_board_examples: Array<z.infer<typeof update_board_schema>> = [
  { board_id: "demo-board", name: "Renamed Board" },
];

export async function update_board(client: MiroApiClientLike, params: z.infer<typeof update_board_schema>) {
  const { board_id, ...patch } = params;
  const board = await client.updateBoard(board_id, patch);
  return { success: true, data: board };
}

// ---------- delete_board ----------
export const delete_board_schema = z.object({ board_id: z.string().min(1) });
export const delete_board_examples: Array<z.infer<typeof delete_board_schema>> = [{ board_id: "demo-board" }];

export async function delete_board(client: MiroApiClientLike, params: z.infer<typeof delete_board_schema>) {
  await client.deleteBoard(params.board_id);
  return { success: true, message: `Deleted board ${params.board_id}` };
}

// ---------- list_board_members ----------
export const list_board_members_schema = z.object({ board_id: z.string().min(1) });
export const list_board_members_examples: Array<z.infer<typeof list_board_members_schema>> = [{ board_id: "demo-board" }];

export async function list_board_members(client: MiroApiClientLike, params: z.infer<typeof list_board_members_schema>) {
  const res = await client.listBoardMembers(params.board_id);
  return { success: true, total: res.data.length, members: res.data };
}

// ---------- list_subscriptions ----------
export const list_subscriptions_schema = z.object({ board_id: z.string().min(1) });
export const list_subscriptions_examples: Array<z.infer<typeof list_subscriptions_schema>> = [{ board_id: "demo-board" }];

export async function list_subscriptions(client: MiroApiClientLike, params: z.infer<typeof list_subscriptions_schema>) {
  const res = await client.listSubscriptions(params.board_id);
  return { success: true, total: res.data.length, subscriptions: res.data };
}

// ---------- search_items ----------
export const search_items_schema = z.object({
  board_id: z.string().min(1),
  type: z.enum(["sticky_note", "shape", "text", "card", "frame", "image", "connector"]).optional(),
  query: z.string().optional().describe("Free-text query against the cached description"),
  limit: z.number().int().min(1).max(50).optional().default(25),
});
export const search_items_examples: Array<z.infer<typeof search_items_schema>> = [
  { board_id: "demo-board", type: "sticky_note", limit: 10 },
];

export async function search_items(client: MiroApiClientLike, params: z.infer<typeof search_items_schema>) {
  const res = await client.get_board_items(params.board_id, { type: params.type, limit: params.limit });
  const filtered = params.query
    ? res.data.filter((it) => JSON.stringify(it.data ?? "").toLowerCase().includes(params.query!.toLowerCase()))
    : res.data;
  return { success: true, total: filtered.length, items: filtered };
}

// ---------- export_board ----------
export const export_board_schema = z.object({
  board_id: z.string().min(1),
  include_connectors: z.boolean().default(true),
});
export const export_board_examples: Array<z.infer<typeof export_board_schema>> = [{ board_id: "demo-board", include_connectors: true }];

export async function export_board(client: MiroApiClientLike, params: z.infer<typeof export_board_schema>) {
  const items = await client.get_board_items(params.board_id, { limit: 50 });
  const byType: Record<string, unknown[]> = {};
  for (const it of items.data) {
    const type = String((it as { type?: string }).type ?? "unknown");
    (byType[type] ??= []).push({ id: it.id, data: it.data });
  }
  return {
    success: true,
    board_id: params.board_id,
    generatedAt: new Date().toISOString(),
    totals: { all: items.data.length, byType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, v.length])) },
    items: byType,
    includeConnectors: params.include_connectors,
  };
}
