// file: miro-custom-mcp/src/tools/delete_item.ts
// description: Tool to delete items from the board
// reference: miro-api.ts

import { z } from "zod";
import type { MiroApiClient } from "../miro-api.ts";

export const delete_item_schema = z.object({
  board_id: z.string().describe("The Miro board ID"),
  item_id: z.string().describe("ID of the item to delete"),
});

export async function delete_item(
  client: MiroApiClient,
  params: z.infer<typeof delete_item_schema>
) {
  await client.delete_item(params.board_id, params.item_id);

  return {
    success: true,
    message: `Deleted item ${params.item_id} from board ${params.board_id}`,
  };
}
