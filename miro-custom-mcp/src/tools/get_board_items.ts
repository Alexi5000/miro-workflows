// file: miro-custom-mcp/src/tools/get_board_items.ts
// description: Tool to retrieve board items with filtering
// reference: miro-api.ts

import { z } from "zod";
import type { MiroApiClientLike } from "../miro-api.js";

export const get_board_items_schema = z.object({
  board_id: z.string().describe("The Miro board ID"),
  type: z
    .string()
    .optional()
    .describe("Filter by item type (e.g., 'sticky_note', 'shape', 'frame', 'card')"),
  limit: z.number().optional().describe("Maximum number of items to return (default: 50)"),
});

export const get_board_items_examples: Array<z.infer<typeof get_board_items_schema>> = [
  { board_id: "demo-board", type: "sticky_note", limit: 25 },
];

export async function get_board_items(
  client: MiroApiClientLike,
  params: z.infer<typeof get_board_items_schema>
) {
  const result = await client.get_board_items(params.board_id, {
    type: params.type,
    limit: params.limit,
  });

  return {
    success: true,
    total_items: result.data.length,
    items: result.data,
    message: `Retrieved ${result.data.length} items from board ${params.board_id}`,
  };
}
