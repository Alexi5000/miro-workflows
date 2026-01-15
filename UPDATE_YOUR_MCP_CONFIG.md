# ⚡ ACTION REQUIRED: Update Your Cursor MCP Configuration

## 🎉 Your Custom Miro MCP Server is Ready!

All code has been written, tested, and pushed to GitHub. Now you need to complete the setup.

---

## 📝 STEP-BY-STEP SETUP (2 Minutes)

### STEP 1: Get Your Miro Access Token

**Run this command:**
```bash
bun run scripts/get_miro_token.ts
```

**Or manually go to:**
1. Open: https://miro.com/app/settings/user-profile/apps
2. Click "Create new app" or select existing
3. Enable scopes: `boards:read` and `boards:write`
4. Click "Generate access token"
5. **COPY THE TOKEN** (you'll need it in Step 2)

---

### STEP 2: Update Your Cursor MCP Config

**File to edit:** `c:\Users\Admin\.cursor\mcp.json`

**Current config** (what you have now):
```json
{
  "mcpServers": {
    "supabase": { ... },
    "browsermcp": { ... },
    "browser-tools": { ... },
    "context7": { ... },
    "miro": {
      "url": "https://mcp.miro.com/"
    }
  }
}
```

**Updated config** (what you need):
```json
{
  "mcpServers": {
    "supabase": { ... },
    "browsermcp": { ... },
    "browser-tools": { ... },
    "context7": { ... },
    "miro": {
      "url": "https://mcp.miro.com/"
    },
    "miro-custom": {
      "command": "bun",
      "args": ["run", "C:/TechTide/Apps/Miro/miro-custom-mcp/src/index.ts"],
      "env": {
        "MIRO_ACCESS_TOKEN": "PASTE_YOUR_TOKEN_HERE_FROM_STEP_1"
      }
    }
  }
}
```

**IMPORTANT:**
- Add a **comma** after the `"miro"` entry (line 31 in your current config)
- Paste your actual token where it says `PASTE_YOUR_TOKEN_HERE_FROM_STEP_1`
- Use the EXACT path shown above with forward slashes

---

### STEP 3: Reload Cursor

1. Press `Ctrl + Shift + P`
2. Type: `Developer: Reload Window`
3. Press Enter

---

### STEP 4: Verify Both Servers Are Connected

1. Open Cursor Settings (`Ctrl + ,`)
2. Go to **Features** → **MCP Servers**
3. You should see:
   - ✅ **miro** - Connected (official)
   - ✅ **miro-custom** - Connected (your new one!)

---

## 🧪 TEST YOUR NEW POWERS

Once configured, try these prompts:

### Test 1: Create a Styled Sticky Note
```
Create a pink sticky note at position (100, 100) with the text "Custom MCP is working!" and width 300
```

### Test 2: Create a Professional Shape
```
Create a blue rectangle at (400, 100) with width 250, height 150, containing "Database Layer" with fill color #9cd7fc and border color #1a1a1a
```

### Test 3: Build a Complete Dashboard
```
Create a frame titled "Cost Dashboard" at (0, 0) with width 1000 and height 600 with fill color #f0f0f0

Create text "January 14, 2026 - API Costs" at (0, -250) with font size 32 and color #000000

Create a yellow sticky note at (-300, -50) with text "Gemini: $70.74" and width 250

Create a green sticky note at (0, -50) with text "Grok: $15.60 ⭐" and width 250

Create a red sticky note at (300, -50) with text "Seedream: $8.26 ⚠️" and width 250

Create a blue rectangle at (0, 150) with width 400 and height 80 containing "Total Spend: $115.76" with fill color #9cd7fc
```

**Expected result:** A professionally styled dashboard with exact positioning and custom colors!

---

## 📖 Documentation Created

| File | Purpose |
|------|---------|
| **SETUP_CUSTOM_MCP.md** (this file) | Complete setup instructions |
| **miro-custom-mcp/README.md** | Developer documentation |
| **miro-custom-mcp/EXAMPLES.md** | Templates & advanced examples |
| **.cursor/README_MCP_SETUP.md** | MCP configuration reference |
| **scripts/get_miro_token.ts** | Token setup helper |

---

## 🎨 What Makes This Different

### Official MCP Output (Generic)
```
flowchart TD
  A[Start] --> B[Process]
  B --> C[End]
```
→ Basic flowchart, no control over colors/positioning

### Custom MCP Output (Professional)
```
✓ Yellow sticky note at exact (100, 200)
✓ Blue rectangle with custom hex color #9cd7fc
✓ Frame organizing multiple items
✓ Connectors with custom captions
✓ Professional dashboard layout
```
→ Full design control like a professional designer!

---

## ⚠️ Important Notes

1. **Both servers work together** - Keep the official Miro MCP for quick flowcharts, use custom for professional layouts
2. **Token security** - Never commit your token to git (already in `.gitignore`)
3. **Absolute path required** - Windows requires full path in MCP config
4. **Cursor reload required** - Changes to MCP config need a window reload

---

## 🔧 Troubleshooting

### "miro-custom" Not Showing Connected

**Fix:**
1. Check your token is in `c:\Users\Admin\.cursor\mcp.json`
2. Verify the path uses forward slashes: `C:/TechTide/Apps/Miro/...`
3. Reload Cursor completely (close and reopen)

### "MIRO_ACCESS_TOKEN is not set" Error

**Fix:**
- You haven't added your token to `.cursor/mcp.json` yet
- Run Step 1 and Step 2 above

### Server Starts But Tools Don't Work

**Fix:**
- Check your token has the right scopes (`boards:read`, `boards:write`)
- Verify you have access to the board you're trying to modify
- Check Cursor's Developer Console (`Ctrl + Shift + I`) for errors

---

## 🎯 Ready to Go?

1. ✅ Code complete and pushed to GitHub
2. ⚠️ **YOU NEED TO:** Get token and update MCP config (Steps 1-3 above)
3. 🧪 Test with the example prompts
4. 🚀 Start creating professional Miro boards!

---

**Questions?** See `miro-custom-mcp/README.md` or the official Miro API docs at https://developers.miro.com/reference/api-reference

**Need the token?** Run: `bun run scripts/get_miro_token.ts`
