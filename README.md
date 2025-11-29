# Claude Imagine - Claude CLI + MCP Architecture

A reverse-engineered implementation using **Claude CLI** with **MCP (Model Context Protocol)** to enable Claude to build and manage browser UIs in real-time.

## Architecture

```
┌─────────────┐         MCP (stdio)         ┌──────────────┐
│ Claude CLI  │◄───────────────────────────►│ MCP Server   │
│  (Backend)  │                              │  (Relay)     │
└─────────────┘                              └──────────────┘
                                                      │
                                                      │ WebSocket
                                                      │ (localhost:3000)
                                                      ▼
                                              ┌──────────────┐
                                              │   Browser    │
                                              │  (Frontend)   │
                                              └──────────────┘
```

## Key Components

### 1. Claude CLI Backend
- Uses Claude CLI (not direct API)
- Configured via `claude_config.json`
- MCP servers configured per instance
- Isolated conversation history

### 2. MCP Server Relay (`server-mcp.js`)
- Express HTTP server (port 3000)
- WebSocket server for browser communication
- MCP stdio transport for Claude CLI
- Two tools: `update_ui` and `log_thought`

### 3. Browser Frontend (`index.html`)
- WebSocket client connection
- DOM patching with morphdom
- Sidebar for "Agent Thoughts" logs
- Main container (#app) for UI updates

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure MCP Server

Ensure `claude_config.json` has the correct path to `server-mcp.js`:

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

### 3. Start the Server

```bash
node server-mcp.js
```

Server will start at `http://localhost:3000`

### 4. Open Browser

Open `http://localhost:3000` in your browser.

### 5. Run Claude CLI

```bash
claude --print \
  --mcp-config ./claude_config.json \
  --dangerously-skip-permissions \
  "Use mcp__imagine__update_ui to create a header with text 'Hello World'"
```

## MCP Tools

### `update_ui`
Updates the HTML content of the browser UI.

```javascript
{
  "html": "<div>Your HTML here</div>",
  "selector": "#app"  // Optional, defaults to #app
}
```

### `log_thought`
Logs a message to the browser sidebar.

```javascript
{
  "message": "Your message here"
}
```

## Backend Instances

Create permanent backend instances for continuous operation:

```bash
npm run create:backend ~/my-backend-instance
cd ~/my-backend-instance
./start.sh
```

See `playbooks/` directory for more details.

## Testing

### Run All Prerequisites

```bash
export ANTHROPIC_API_KEY="your-token"
npm run test:all-prerequisites
```

### Individual Tests

```bash
npm run test:browser-prerequisites  # Browser prerequisites
npm run test:isolated-primitives    # Isolated instances
npm run test:mcp-tools              # MCP tool configuration
npm run test:backend-playbooks      # Backend instances
npm run test:claude-tools           # Tool execution
npm run test:browser-connection     # Browser connection
```

## Configuration

### MCP Configuration (`claude_config.json`)

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

### Backend Instance Configuration

Backend instances include:
- `CLAUDE.md` - Instance documentation
- `.claude/settings.json` - Claude Code settings
- `claude_config.json` - MCP configuration
- `start.sh` - Startup script

## Documentation

- `MCP-SETUP.md` - MCP server setup and architecture
- `PLAYBOOKS-SUMMARY.md` - Backend instance playbooks
- `CONVERSATION-MANAGEMENT.md` - Conversation ID and history management
- `DESIGN-REVIEW.md` - Architecture review
- `SECURITY.md` - Security and sandboxing

## Key Differences from Original

This implementation uses:
- ✅ **Claude CLI** (not direct API calls)
- ✅ **MCP Protocol** (stdio transport)
- ✅ **Backend instances** (permanent, configurable)
- ✅ **Isolated conversation history**

## Requirements

- Node.js
- Claude CLI installed and authenticated (Claude CLI handles its own authentication)

## License

This is an educational reverse-engineering project. The original "Imagine with Claude" is a product of Anthropic.
