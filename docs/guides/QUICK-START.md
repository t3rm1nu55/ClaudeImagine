# Quick Start Guide - MCP Architecture

## Prerequisites ✅

- ✅ Node.js v25.2.1 (v20+ required)
- ✅ All dependencies installed
- ⚠️ Claude Code CLI (needs to be installed separately)

## Step-by-Step Setup

### 1. Update Configuration

Edit `claude_config.json` and replace `__DIR__` with the absolute path to this directory:

```bash
# Get your absolute path
pwd

# Edit claude_config.json and replace __DIR__ with the path
```

Or use this command to generate it:

```bash
node -e "console.log(JSON.stringify({mcpServers:{imagine:{command:'node',args:[process.cwd()+'/server-mcp.js']}}}, null, 2))" > claude_config.json
```

### 2. Start the Server

**Option A: Direct Node (for testing)**
```bash
node server-mcp.js
```

**Option B: Using npm script**
```bash
npm run server:mcp
```

**Expected Output:**
```
Local Imagine Server running at http://localhost:3000
```

**Note:** The server will wait for MCP client connection via stdio. It won't show "Browser connected!" until you:
1. Open the browser to http://localhost:3000
2. Connect via Claude CLI

### 3. Open Browser

Open http://localhost:3000 in Chrome or Edge.

**Expected:**
- See "Waiting for Claude..." message
- Sidebar shows "Agent Thoughts" section
- Log shows "Connected to Relay" (after WebSocket connects)

### 4. Connect Claude CLI

**Important:** The server must be running BEFORE you start Claude CLI.

```bash
# Make sure server-mcp.js is running in one terminal
# Then in another terminal, run:

claude --print --mcp-config ./claude_config.json --dangerously-skip-permissions

# Or if using Claude Desktop, configure it to use this MCP server
```

### 5. Test with a Prompt

Once Claude CLI is connected, try:

```
I want you to build a functional dashboard for a smart home. Start by logging your thought process, then render a main container with a 'Living Room' light switch. Use Tailwind CSS for styling. Call update_ui to render it.
```

## Verification Checklist

- [ ] Server starts without errors
- [ ] Browser opens http://localhost:3000
- [ ] Browser shows "Waiting for Claude..."
- [ ] Browser console shows WebSocket connection
- [ ] Claude CLI connects to MCP server
- [ ] Claude can see `update_ui` and `log_thought` tools
- [ ] Tool calls update the browser UI
- [ ] DOM patching preserves form state

## Troubleshooting

### Server Won't Start
- Check Node version: `node -v` (must be v20+)
- Check dependencies: `npm list @modelcontextprotocol/sdk`
- Check port 3000 is available: `lsof -i :3000`

### Browser Won't Connect
- Verify server is running
- Check browser console for WebSocket errors
- Verify WebSocket URL: `ws://localhost:3000`

### Claude CLI Can't Connect
- Verify `claude_config.json` has correct absolute path
- Check server is running BEFORE starting CLI
- Verify MCP server is using stdio transport
- Check CLI logs for connection errors

### Tools Don't Work
- Verify browser is connected (check server logs for "Browser connected!")
- Check tool names match exactly: `update_ui`, `log_thought`
- Verify WebSocket messages are being sent (check browser console)

### DOM Doesn't Update
- Check morphdom is loaded (browser console: `typeof morphdom`)
- Verify HTML is valid (check WebSocket message payload)
- Check selector matches (#app)
- Verify `childrenOnly: true` option for #app updates

## Architecture Notes

- **MCP Server**: Uses stdio transport (communicates via stdin/stdout)
- **WebSocket**: Browser connects to same HTTP server
- **DOM Patching**: Uses morphdom to preserve state during updates
- **Tool Execution**: Claude → MCP Server → WebSocket → Browser

## Next Steps

1. Test basic UI updates
2. Test form state preservation (Layer 3.1 test)
3. Test complex UI building (calculator)
4. Measure token usage and latency

