# Miro Custom MCP Server

This package contains the custom MCP server preserved inside **Miro Workflows** for direct Miro board operations. It complements the full-stack dashboard and API by exposing precise board item tools over stdio for MCP-compatible clients.

## Capabilities

| Tool | Purpose |
| --- | --- |
| `create_sticky_note` | Creates positioned sticky notes with colors and sizing. |
| `create_shape` | Creates styled shapes for diagrams and workflow maps. |
| `create_frame` | Creates frames for organized board sections. |
| `create_text` | Creates text blocks with typography controls. |
| `create_card` | Creates Kanban-style cards. |
| `create_connector` | Creates connectors between board items. |
| `get_board_items` | Reads board items for inspection or follow-up automation. |
| `update_item` | Updates item position, dimensions, style, or content. |
| `delete_item` | Deletes board items by identifier. |

## Setup

Install dependencies from this package directory.

```bash
cd miro-custom-mcp
pnpm install
```

Set a Miro token in your shell before running live board operations.

```bash
export MIRO_ACCESS_TOKEN="your-token"
pnpm run dev
```

Build the package for production execution.

```bash
pnpm run build
pnpm run start
```

## Client configuration

A typical local MCP client configuration points to the compiled Node entry point after `pnpm run build`.

```json
{
  "mcpServers": {
    "miro-custom": {
      "command": "node",
      "args": ["/absolute/path/to/miro-workflows/miro-custom-mcp/dist/index.js"],
      "env": {
        "MIRO_ACCESS_TOKEN": "your-token"
      }
    }
  }
}
```

For local development, clients that can launch TypeScript directly may point to `pnpm` and `tsx`, but compiled JavaScript is recommended for stable production-style use.

## Security

Do not commit real access tokens, board URLs containing private information, OAuth codes, refresh tokens, or client secrets. The full application stores credential metadata in the database schema, while live secrets should remain in environment variables or a managed secret store.
