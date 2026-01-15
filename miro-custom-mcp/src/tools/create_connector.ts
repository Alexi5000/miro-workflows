// file: miro-custom-mcp/src/tools/create_connector.ts
// description: Tool to create connectors between items
// reference: miro-api.ts

import { z } from "zod";
import type { MiroApiClient } from "../miro-api.ts";

export const create_connector_schema = z.object({
  board_id: z.string().describe("The Miro board ID"),
  start_item_id: z.string().describe("ID of the starting item"),
  end_item_id: z.string().describe("ID of the ending item"),
  shape: z
    .enum(["straight", "curved", "elbowed"])
    .optional()
    .describe("Connector shape (default: elbowed)"),
  stroke_color: z.string().optional().describe("Line color (hex code)"),
  caption: z.string().optional().describe("Text label on the connector"),
});

export async function create_connector(
  client: MiroApiClient,
  params: z.infer<typeof create_connector_schema>
) {
  const result = await client.create_connector(params.board_id, {
    start_item_id: params.start_item_id,
    end_item_id: params.end_item_id,
    shape: params.shape,
    stroke_color: params.stroke_color,
    caption: params.caption,
  });

  return {
    success: true,
    item_id: result.id,
    message: `Created connector from ${params.start_item_id} to ${params.end_item_id}`,
    data: result,
  };
}
