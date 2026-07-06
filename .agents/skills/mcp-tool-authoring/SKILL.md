---
name: mcp-tool-authoring
description: How to add a new tool to the Miro MCP server, including schema, handler, demo-fixture, contract test, and example.
---

# mcp-tool-authoring

Use this skill whenever a new Miro capability needs to be exposed to MCP clients.
The MCP server is a **registry-first** design — adding a tool is one file plus
one registry entry, plus a test.

## Required files

1. `miro-custom-mcp/src/tools/<name>.ts` — exports:
   - `<name>_schema`: a `z.object({…})` describing inputs.
   - `<name>Examples`: an array of example params parsed against `<name>_schema`.
   - `async function <name>(client, params): Promise<{ …result, isError? }>`.
2. `miro-custom-mcp/src/tools/registry.ts` — adds the tool to `tools[]`.
3. `miro-custom-mcp/tests/tools.contract.test.ts` — adds an entry to the parametrized matrix.

## Skeleton

```ts
import { z } from "zod";
import type { MiroApiClient } from "../miro-api.js";

export const create_card_schema = z.object({
  board_id: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive().default(320),
  color: z.enum(["gray", "light_yellow"]).default("gray"),
});

export const create_card_examples = [
  { board_id: "demo", title: "Hello", description: "World", x: 0, y: 0 },
];

export async function create_card(client: MiroApiClient, params: z.infer<typeof create_card_schema>) {
  const validated = create_card_schema.parse(params);
  return client.create_card(validated);
}
```

## Do

- Use snake_case for parameter names (matches Miro REST).
- Use `z.enum([...])` rather than `z.string()` when the upstream supports it.
- Return a JSON-serializable object; **do not** return the raw `Response`.
- Emit `isError: true` shape on validation failure, **never** throw.

## Do not

- Do not add network calls outside the API client.
- Do not introduce new top-level dependencies.
- Do not skip the contract test — every tool must round-trip an example.
- Do not hardcode provider IDs in examples.

## References

- `docs/MCP-TOOLS.md` — the canonical tool catalog.
- `miro-custom-mcp/src/types.ts` — Miro type envelopes.
