# Miro Custom MCP Server

A powerful local MCP server that provides **full control** over Miro boards via the REST API v2.

## Why This Exists

The official Miro MCP (`mcp.miro.com`) only creates basic flowchart diagrams. This custom server gives you:

✅ **Precise positioning** - Place items at exact (x, y) coordinates  
✅ **Custom colors** - Any hex code or preset colors  
✅ **All item types** - Sticky notes, shapes, frames, cards, text, connectors  
✅ **Full styling** - Borders, fills, fonts, sizes  
✅ **Update & delete** - Modify or remove existing items  
✅ **Professional layouts** - Create dashboards, SWOT analyses, architecture diagrams  

## Quick Start

### 1. Get Your Miro Access Token

```bash
bun run ../scripts/get_miro_token.ts
```

Follow the instructions to generate a token from: https://miro.com/app/settings/user-profile/apps

### 2. Configure Your Token

Edit `.env` and add your token:
```
MIRO_ACCESS_TOKEN=your_actual_token_here
```

### 3. Configure Cursor

Your `.cursor/mcp.json` should have:
```json
{
  "mcpServers": {
    "miro-custom": {
      "command": "bun",
      "args": ["run", "miro-custom-mcp/src/index.ts"],
      "env": {
        "MIRO_ACCESS_TOKEN": ""
      }
    }
  }
}
```

Replace the empty `MIRO_ACCESS_TOKEN` value with your token.

### 4. Reload Cursor

Press `Ctrl+Shift+P` → "Developer: Reload Window"

### 5. Test It

In Cursor, try:
```
Create a yellow sticky note at position (0, 0) with the text "Hello Miro!"
```

## Available Tools

| Tool | Description |
|------|-------------|
| `create_sticky_note` | Create sticky notes with 10 color options |
| `create_shape` | Create 13 different shapes with custom styling |
| `create_frame` | Organize content into frames |
| `create_text` | Add text with font control |
| `create_card` | Create Kanban cards |
| `create_connector` | Connect items with lines |
| `get_board_items` | List items on a board |
| `update_item` | Move, resize, or restyle items |
| `delete_item` | Remove items |

## Examples

See `EXAMPLES.md` for detailed templates including:
- SWOT Analysis
- System Architecture Diagrams
- Sprint Planning Boards
- Cost Analysis Dashboards

## Architecture

```
miro-custom-mcp/
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── miro-api.ts       # Miro REST API client
│   ├── types.ts          # TypeScript types
│   └── tools/            # Individual tool implementations
│       ├── create_sticky_note.ts
│       ├── create_shape.ts
│       ├── create_frame.ts
│       ├── create_text.ts
│       ├── create_card.ts
│       ├── create_connector.ts
│       ├── get_board_items.ts
│       ├── update_item.ts
│       └── delete_item.ts
├── package.json
├── tsconfig.json
├── .env                  # Your Miro token (DO NOT COMMIT)
└── README.md
```

## Development

### Install Dependencies
```bash
bun install
```

### Run Locally
```bash
bun run src/index.ts
```

### Test a Tool
Create a test script:
```typescript
import { MiroApiClient } from "./src/miro-api.ts";

const client = new MiroApiClient(process.env.MIRO_ACCESS_TOKEN!);
const result = await client.create_sticky_note("your_board_id", {
  content: "Test",
  x: 0,
  y: 0,
});
console.log(result);
```

## Troubleshooting

### "MIRO_ACCESS_TOKEN is not set"
- You haven't added your token to `.env`
- Run `bun run ../scripts/get_miro_token.ts` for instructions

### Server Not Showing in Cursor
- Check `.cursor/mcp.json` is configured correctly
- Reload Cursor window
- Check Cursor MCP logs in Settings

### API Errors
- Verify your token is valid at https://miro.com/app/settings/user-profile/apps
- Ensure scopes `boards:read` and `boards:write` are enabled
- Check you have access to the board you're modifying

## License

MIT

## Contributing

This is part of the miro-workflows project. See the main README for contribution guidelines.
