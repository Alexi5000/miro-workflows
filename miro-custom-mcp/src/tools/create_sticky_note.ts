// file: miro-custom-mcp/src/tools/create_sticky_note.ts
// description: Tool to create sticky notes with precise positioning and colors
// reference: miro-api.ts

import { z } from "zod";
import type { MiroApiClient } from "../miro-api.ts";

export const create_sticky_note_schema = z.object({
  board_id: z.string().describe("The Miro board ID"),
  content: z.string().describe("Text content for the sticky note"),
  color: z
    .enum(["yellow", "green", "blue", "pink", "orange", "red", "gray", "light_green", "violet", "light_yellow"])
    .optional()
    .describe("Sticky note color"),
  x: z.number().describe("X coordinate position on the board"),
  y: z.number().describe("Y coordinate position on the board"),
  width: z.number().optional().describe("Width of the sticky note (default: 200)"),
});

export async function create_sticky_note(
  client: MiroApiClient,
  params: z.infer<typeof create_sticky_note_schema>
) {
  // Map color names to Miro hex codes
  const color_map: Record<string, string> = {
    yellow: "#fff9b1",
    green: "#d5f692",
    blue: "#9cd7fc",
    pink: "#f5d1ff",
    orange: "#ffd48f",
    red: "#ff9d9d",
    gray: "#e6e6e6",
    light_green: "#d0f0fd",
    violet: "#d5d5f7",
    light_yellow: "#fffaa8",
  };

  const hex_color = params.color ? color_map[params.color] : undefined;

  const result = await client.create_sticky_note(params.board_id, {
    content: params.content,
    color: hex_color,
    x: params.x,
    y: params.y,
    width: params.width,
  });

  return {
    success: true,
    item_id: result.id,
    message: `Created sticky note at (${params.x}, ${params.y})`,
    data: result,
  };
}
