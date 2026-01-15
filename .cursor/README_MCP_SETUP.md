# Miro MCP Servers Configuration

This project uses **TWO** Miro MCP servers:

## 1. Official Miro MCP (`miro`)
- **URL**: `https://mcp.miro.com/`
- **Auth**: OAuth (already authenticated via browser)
- **Capabilities**: Basic flowchart diagrams, read boards
- **Use for**: Quick diagram generation, board reading

## 2. Custom Miro MCP (`miro-custom`)
- **Type**: Local server with full API control
- **Auth**: Personal Access Token (requires setup)
- **Capabilities**: 
  - Create sticky notes with exact colors & positions
  - Create shapes (rectangles, circles, etc.) with custom styling
  - Create frames to organize content
  - Create text with font control
  - Create cards for Kanban boards
  - Create connectors between items
  - Update existing items (move, resize, restyle)
  - Delete items
- **Use for**: Professional layouts, precise positioning, custom styling

## Setup Required for Custom MCP

### Step 1: Get Your Miro Access Token

Run this command to see detailed instructions:
```bash
bun run scripts/get_miro_token.ts
```

Or manually:
1. Go to: https://miro.com/app/settings/user-profile/apps
2. Create a new app or use existing
3. Enable scopes: `boards:read`, `boards:write`
4. Generate access token
5. Copy the token

### Step 2: Configure the Token

Edit `.cursor/mcp.json` and replace the empty string in the `MIRO_ACCESS_TOKEN` field:

```json
"miro-custom": {
  "command": "bun",
  "args": ["run", "miro-custom-mcp/src/index.ts"],
  "env": {
    "MIRO_ACCESS_TOKEN": "paste_your_token_here"
  }
}
```

### Step 3: Reload Cursor

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Developer: Reload Window"
3. Press Enter

### Step 4: Verify

In Cursor, go to Settings → Features → MCP Servers

You should see both:
- ✅ `miro` (official) - Connected
- ✅ `miro-custom` (local) - Connected

## Usage Examples

### Using Official MCP (Basic)
```
Create a flowchart showing user login process
```

### Using Custom MCP (Advanced)
```
Create a yellow sticky note at position (100, 200) with the text "API Cost Analysis"

Create a blue rectangle at (300, 200) with width 250 and height 150 containing "Database Layer"

Create a frame titled "Sprint Planning" at (0, 0) with width 1200 and height 800 with light gray background

Create a pink card at (500, 300) with title "Bug Fix" and description "Fix authentication timeout issue"
```

## Troubleshooting

### Custom MCP Not Showing
- Check that your token is set in `.cursor/mcp.json`
- Reload Cursor window
- Check Cursor's MCP logs in Settings

### "MIRO_ACCESS_TOKEN is not set" Error
- You haven't configured your token yet
- Run: `bun run scripts/get_miro_token.ts` for instructions

### API Errors
- Verify your token is valid
- Check you have the correct scopes enabled
- Ensure you have access to the board you're trying to modify

## Both Servers Work Together

You can use BOTH servers in the same session:
- Use the **official MCP** for quick flowcharts
- Use the **custom MCP** for precise, styled layouts

The custom server gives you full control without losing the convenience of the official one!
