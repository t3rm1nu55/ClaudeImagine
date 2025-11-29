# MCP Server Setup and Architecture

## Overview

The MCP (Model Context Protocol) server setup requires proper configuration and startup sequence. This document explains how all components work together.

## Architecture

```
┌─────────────┐         MCP (stdio)         ┌──────────────┐
│ Claude CLI  │◄───────────────────────────►│ MCP Server   │
│             │                              │  (spawned)   │
└─────────────┘                              └──────────────┘
                                                      │
                                                      │ HTTP/WebSocket
                                                      │ (localhost:3000)
                                                      ▼
                                              ┌──────────────┐
                                              │   Browser    │
                                              │  (Frontend)   │
                                              └──────────────┘
```

## Components

### 1. MCP Configuration File (`claude_config.json`)

**Location:** Project root

**Purpose:** Tells Claude CLI how to spawn the MCP server

**Format:**
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

**Important:**
- Must use absolute path to `server-mcp.js`
- Claude CLI reads this config when it starts
- Config can be in project root or user config directory

### 2. MCP Server (`server-mcp.js`)

**Purpose:** Dual-purpose server that handles:
- MCP communication (via stdio) - for Claude CLI
- HTTP/WebSocket server (port 3000) - for browser

**How it works:**
- When spawned by Claude CLI: Connects MCP via stdio AND starts HTTP/WebSocket
- When run manually: Only starts HTTP/WebSocket (standalone mode)

**Key Code:**
```javascript
// If stdin is NOT a TTY, connect MCP (spawned by Claude CLI)
if (!process.stdin.isTTY) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
} else {
  // Standalone mode - HTTP/WebSocket only
}
```

### 3. Claude CLI

**How it works:**
1. Reads MCP config (from `claude_config.json` or user config)
2. Spawns MCP server as child process (via stdio)
3. Communicates with server via MCP protocol (stdio)
4. Server also starts HTTP/WebSocket server (port 3000)

**Important Flags:**
- `--mcp-config <path>`: Explicitly specify MCP config file
- `--dangerously-skip-permissions`: Required for MCP in `--print` mode
- `--print`: Non-interactive mode (one-shot execution)

### 4. Browser/Frontend

**Connection:**
- Connects to `ws://localhost:3000` (or `ws://127.0.0.1:3000`)
- Receives tool execution results via WebSocket
- Updates UI based on messages

## Startup Sequence

### Correct Order:

1. **MCP Config Setup**
   ```bash
   # Ensure claude_config.json exists with correct path
   cat claude_config.json
   ```

2. **Dependencies Installed**
   ```bash
   npm install
   # Ensures @modelcontextprotocol/sdk, ws, express are installed
   ```

3. **Claude CLI Spawns Server**
   - When Claude CLI runs, it reads config
   - Spawns `server-mcp.js` as child process
   - Server starts both MCP (stdio) and HTTP/WebSocket

4. **Browser Connects**
   - Browser connects to `ws://localhost:3000`
   - WebSocket connection established
   - Ready to receive tool execution messages

5. **Tool Execution**
   - Claude CLI calls tool via MCP (stdio)
   - MCP server receives tool call
   - Server sends message via WebSocket to browser
   - Browser updates UI

## Test Setup

The test (`test-claude-tools.js`) handles this by:

1. **Starting Server Manually** (for WebSocket connection)
   - Spawns `server-mcp.js` manually
   - Server runs in standalone mode (HTTP/WebSocket only)
   - Browser connects to this server

2. **Claude CLI Spawns Its Own Server** (for MCP communication)
   - Each `runClaude()` call spawns new Claude CLI process
   - Claude CLI spawns its own MCP server instance
   - This server also starts HTTP/WebSocket (but we use the manual one)

**Note:** This creates two server instances:
- Manual server: For WebSocket connection (test uses this)
- Claude CLI's server: For MCP communication (Claude CLI uses this)

**Why this works:**
- Manual server handles WebSocket (browser → test)
- Claude CLI's server handles MCP (Claude CLI → server)
- Both servers can run simultaneously (different purposes)
- Port conflict avoided because manual server is for WebSocket only

## Alternative Approach (Single Server)

For a cleaner setup, you could:

1. Start Claude CLI in persistent mode (not `--print`)
2. Let it spawn the MCP server
3. Connect WebSocket to that server
4. Make tool calls through the same Claude CLI instance

But this requires:
- Interactive Claude CLI session
- More complex test setup
- Process management for persistent session

## Configuration Checklist

- [ ] `claude_config.json` exists with absolute path
- [ ] Dependencies installed (`npm install`)
- [ ] `server-mcp.js` is executable and has correct path
- [ ] Claude CLI can read MCP config (`claude mcp list` shows "imagine")
- [ ] Server can bind to localhost:3000 (port not in use)
- [ ] Browser can connect to WebSocket (CORS/firewall allows)

## Troubleshooting

### MCP Tools Not Visible

**Symptoms:** Claude CLI doesn't see `mcp__imagine__*` tools

**Solutions:**
1. Check MCP config: `claude mcp list` should show "imagine"
2. Verify config path is absolute and correct
3. Ensure `--dangerously-skip-permissions` flag is used (for `--print` mode)
4. Check server spawns correctly (look for "Local Imagine Server running")

### Port Already in Use

**Symptoms:** Server can't bind to port 3000

**Solutions:**
1. Kill existing process: `lsof -ti:3000 | xargs kill -9`
2. Change port in `server-mcp.js` and config
3. Ensure only one server instance is running

### WebSocket Connection Fails

**Symptoms:** Browser can't connect to `ws://localhost:3000`

**Solutions:**
1. Verify server is running: Check for "Local Imagine Server running"
2. Check server binds to `127.0.0.1` (not `0.0.0.0`)
3. Verify firewall allows localhost connections
4. Check browser console for connection errors

## Security Considerations

- Server binds only to `127.0.0.1` (localhost)
- No external network access
- File system access restricted to project directory
- Sandboxed environment for testing

See `SECURITY.md` for detailed security model.

