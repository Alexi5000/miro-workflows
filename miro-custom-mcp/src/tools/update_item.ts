// file: miro-custom-mcp/src/tools/update_item.ts
// description: Tool to update existing items (move, resize, restyle)
// reference: miro-api.ts

import { z } from "zod";
import type { MiroApiClientLike, UpdateItemInput } from "../miro-api.js";

export const update_item_schema = z.object({
  board_id: z.string().describe("The Miro board ID"),
  item_id: z.string().describe("ID of the item to update"),
  x: z.number().optional().describe("New X coordinate"),
  y: z.number().optional().describe("New Y coordinate"),
  width: z.number().optional().describe("New width"),
  height: z.number().optional().describe("New height"),
  fill_color: z.string().optional().describe("New fill color (hex code)"),
  border_color: z.string().optional().describe("New border color (hex code)"),
  content: z.string().optional().describe("New text content"),
});

export const update_item_examples: Array<z.infer<typeof update_item_schema>> = [
  { board_id: "demo-board", item_id: "item-x", x: 100, y: -50, fill_color: "#9cd7fc" },
];

export async function update_item(
  client: MiroApiClientLike,
  params: z.infer<typeof update_item_schema>
) {
  const update_params: UpdateItemInput = {};

  if (params.x !== undefined || params.y !== undefined) {
    update_params.position = {};
    if (params.x !== undefined) update_params.position.x = params.x;
    if (params.y !== undefined) update_params.position.y = params.y;
  }

  if (params.width !== undefined || params.height !== undefined) {
    update_params.geometry = {};
    if (params.width !== undefined) update_params.geometry.width = params.width;
    if (params.height !== undefined) update_params.geometry.height = params.height;
  }

  if (params.fill_color || params.border_color) {
    update_params.style = {};
    if (params.fill_color) update_params.style.fillColor = params.fill_color;
    if (params.border_color) update_params.style.borderColor = params.border_color;
  }

  if (params.content) {
    update_params.data = { content: params.content };
  }

  const result = await client.update_item(
    params.board_id,
    params.item_id,
    update_params
  );

  return {
    success: true,
    item_id: result.id,
    message: `Updated item ${params.item_id}`,
    data: result,
  };
}
