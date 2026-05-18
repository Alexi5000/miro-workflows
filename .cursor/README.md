# Cursor MCP Configuration

This directory contains Cursor-specific configuration that is managed locally.

## MCP Server Configuration

The `.cursor/mcp.json` file is not committed to the repository (blocked by Cursor's global ignore).

**To set up Miro MCP, you need to manually configure it in Cursor:**

### Option 1: Via Cursor Settings (Recommended)

1. Open Cursor Settings (`Ctrl+,` or `Cmd+,`)
2. Navigate to **Features** → **MCP Servers**
3. Click **Add Server**
4. Add this configuration:

```json
{
  "miro": {
    "url": "https://mcp.miro.com/"
  }
}
```

5. Click **Connect** and complete OAuth authentication

### Option 2: Manual File Creation

If you prefer to create the file manually, create `.cursor/mcp.json` with:

```json
{
  "mcpServers": {
    "miro": {
      "url": "https://mcp.miro.com/"
    }
  }
}
```

**Note**: This file is managed by Cursor and should not be committed to version control.

## Verification

After setup, validate the full-stack application from the repository root:

```bash
pnpm run seed
pnpm run validate
pnpm run smoke
```

For custom local MCP validation, build the package under `miro-custom-mcp/` and configure your client to run the compiled Node entry point.
