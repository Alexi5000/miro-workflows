# Miro MCP Setup

This repository supports two Miro integration paths. The full-stack dashboard and API run from the root package, while the custom MCP server under `miro-custom-mcp/` exposes precise board automation tools to MCP-compatible clients.

## Official hosted MCP

For the hosted Miro MCP server, configure your client with Miro's hosted endpoint and complete the OAuth flow in the browser. Enterprise users may need an administrator to enable hosted MCP access for the organization.

```json
{
  "mcpServers": {
    "miro": {
      "url": "https://mcp.miro.com/"
    }
  }
}
```

## Custom local MCP

Install and build the custom MCP package.

```bash
cd miro-custom-mcp
pnpm install
pnpm run build
```

Configure your MCP client to launch the compiled Node entry point.

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

For development, you can run the server directly with TypeScript.

```bash
cd miro-custom-mcp
MIRO_ACCESS_TOKEN=your-token pnpm run dev
```

## Validation

From the repository root, validate the full application with the standard checks.

```bash
pnpm run seed
pnpm run validate
pnpm run smoke
```

Do not commit access tokens, OAuth credentials, private board URLs, or generated local database files.
