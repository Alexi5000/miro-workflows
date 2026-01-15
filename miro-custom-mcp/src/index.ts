#!/usr/bin/env bun
// file: miro-custom-mcp/src/index.ts
// description: Main MCP server entry point with all custom Miro tools
// reference: @modelcontextprotocol/sdk

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MiroApiClient } from "./miro-api.ts";

// Import all tools
import { create_sticky_note, create_sticky_note_schema } from "./tools/create_sticky_note.ts";
import { create_shape, create_shape_schema } from "./tools/create_shape.ts";
import { create_frame, create_frame_schema } from "./tools/create_frame.ts";
import { create_text, create_text_schema } from "./tools/create_text.ts";
import { create_card, create_card_schema } from "./tools/create_card.ts";
import { create_connector, create_connector_schema } from "./tools/create_connector.ts";
import { get_board_items, get_board_items_schema } from "./tools/get_board_items.ts";
import { update_item, update_item_schema } from "./tools/update_item.ts";
import { delete_item, delete_item_schema } from "./tools/delete_item.ts";

// Get access token from environment
const MIRO_ACCESS_TOKEN = process.env.MIRO_ACCESS_TOKEN || "";

// Initialize Miro API client
let miro_client: MiroApiClient;
try {
  miro_client = new MiroApiClient(MIRO_ACCESS_TOKEN);
} catch (error) {
  console.error("Failed to initialize Miro API client:", error);
  process.exit(1);
}

// Create MCP server
const server = new Server(
  {
    name: "miro-custom-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "create_sticky_note",
      description:
        "Create a sticky note with precise positioning, color, and size. Supports multiple colors: yellow, green, blue, pink, orange, red, gray, light_green, violet, light_yellow.",
      inputSchema: create_sticky_note_schema,
    },
    {
      name: "create_shape",
      description:
        "Create a shape (rectangle, circle, triangle, etc.) with custom fill and border colors. Supports 13 different shapes with full styling control.",
      inputSchema: create_shape_schema,
    },
    {
      name: "create_frame",
      description:
        "Create a frame to organize and group content. Perfect for creating sections on your board with specific dimensions and colors.",
      inputSchema: create_frame_schema,
    },
    {
      name: "create_text",
      description:
        "Create a text box with font size, color, and alignment control. Full typography customization.",
      inputSchema: create_text_schema,
    },
    {
      name: "create_card",
      description:
        "Create a Kanban-style card with title, description, and color. Perfect for task boards and project management.",
      inputSchema: create_card_schema,
    },
    {
      name: "create_connector",
      description:
        "Create a connector line between two items. Supports straight, curved, and elbowed shapes with optional captions.",
      inputSchema: create_connector_schema,
    },
    {
      name: "get_board_items",
      description:
        "Retrieve items from a board with optional filtering by type. Returns IDs that can be used with other tools.",
      inputSchema: get_board_items_schema,
    },
    {
      name: "update_item",
      description:
        "Update an existing item's position, size, color, or content. Move, resize, or restyle any board item.",
      inputSchema: update_item_schema,
    },
    {
      name: "delete_item",
      description:
        "Delete an item from the board. Permanently removes the specified item.",
      inputSchema: delete_item_schema,
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case "create_sticky_note":
        result = await create_sticky_note(miro_client, args as any);
        break;
      case "create_shape":
        result = await create_shape(miro_client, args as any);
        break;
      case "create_frame":
        result = await create_frame(miro_client, args as any);
        break;
      case "create_text":
        result = await create_text(miro_client, args as any);
        break;
      case "create_card":
        result = await create_card(miro_client, args as any);
        break;
      case "create_connector":
        result = await create_connector(miro_client, args as any);
        break;
      case "get_board_items":
        result = await get_board_items(miro_client, args as any);
        break;
      case "update_item":
        result = await update_item(miro_client, args as any);
        break;
      case "delete_item":
        result = await delete_item(miro_client, args as any);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Miro Custom MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
