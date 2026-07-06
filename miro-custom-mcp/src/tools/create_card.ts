// file: miro-custom-mcp/src/tools/create_card.ts
// description: Tool to create Kanban-style cards
// reference: miro-api.ts

import { z } from "zod";
import type { MiroApiClientLike } from "../miro-api.js";

export const create_card_schema = z.object({
  board_id: z.string().describe("The Miro board ID"),
  title: z.string().optional().describe("Card title"),
  description: z.string().optional().describe("Card description"),
  x: z.number().describe("X coordinate position"),
  y: z.number().describe("Y coordinate position"),
  width: z.number().optional().describe("Width of the card (default: 320)"),
  color: z.string().optional().describe("Card color (hex code)"),
});

export const create_card_examples: Array<z.infer<typeof create_card_schema>> = [
  { board_id: "demo-board", title: "Implement login", description: "OAuth + JWT", x: 0, y: 0 },
];

export async function create_card(
  client: MiroApiClientLike,
  params: z.infer<typeof create_card_schema>
) {
  const result = await client.create_card(params.board_id, {
    title: params.title,
    description: params.description,
    x: params.x,
    y: params.y,
    width: params.width,
    color: params.color,
  });

  return {
    success: true,
    item_id: result.id,
    message: `Created card at (${params.x}, ${params.y})`,
    data: result,
  };
}
