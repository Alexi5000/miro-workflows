/**
 * MCP tool registry — the single source of truth for what the server exposes.
 *
 * Adding a tool:
 *  1. Create `miro-custom-mcp/src/tools/<name>.ts` exporting
 *     `<name>_schema`, `<name>_examples`, and an async handler.
 *  2. Append an entry below.
 *  3. Add a row in `miro-custom-mcp/tests/tools.contract.test.ts`.
 */
import type { z } from "zod";
import type { MiroApiClientLike } from "../miro-api.js";
import { create_card_schema, create_card, create_card_examples } from "./create_card.js";
import { create_connector_schema, create_connector, create_connector_examples } from "./create_connector.js";
import { create_frame_schema, create_frame, create_frame_examples } from "./create_frame.js";
import { create_image_schema, create_image, create_image_examples } from "./create_image.js";
import { create_shape_schema, create_shape, create_shape_examples } from "./create_shape.js";
import { create_sticky_note_schema, create_sticky_note, create_sticky_note_examples } from "./create_sticky_note.js";
import { create_text_schema, create_text, create_text_examples } from "./create_text.js";
import { delete_item_schema, delete_item, delete_item_examples } from "./delete_item.js";
import { get_board_items_schema, get_board_items, get_board_items_examples } from "./get_board_items.js";
import { update_item_schema, update_item, update_item_examples } from "./update_item.js";
import {
  batch_create_items_schema,
  batch_create_items,
  batch_create_items_examples,
} from "./batch_create_items.js";
import {
  create_board_schema,
  create_board,
  create_board_examples,
  delete_board_schema,
  delete_board,
  delete_board_examples,
  get_board_schema,
  get_board,
  get_board_examples,
  list_boards_schema,
  list_boards,
  list_boards_examples,
  list_board_members_schema,
  list_board_members,
  list_board_members_examples,
  list_subscriptions_schema,
  list_subscriptions,
  list_subscriptions_examples,
  search_items_schema,
  search_items,
  search_items_examples,
  export_board_schema,
  export_board,
  export_board_examples,
  update_board_schema,
  update_board,
  update_board_examples,
} from "./board_tools.js";

export interface McpTool<T extends z.ZodTypeAny> {
  name: string;
  description: string;
  schema: T;
  examples: Array<z.infer<T>>;
  handler: (client: MiroApiClientLike, params: z.infer<T>) => Promise<unknown>;
}

function tool<S extends z.ZodTypeAny>(def: {
  name: string;
  description: string;
  schema: S;
  examples: Array<z.infer<S>>;
  handler: (client: MiroApiClientLike, params: z.infer<S>) => Promise<unknown>;
}): McpTool<S> {
  return def;
}

type AnyTool = McpTool<z.ZodTypeAny>;

function asAny<S extends z.ZodTypeAny>(def: McpTool<S>): AnyTool {
  return def as unknown as AnyTool;
}

const rawTools: AnyTool[] = [
  asAny(tool({ name: "create_sticky_note", description: "Create a sticky note with precise positioning, color, and size.", schema: create_sticky_note_schema, examples: create_sticky_note_examples, handler: create_sticky_note })),
  asAny(tool({ name: "create_shape", description: "Create a shape (rectangle, circle, triangle, etc.) with custom fill and border colors.", schema: create_shape_schema, examples: create_shape_examples, handler: create_shape })),
  asAny(tool({ name: "create_frame", description: "Create a frame to organize and group content.", schema: create_frame_schema, examples: create_frame_examples, handler: create_frame })),
  asAny(tool({ name: "create_text", description: "Create a text box with font size, color, and alignment control.", schema: create_text_schema, examples: create_text_examples, handler: create_text })),
  asAny(tool({ name: "create_card", description: "Create a Kanban-style card with title, description, and color.", schema: create_card_schema, examples: create_card_examples, handler: create_card })),
  asAny(tool({ name: "create_connector", description: "Create a connector line between two items.", schema: create_connector_schema, examples: create_connector_examples, handler: create_connector })),
  asAny(tool({ name: "create_image", description: "Create an image item from a URL or base64 payload.", schema: create_image_schema, examples: create_image_examples, handler: create_image })),
  asAny(tool({ name: "get_board_items", description: "Retrieve items from a board with optional type filter.", schema: get_board_items_schema, examples: get_board_items_examples, handler: get_board_items })),
  asAny(tool({ name: "search_items", description: "List items on a board, optionally filtered by type.", schema: search_items_schema, examples: search_items_examples, handler: search_items })),
  asAny(tool({ name: "update_item", description: "Update an existing item's position, size, color, or content.", schema: update_item_schema, examples: update_item_examples, handler: update_item })),
  asAny(tool({ name: "delete_item", description: "Delete an item from the board.", schema: delete_item_schema, examples: delete_item_examples, handler: delete_item })),
  asAny(tool({ name: "list_boards", description: "List all boards visible to the authenticated user.", schema: list_boards_schema, examples: list_boards_examples, handler: list_boards })),
  asAny(tool({ name: "create_board", description: "Create a new Miro board.", schema: create_board_schema, examples: create_board_examples, handler: create_board })),
  asAny(tool({ name: "get_board", description: "Get a board by id.", schema: get_board_schema, examples: get_board_examples, handler: get_board })),
  asAny(tool({ name: "update_board", description: "Update a board's name or description.", schema: update_board_schema, examples: update_board_examples, handler: update_board })),
  asAny(tool({ name: "delete_board", description: "Permanently delete a board.", schema: delete_board_schema, examples: delete_board_examples, handler: delete_board })),
  asAny(tool({ name: "list_board_members", description: "List members of a board.", schema: list_board_members_schema, examples: list_board_members_examples, handler: list_board_members })),
  asAny(tool({ name: "list_subscriptions", description: "List webhook subscriptions on a board.", schema: list_subscriptions_schema, examples: list_subscriptions_examples, handler: list_subscriptions })),
  asAny(tool({ name: "export_board", description: "Return a printable summary of a board's items, grouped by type.", schema: export_board_schema, examples: export_board_examples, handler: export_board })),
  asAny(tool({ name: "batch_create_items", description: "Create many items sequentially with rate-limit-aware backoff.", schema: batch_create_items_schema, examples: batch_create_items_examples, handler: batch_create_items })),
];

export const tools: AnyTool[] = rawTools;
export const toolByName: Record<string, AnyTool> = Object.fromEntries(tools.map((t) => [t.name, t]));
export type ToolName = (typeof tools)[number]["name"];
