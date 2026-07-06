// file: miro-custom-mcp/src/tools/create_shape.ts
// description: Tool to create shapes with full styling control
// reference: miro-api.ts

import { z } from "zod";
import type { MiroApiClientLike } from "../miro-api.js";

export const create_shape_schema = z.object({
  board_id: z.string().describe("The Miro board ID"),
  shape: z
    .enum([
      "rectangle",
      "round_rectangle",
      "circle",
      "triangle",
      "rhombus",
      "parallelogram",
      "trapezoid",
      "pentagon",
      "hexagon",
      "octagon",
      "star",
      "right_arrow",
      "left_arrow",
    ])
    .describe("Shape type"),
  content: z.string().optional().describe("Text content inside the shape"),
  fill_color: z.string().optional().describe("Fill color (hex code, e.g., #ffffff)"),
  border_color: z.string().optional().describe("Border color (hex code)"),
  x: z.number().describe("X coordinate position"),
  y: z.number().describe("Y coordinate position"),
  width: z.number().describe("Width of the shape"),
  height: z.number().describe("Height of the shape"),
});

export const create_shape_examples: Array<z.infer<typeof create_shape_schema>> = [
  { board_id: "demo-board", shape: "rectangle", content: "Service", x: 0, y: 0, width: 240, height: 120 },
];

export async function create_shape(
  client: MiroApiClientLike,
  params: z.infer<typeof create_shape_schema>
) {
  const result = await client.create_shape(params.board_id, {
    shape: params.shape,
    content: params.content,
    fill_color: params.fill_color,
    border_color: params.border_color,
    x: params.x,
    y: params.y,
    width: params.width,
    height: params.height,
  });

  return {
    success: true,
    item_id: result.id,
    message: `Created ${params.shape} at (${params.x}, ${params.y})`,
    data: result,
  };
}
