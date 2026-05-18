// file: scripts/get_miro_token.ts
// description: Helper script to guide users through getting their Miro Personal Access Token
// reference: miro-custom-mcp/.env.example

console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║             Get Your Miro Personal Access Token                        ║
╚════════════════════════════════════════════════════════════════════════╝

To use the custom Miro MCP server, you need a Personal Access Token.
This is a one-time setup that takes about 60 seconds.

📋 STEP-BY-STEP INSTRUCTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 🌐 Open this URL in your browser:
   https://miro.com/app/settings/user-profile/apps

2. 🔧 Create or select an app:
   • Click "Create new app" (or use an existing one)
   • Give it a name like "Custom MCP Server"

3. ✅ Enable required scopes:
   • boards:read
   • boards:write

4. 🔑 Generate Access Token:
   • Look for "Access tokens" or "Generate token" button
   • Click it and copy the generated token

5. 📝 Save your token:
   • Open: miro-custom-mcp/.env
   • Paste your token after MIRO_ACCESS_TOKEN=
   
   Example:
   MIRO_ACCESS_TOKEN=your_actual_token_here_abc123xyz

6. ✨ You're done!
   • Restart Cursor to load the new MCP server
   • The custom Miro tools will now be available

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  SECURITY NOTE:
   • Keep your token secret (never commit .env to git)
   • The token has full access to your Miro boards
   • You can revoke it anytime from the same URL above

🚀 Next Steps:
   • After saving your token, run: pnpm run validate
   • This will test your connection to Miro

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
