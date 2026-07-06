import { z } from "zod";
import { MiroRateLimitError } from "../miro-api.js";
import type { MiroApiClientLike } from "../miro-api.js";

const batchInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("sticky_note"),
    content: z.string(),
    color: z.string().optional(),
    x: z.number(),
    y: z.number(),
    width: z.number().optional(),
  }),
  z.object({
    type: z.literal("shape"),
    shape: z.string(),
    content: z.string().optional(),
    fill_color: z.string().optional(),
    border_color: z.string().optional(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  z.object({
    type: z.literal("card"),
    title: z.string().optional(),
    description: z.string().optional(),
    x: z.number(),
    y: z.number(),
    width: z.number().optional(),
    color: z.string().optional(),
  }),
  z.object({
    type: z.literal("text"),
    content: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number().optional(),
  }),
  z.object({
    type: z.literal("frame"),
    title: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
]);

export const batch_create_items_schema = z.object({
  board_id: z.string().min(1),
  items: z.array(batchInputSchema).min(1).max(20),
  stop_on_error: z.boolean().default(false),
  base_delay_ms: z.number().int().min(0).max(60_000).default(250),
});

export const batch_create_items_examples: Array<z.infer<typeof batch_create_items_schema>> = [
  {
    board_id: "demo-board",
    items: [
      { type: "sticky_note", content: "Idea A", x: -120, y: -80 },
      { type: "sticky_note", content: "Idea B", x: 0, y: -80 },
      { type: "sticky_note", content: "Idea C", x: 120, y: -80 },
    ],
    stop_on_error: false,
    base_delay_ms: 250,
  },
];

interface BatchResult {
  index: number;
  type: string;
  success: boolean;
  item_id?: string;
  error?: string;
}

export async function batch_create_items(client: MiroApiClientLike, params: z.infer<typeof batch_create_items_schema>) {
  const results: BatchResult[] = [];
  for (let i = 0; i < params.items.length; i++) {
    const item = params.items[i];
    try {
      let created: { id: string };
      switch (item.type) {
        case "sticky_note":
          created = await client.create_sticky_note(params.board_id, item);
          break;
        case "shape":
          created = await client.create_shape(params.board_id, item);
          break;
        case "card":
          created = await client.create_card(params.board_id, item);
          break;
        case "text":
          created = await client.create_text(params.board_id, item);
          break;
        case "frame":
          created = await client.create_frame(params.board_id, item);
          break;
      }
      results.push({ index: i, type: item.type, success: true, item_id: created!.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ index: i, type: item.type, success: false, error: message });
      if (err instanceof MiroRateLimitError) {
        // Wait then continue; do not bail just on rate-limit.
        await new Promise((r) => setTimeout(r, err.retryAfterMs || params.base_delay_ms));
      } else if (params.stop_on_error) {
        break;
      }
    }
    // Soft pacing between writes.
    if (i < params.items.length - 1) await new Promise((r) => setTimeout(r, params.base_delay_ms / params.items.length));
  }
  const successes = results.filter((r) => r.success).length;
  const failures = results.length - successes;
  return { success: failures === 0, totals: { requested: params.items.length, successes, failures }, results };
}
