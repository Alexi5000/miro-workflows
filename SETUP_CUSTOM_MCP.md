# Custom Miro MCP Server - Setup Guide

## ✅ Implementation Complete!

Your custom Miro MCP server has been successfully built and committed to GitHub!

**Repository**: https://github.com/Alexi5000/miro-workflows

---

## What You Now Have

### 🎯 Two MCP Servers Working Together

| Server | Type | Capabilities |
|--------|------|--------------|
| **Official Miro MCP** | Remote (`mcp.miro.com`) | Basic flowcharts, read boards |
| **Custom Miro MCP** | Local (full API control) | **9 advanced tools** with precise control |

### 🛠️ Custom Server Tools (9 Total)

1. **create_sticky_note** - Exact positioning, 10 color options, custom sizes
2. **create_shape** - 13 shape types with fill/border styling
3. **create_frame** - Organize content into sections
4. **create_text** - Font size, color, alignment control
5. **create_card** - Kanban-style cards for task management
6. **create_connector** - Link items with styled lines
7. **get_board_items** - Retrieve and filter board items
8. **update_item** - Move, resize, or restyle existing items
9. **delete_item** - Remove items from boards

---

## ⚙️ Setup Required (One-Time, ~2 Minutes)

### Step 1: Get Your Miro Personal Access Token

Run this command to see detailed instructions:

```bash
bun run scripts/get_miro_token.ts
```

**Quick Steps:**
1. Open: https://miro.com/app/settings/user-profile/apps
2. Click "Create new app" (or use existing)
3. Enable scopes: `boards:read`, `boards:write`
4. Click "Generate access token"
5. Copy the token

### Step 2: Configure the Token

You need to add your token in **TWO places**:

#### A) In `c:\Users\Admin\.cursor\mcp.json`

Find the `miro-custom` section and replace the empty `MIRO_ACCESS_TOKEN`:

```json
{
  "mcpServers": {
    "miro": {
      "url": "https://mcp.miro.com/"
    },
    "miro-custom": {
      "command": "bun",
      "args": ["run", "C:/TechTide/Apps/Miro/miro-custom-mcp/src/index.ts"],
      "env": {
        "MIRO_ACCESS_TOKEN": "PASTE_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

**Note**: Use the FULL ABSOLUTE PATH for the `args` field on Windows!

#### B) In `miro-custom-mcp/.env` (optional, for local testing)

```
MIRO_ACCESS_TOKEN=PASTE_YOUR_TOKEN_HERE
```

### Step 3: Reload Cursor

1. Press `Ctrl + Shift + P`
2. Type: `Developer: Reload Window`
3. Press Enter

### Step 4: Verify Connection

Go to **Cursor Settings** (`Ctrl + ,`) → **Features** → **MCP Servers**

You should see:
- ✅ **miro** (official) - Connected
- ✅ **miro-custom** - Connected

---

## 🧪 Test Your Setup

Once configured, try these test prompts in Cursor:

### Test 1: Basic Sticky Note
```
Create a yellow sticky note at position (0, 0) with the text "Custom MCP Works!"
```

### Test 2: Styled Shape
```
Create a blue rectangle at (200, 0) with width 250, height 150, containing "API Layer" with fill color #9cd7fc
```

### Test 3: Professional Layout
```
Create a frame titled "Cost Dashboard" at (0, 0) with width 800 and height 600 with fill color #f5f5f5

Then create a pink sticky note at (-200, -100) with text "Total Spend: $115.76"

And create a green sticky note at (200, -100) with text "Success Rate: 45.1%"
```

If these work, you're ready to create professional Miro boards! 🎉

---

## 📚 Usage Examples

See these files for detailed examples:

- **[miro-custom-mcp/EXAMPLES.md](miro-custom-mcp/EXAMPLES.md)** - Complete templates (SWOT, Architecture, Sprint Boards)
- **[.cursor/README_MCP_SETUP.md](.cursor/README_MCP_SETUP.md)** - Configuration reference
- **[miro-custom-mcp/README.md](miro-custom-mcp/README.md)** - Developer documentation

---

## 🎨 What You Can Now Do

### Before (Official MCP Only)
❌ Generic flowcharts  
❌ Limited positioning  
❌ No color control  
❌ Can't update items  
❌ Can't create professional layouts  

### After (With Custom MCP)
✅ **Precise positioning** - Place items at exact coordinates  
✅ **Custom colors** - Any hex code or 10 preset colors  
✅ **All item types** - Sticky notes, shapes, frames, cards, text  
✅ **Full styling** - Borders, fills, fonts, sizes  
✅ **Update & delete** - Modify existing items  
✅ **Professional layouts** - Dashboards, SWOT, architecture diagrams  

---

## 🚀 Example: Replace Generic Diagram with Professional Layout

**Instead of this (official MCP):**
```
Create a cost analysis diagram
```
→ Gives you a generic flowchart

**Do this (custom MCP):**
```
Create a frame titled "Cost Analysis Dashboard" at (0, 0) with width 1200 and height 800 with fill color #fafafa

Create text "Daily API Costs - Jan 14, 2026" at (0, -300) with font size 36 and color #1a1a1a

Create a yellow sticky note at (-400, -100) with text "Gemini: $70.74 | 49.6% success" and width 300

Create a green sticky note at (0, -100) with text "Grok: $15.60 | 87.5% success ⭐" and width 300

Create a red sticky note at (400, -100) with text "Seedream: $8.26 | 28.7% success ⚠️" and width 300

Create a blue rectangle at (0, 150) with width 400 and height 100 containing "Total Spend: $115.76" with fill color #9cd7fc

Create a pink rectangle at (0, 300) with width 400 and height 100 containing "Wasted: $50.73 (43.8%)" with fill color #ff9d9d
```
→ Gives you a professionally styled dashboard with exact positioning and colors

---

## 🔧 Troubleshooting

### Custom MCP Not Showing in Cursor

1. Check `c:\Users\Admin\.cursor\mcp.json` has your token
2. Verify the `command` path uses forward slashes: `C:/TechTide/Apps/Miro/miro-custom-mcp/src/index.ts`
3. Reload Cursor window
4. Check MCP logs in Cursor Settings

### "MIRO_ACCESS_TOKEN is not set" Error

- You haven't added your token to `.cursor/mcp.json`
- Run: `bun run scripts/get_miro_token.ts` for instructions

### API Rate Limiting

- Miro has rate limits (check their docs)
- If you hit limits, add delays between requests
- Consider batching operations

---

## 📊 Next Steps

1. **Get your token** (see Step 1 above)
2. **Configure it** in `.cursor/mcp.json` (see Step 2 above)
3. **Reload Cursor** (see Step 3 above)
4. **Test it** (see Test Your Setup above)
5. **Build professional boards!**

---

## 💡 Pro Tips

- **Use frames first** to organize your workspace
- **Color code by category** (green = success, red = issues, blue = info)
- **Consistent spacing** (e.g., 300px between items)
- **Get item IDs** before creating connectors
- **Combine both MCPs** - Use official for quick drafts, custom for final layouts

---

**You now have professional-grade Miro board control! 🎨**

Questions? Check the docs in `miro-custom-mcp/` or open an issue on GitHub.
