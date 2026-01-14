# Next Steps - Miro MCP Setup

All project files have been successfully created and pushed to GitHub! Here's what you need to do next to complete the setup.

## Current Status

✅ **Completed:**
- Project structure initialized
- All documentation created (SETUP.md, PROMPTS.md, WORKFLOWS.md)
- Validation script created
- Example prompts provided
- Git repository initialized
- GitHub repository created: https://github.com/Alexi5000/miro-workflows
- Dependencies installed

## Required: Manual MCP Configuration

The `.cursor/mcp.json` file cannot be committed to Git (it's blocked by Cursor's global ignore). You need to set this up manually.

### Setup Miro MCP in Cursor

**Follow these steps:**

1. **Open Cursor Settings**
   - Press `Ctrl + ,` (Windows) or `Cmd + ,` (Mac)

2. **Navigate to MCP Servers**
   - Click **Features** → **MCP Servers**

3. **Add Miro MCP Server**
   - Click **Add Server**
   - Add this configuration:
   ```json
   {
     "miro": {
       "url": "https://mcp.miro.com/"
     }
   }
   ```

4. **Connect and Authenticate**
   - Click **Connect** next to "miro"
   - Your browser will open for OAuth
   - **IMPORTANT**: Select your Miro team (both builders must select the same team)
   - Grant the requested permissions
   - Return to Cursor

5. **Verify Connection**
   - Run the validation script:
   ```bash
   bun run validate
   ```
   - All checks should now pass

## For the Second Builder

The second builder should:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Alexi5000/miro-workflows.git
   cd miro-workflows
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Set up MCP (follow steps above)**
   - Use the same Cursor settings steps
   - **CRITICAL**: Select the **same Miro team** during OAuth

4. **Verify setup:**
   ```bash
   bun run validate
   ```

## Start Using Miro MCP

Once connected, try this test prompt in Cursor:

```
Create a new Miro board called "Test Board" with a simple architecture diagram showing:
- Frontend (React)
- Backend (FastAPI)
- Database (PostgreSQL)
```

If it works, you're ready to collaborate!

## Collaboration Workflow

### Creating Boards Together

Both builders can:
- Create boards on the shared Miro team
- Generate diagrams from code
- Convert boards to code
- Document workflows in `docs/WORKFLOWS.md`

### Git Workflow

```bash
# Pull latest changes
git pull origin master

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes, then commit (use conventional commits)
git commit -m "feat(docs): add new workflow template"

# Push and create PR
git push origin feature/your-feature-name
```

## Resources

- **Setup Guide**: [docs/SETUP.md](docs/SETUP.md)
- **Prompt Library**: [docs/PROMPTS.md](docs/PROMPTS.md)
- **Workflow Templates**: [docs/WORKFLOWS.md](docs/WORKFLOWS.md)
- **Examples**: [examples/sample_prompts.md](examples/sample_prompts.md)
- **Cursor MCP Docs**: [.cursor/README.md](.cursor/README.md)

## Troubleshooting

### MCP Validation Fails

If `bun run validate` shows MCP config error:
- Verify `.cursor/mcp.json` exists
- Check the URL is exactly: `https://mcp.miro.com/`
- Restart Cursor

### Cannot Access Boards

- Both builders must select the **same Miro team**
- Re-authenticate if needed: Disconnect and Connect in Cursor

### OAuth Expired

- Go to Cursor Settings → MCP Servers
- Disconnect "miro"
- Connect again and re-authenticate

## Support

- **Issues**: https://github.com/Alexi5000/miro-workflows/issues
- **Miro MCP Docs**: https://developers.miro.com/docs/miro-mcp
- **Validation Script**: `bun run validate`

---

**You're almost there! Just configure the MCP connection in Cursor and you're ready to start creating visual workflows together.**
