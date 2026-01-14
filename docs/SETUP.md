# Developer Setup Guide

This guide will help you set up your local development environment to collaborate on Miro boards using the official Miro MCP server.

## Prerequisites

Before starting, ensure you have:

- [Bun](https://bun.sh/) installed (v1.0.0 or higher)
- [Git](https://git-scm.com/) installed
- [Cursor IDE](https://cursor.sh/) installed
- A Miro account with access to a team workspace

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/miro-workflows.git
cd miro-workflows
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Verify Setup

Run the validation script to check your environment:

```bash
bun run validate
```

This will verify:
- Bun is installed correctly
- Git is configured
- MCP configuration exists
- All required files are present

## Connecting to Miro MCP

### Step 1: Open Cursor Settings

1. Open Cursor IDE
2. Press `Ctrl + ,` (Windows/Linux) or `Cmd + ,` (Mac)
3. Navigate to **Features** → **MCP Servers**

### Step 2: Verify MCP Configuration

The MCP configuration should already exist in `.cursor/mcp.json`. If you need to add it manually:

1. Click **Add Server**
2. Add the following configuration:

```json
{
  "miro": {
    "url": "https://mcp.miro.com/"
  }
}
```

### Step 3: Connect and Authenticate

1. In the MCP Servers list, find "miro"
2. Click **Connect**
3. Your browser will open for OAuth authentication
4. **IMPORTANT**: Select the same Miro team that your collaborators are using
5. Grant the requested permissions
6. Return to Cursor - you should see a "Connected" status

### Step 4: Verify Connection

In Cursor, try this test prompt:

```
List my Miro boards
```

If successful, you'll see your Miro boards listed.

## Team Collaboration Notes

### Miro Team Selection

Both builders must:
- Authenticate with the **same Miro team**
- Have access to the team's boards
- Use their individual Miro accounts (no shared credentials needed)

### GitHub Workflow

1. **Before making changes**: `git pull origin main`
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes and commit**: Use [Conventional Commits](https://www.conventionalcommits.org/)
4. **Push and create PR**: `git push origin feature/your-feature-name`
5. **Review and merge**: Have your collaborator review the PR

### Conventional Commit Examples

```bash
feat(docs): add new workflow template
fix(scripts): resolve validation script path issue
docs: update setup instructions
chore(deps): update bun dependencies
```

## Troubleshooting

### MCP Connection Issues

**Problem**: "Cannot connect to Miro MCP server"

**Solutions**:
1. Verify your network can reach `https://mcp.miro.com/`
2. Ensure you're using the latest version of Cursor
3. Try disconnecting and reconnecting
4. Check the Cursor developer console for errors

### Team Selection Error

**Problem**: "Cannot access board" or "Permission denied"

**Solutions**:
1. Verify you selected the correct Miro team during OAuth
2. Disconnect from MCP and reconnect, selecting the right team
3. Confirm with your collaborator which team they're using

### OAuth Token Expired

**Problem**: MCP was working but now shows errors

**Solution**:
1. Go to Cursor Settings → MCP Servers
2. Disconnect from "miro"
3. Reconnect and complete OAuth again

## Need Help?

- Check [docs/PROMPTS.md](./PROMPTS.md) for effective prompts
- See [examples/sample_prompts.md](../examples/sample_prompts.md) for board creation examples
- Refer to [Miro MCP Documentation](https://developers.miro.com/docs/miro-mcp)

## Next Steps

Once connected:
1. Review [PROMPTS.md](./PROMPTS.md) for curated Miro MCP prompts
2. Try creating your first board using AI
3. Document your workflows in [WORKFLOWS.md](./WORKFLOWS.md)
4. Collaborate with your team member!
