// file: miro-custom-mcp/src/tools/create_text.ts
// description: Tool to create text with font styling
// reference: miro-api.ts

import { z } from "zod";
import type { MiroApiClient } from "../miro-api.ts";

export const create_text_schema = z.object({
  board_id: z.string().describe("The Miro board ID"),
  content: z.string().describe("Text content"),
  x: z.number().describe("X coordinate position"),
  y: z.number().describe("Y coordinate position"),
  width: z.number().optional().describe("Width of the text box (default: 200)"),
  font_size: z.string().optional().describe("Font size (e.g., '14', '24', '36')"),
  text_color: z.string().optional().describe("Text color (hex code)"),
  text_align: z.enum(["left", "center", "right"]).optional().describe("Text alignment"),
});

export async function create_text(
  client: MiroApiClient,
  params: z.infer<typeof create_text_schema>
) {
  const result = await client.create_text(params.board_id, {
    content: params.content,
    x: params.x,
    y: params.y,
    width: params.width,
    font_size: params.font_size,
    text_color: params.text_color,
    text_align: params.text_align,
  });

  return {
    success: true,
    item_id: result.id,
    message: `Created text at (${params.x}, ${params.y})`,
    data: result,
  };
}
