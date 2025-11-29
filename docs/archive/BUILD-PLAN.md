# Build Plan Execution - "Inverted Architecture"

## Architecture Overview

```
┌─────────────┐         MCP (stdio)         ┌──────────────┐
│ Claude Code │◄───────────────────────────►│ MCP Server   │
│    CLI      │                              │  (Relay)     │
└─────────────┘                              └──────────────┘
                                                      │
                                                      │ WebSocket
                                                      │
                                                      ▼
                                              ┌──────────────┐
                                              │   Browser    │
                                              │  (Frontend)   │
                                              └──────────────┘
```

## Step 1: Dependencies ✅

```bash
npm install @modelcontextprotocol/sdk ws express cors zod
```

**Status:** ✅ Installed

## Step 2: The Relay (MCP Server) ✅

**File:** `server-mcp.js`

**Features:**
- Express server on port 3000
- WebSocket server for browser communication
- MCP Server using StdioServerTransport
- Two tools: `update_ui` and `log_thought`

**Status:** ✅ Created

## Step 3: The Frontend ✅

**File:** `index.html` (copied from `index-mcp.html`)

**Features:**
- Sidebar for "Agent Thoughts" logs
- Main container (#app) for UI updates
- WebSocket connection to relay
- Morphdom for efficient DOM patching
- Tailwind CSS for styling

**Status:** ✅ Created

## Step 4: Configuration ✅

**File:** `claude_config.json`

**Configuration:**
```json
{
  "mcpServers": {
    "imagine": {
      "command": "node",
      "args": ["/absolute/path/to/server-mcp.js"]
    }
  }
}
```

**Status:** ✅ Created (update path as needed)

## Testing Instructions

### 1. Start the Server

```bash
node server-mcp.js
```

**Expected Output:**
```
Local Imagine Server running at http://localhost:3000
```

### 2. Open Browser

Open http://localhost:3000 in Chrome/Edge

**Expected:**
- See "Waiting for Claude..." message
- Sidebar shows "Agent Thoughts"
- Log shows "Connected to Relay"

### 3. Run Claude CLI

```bash
claude --print --mcp-config ./claude_config.json --dangerously-skip-permissions
```

**Note:** Adjust command based on your Claude CLI installation

### 4. Test Prompt

In the Claude CLI, try:

```
"I want you to build a functional dashboard for a smart home. Start by logging your thought process, then render a main container with a 'Living Room' light switch. Use Tailwind CSS for styling. Call update_ui to render it."
```

## Debugging

### If Browser Doesn't Connect
- Check server console for "Browser connected!" message
- Verify WebSocket URL in browser console
- Check for CORS or firewall issues

### If Tools Don't Work
- Verify MCP server is receiving requests (check CLI output)
- Check browser console for WebSocket messages
- Verify tool names match exactly: `update_ui` and `log_thought`

### If DOM Doesn't Update
- Check morphdom is loaded (check browser console)
- Verify HTML is being sent correctly (check WebSocket messages)
- Check selector matches (#app)

## File Structure

```
ClaudeImagine/
├── server-mcp.js          # MCP Server Relay
├── index.html            # Frontend (Browser UI)
├── claude_config.json    # Claude CLI Configuration
├── package.json          # Dependencies
└── BUILD-PLAN.md        # This file
```

## Next Steps

1. ✅ Install dependencies
2. ✅ Create server-mcp.js
3. ✅ Create index.html
4. ✅ Create claude_config.json
5. ⚠️ Test with Claude CLI (requires CLI installation)
6. ⚠️ Verify DOM patching works correctly
7. ⚠️ Test complex UI building

## Notes

- The server uses `console.error` for logs to avoid breaking MCP stdio communication
- Browser must be open before Claude calls tools (server checks for activeBrowserSocket)
- Morphdom preserves form state during updates (critical for interactive UIs)
- Tailwind CSS is loaded from CDN for easy styling

