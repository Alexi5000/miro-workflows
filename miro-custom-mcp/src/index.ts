#!/usr/bin/env node
// file: miro-custom-mcp/src/index.ts
// description: Main MCP server entry — reads tools from the registry and
//              instantiates either a live or demo Miro client depending on
//              whether MIRO_ACCESS_TOKEN is configured.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MiroApiClient, type MiroApiClientLike, MiroAuthError, MiroRateLimitError } from "./miro-api.js";
import { FakeMiroApiClient } from "./fake-miro-api.js";
import { tools, toolByName } from "./tools/registry.js";

const token = process.env.MIRO_ACCESS_TOKEN || "";
const forceDemo = process.env.MIRO_PROVIDER_MODE?.toLowerCase() === "demo";

let miro: MiroApiClientLike;
if (forceDemo || !token || token === "your_token_here") {
  process.stderr.write("[miro-custom-mcp] Demo mode — using FakeMiroApiClient (set MIRO_ACCESS_TOKEN for live mode).\n");
  miro = new FakeMiroApiClient();
} else {
  process.stderr.write("[miro-custom-mcp] Live mode — talking to https://api.miro.com/v2\n");
  miro = new MiroApiClient(token);
}

const server = new Server({ name: "miro-custom-mcp", version: "1.1.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.schema })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  const def = toolByName[name];
  if (!def) {
    return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
  }
  const parse = def.schema.safeParse(request.params.arguments ?? {});
  if (!parse.success) {
    const issues = parse.error.issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`).join("; ");
    return { content: [{ type: "text", text: `Invalid arguments — ${issues}` }], isError: true };
  }
  try {
    const result = await def.handler(miro, parse.data);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    if (error instanceof MiroAuthError) {
      return { content: [{ type: "text", text: `Miro auth failed — re-export MIRO_ACCESS_TOKEN.\n${error.message}` }], isError: true };
    }
    if (error instanceof MiroRateLimitError) {
      return { content: [{ type: "text", text: `Rate-limited; retry after ${error.retryAfterMs}ms.\n${error.message}` }], isError: true };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: "text", text: `Tool error: ${message}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("Miro Custom MCP Server running on stdio.\n");
}

main().catch((error) => {
  process.stderr.write(`Server boot failed: ${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
});
