import { z } from "zod";
import type { MiroApiClientLike } from "../miro-api.js";

export const create_image_schema = z.object({
  board_id: z.string().min(1).describe("Miro board id"),
  title: z.string().optional().describe("Image title"),
  data: z.string().optional().describe("Base64-encoded image data (without data: prefix)"),
  url: z.string().url().optional().describe("Hosted image URL (alternative to data)"),
  x: z.number().describe("X coordinate"),
  y: z.number().describe("Y coordinate"),
  width: z.number().positive().describe("Image width"),
  height: z.number().positive().optional().describe("Image height (aspect-aware if omitted)"),
});

export const create_image_examples: Array<z.infer<typeof create_image_schema>> = [
  {
    board_id: "demo-board",
    title: "Architecture diagram",
    url: "https://example.com/diagram.png",
    x: 0,
    y: 0,
    width: 800,
  },
];

export async function create_image(client: MiroApiClientLike, params: z.infer<typeof create_image_schema>) {
  if (!params.data && !params.url) {
    return { success: false, error: "Either data (base64) or url is required" };
  }
  const result = await client.create_image(params.board_id, {
    title: params.title,
    data: params.data,
    url: params.url,
    x: params.x,
    y: params.y,
    width: params.width,
    height: params.height,
  });
  return {
    success: true,
    item_id: result.id,
    message: `Created image at (${params.x}, ${params.y})`,
    data: result,
  };
}
