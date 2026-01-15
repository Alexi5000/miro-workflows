// file: miro-custom-mcp/src/tools/create_frame.ts
// description: Tool to create frames for organizing content
// reference: miro-api.ts

import { z } from "zod";
import type { MiroApiClient } from "../miro-api.ts";

export const create_frame_schema = z.object({
  board_id: z.string().describe("The Miro board ID"),
  title: z.string().describe("Frame title"),
  x: z.number().describe("X coordinate position"),
  y: z.number().describe("Y coordinate position"),
  width: z.number().describe("Width of the frame"),
  height: z.number().describe("Height of the frame"),
  fill_color: z.string().optional().describe("Background color (hex code)"),
});

export async function create_frame(
  client: MiroApiClient,
  params: z.infer<typeof create_frame_schema>
) {
  const result = await client.create_frame(params.board_id, {
    title: params.title,
    x: params.x,
    y: params.y,
    width: params.width,
    height: params.height,
    fill_color: params.fill_color,
  });

  return {
    success: true,
    item_id: result.id,
    message: `Created frame "${params.title}" at (${params.x}, ${params.y})`,
    data: result,
  };
}
