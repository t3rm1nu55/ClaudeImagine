# Claude Learning - Key Discoveries

This document captures all key learnings about Claude CLI, MCP servers, and the Claude Imagine architecture discovered during development.

## 1. MCP Transport Modes

### Stdio Transport (Default)
- Claude CLI **spawns** the MCP server as a child process
- Communication via stdin/stdout pipes
- Server process lifecycle tied to Claude CLI session
- Configuration:
```json
{
  "mcpServers": {
    "myserver": {
      "command": "node",
      "args": ["server.js"]
    }
  }
}
```

### HTTP Transport (Recommended for Claude Imagine)
- Server runs **independently** - Claude CLI connects to it
- Communication via HTTP POST/GET/DELETE to `/mcp` endpoint
- Server can persist across multiple Claude sessions
- Allows WebSocket connections for browser UI
- Configuration:
```json
{
  "mcpServers": {
    "imagine": {
      "type": "http", 
      "url": "http://localhost:3000/mcp"
    }
  }
}
```
- Add via CLI: `claude mcp add --transport http imagine http://localhost:3000/mcp`

### SSE Transport (Legacy)
- Server-Sent Events for older clients
- Deprecated in favor of Streamable HTTP
- Still supported for backwards compatibility

## 2. MCP SDK Patterns

### Server Setup (HTTP Transport)
```javascript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

const server = new McpServer({ name: "myserver", version: "1.0.0" });

// Register tools
server.tool("tool_name", "description", { param: { type: "string" } }, 
  async ({ param }) => ({ content: [{ type: "text", text: "result" }] })
);

// Express endpoint
app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  
  if (sessionId && transports[sessionId]) {
    // Reuse existing session
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New session
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => transports[id] = transport
    });
    await server.connect(transport);
  }
  
  await transport.handleRequest(req, res, req.body);
});
```

### Key Points
- Each session needs its own transport instance
- Must handle POST (requests), GET (SSE notifications), DELETE (session close)
- Use `isInitializeRequest()` to detect new sessions
- Create new `McpServer` or reuse single instance per session

## 3. Claude CLI Flags

### Essential Flags
- `--print` - Non-interactive mode, outputs to stdout
- `--mcp-config <path>` - Path to MCP configuration JSON
- `--dangerously-skip-permissions` - Required for MCP in `--print` mode
- `--model <name>` - Model to use (`sonnet`, `opus`, `haiku`)

### MCP Management Commands
```bash
# List configured servers
claude mcp list

# Add HTTP server
claude mcp add --transport http <name> <url>

# Add stdio server  
claude mcp add --transport stdio <name> -- <command> [args...]

# Remove server
claude mcp remove <name>

# Get server details
claude mcp get <name>
```

## 4. Authentication

### OAuth (Default)
- Claude CLI uses OAuth by default
- Credentials stored in `~/.claude/`
- Files: `token.json`, `credentials.json`, or `auth.json`
- No API key needed for normal usage

### API Key (Alternative)
- Set `ANTHROPIC_API_KEY` environment variable
- Useful for CI/CD or isolated instances

### Isolated Instances
- Use `CLAUDE_CONFIG_DIR` to isolate config/history
- Can copy OAuth credentials to isolated directory
- For project-scoped isolation, just use different `cwd`

## 5. Tool Naming Convention

Tools exposed via MCP are prefixed by Claude:
```
mcp__<server_name>__<tool_name>
```

Example:
- Server named `imagine` with tool `update_ui`
- Becomes: `mcp__imagine__update_ui`

## 6. Project Structure (Official Patterns)

```
project/
├── CLAUDE.md              # Project instructions
├── .claude/
│   ├── settings.json      # Project-specific settings
│   ├── agents/            # Custom agents (*.md)
│   ├── skills/            # Custom skills (*/SKILL.md)
│   └── commands/          # Slash commands (*.md)
├── .mcp.json              # Project MCP servers
└── ...
```

## 7. Architecture Decision: HTTP vs Stdio

### Why HTTP Transport for Claude Imagine

**Problem with Stdio:**
- Claude spawns server → creates NEW process each time
- WebSocket connects to separately running server
- Results in TWO server instances - messages don't flow

**Solution with HTTP:**
- Server runs once, independently
- Claude connects to existing server via HTTP
- Browser connects to same server via WebSocket
- All messages flow through single server instance

```
┌─────────────┐         ┌──────────────────┐         ┌─────────┐
│ Claude CLI  │──HTTP──►│  server-mcp.js   │◄──WS───│ Browser │
└─────────────┘         │  (single inst)   │         └─────────┘
                        │  - /mcp endpoint │
                        │  - WebSocket     │
                        └──────────────────┘
```

## 8. Common Pitfalls

### 1. Port Already in Use
Server had fallback to "forwarder mode" - removed in favor of explicit HTTP transport.

### 2. Session Management
Each MCP POST request may create new session. Must track by `mcp-session-id` header.

### 3. Tool Return Format
Tools must return: `{ content: [{ type: "text", text: "..." }] }`

### 4. Browser Connection Detection
Check WebSocket `readyState === 1` (OPEN) before sending.

### 5. CORS / Security
Bind to `127.0.0.1` only for local development. Use `enableDnsRebindingProtection` in production.

## 9. Testing Strategy

### Prerequisites (No Browser)
1. Claude CLI installed
2. MCP server starts
3. Claude can list tools
4. Claude can call tools

### Integration (With Browser)
1. Start server
2. Connect WebSocket (simulated browser)
3. Call Claude with tool invocation
4. Verify WebSocket receives message

### End-to-End
1. Start server
2. Open actual browser
3. Use Claude interactively
4. Observe UI updates

## 10. Environment Variables

| Variable | Purpose |
|----------|---------|
| `PORT` | Server port (default: 3000) |
| `HOST` | Server host (default: 127.0.0.1) |
| `ANTHROPIC_API_KEY` | API key auth (optional) |
| `CLAUDE_CONFIG_DIR` | Isolated config directory |
| `NODE_ENV` | Environment (test/dev/prod) |

## 11. Useful Commands

```bash
# Start server
npm run server:mcp

# Check server health
curl http://localhost:3000/health

# List Claude's MCP servers
claude mcp list

# Test tool call
claude --print --dangerously-skip-permissions "Call log_thought with message 'test'"

# Run tests
npm test
```

## 12. Future Considerations

1. **Authentication for browser** - Currently open WebSocket, may need auth
2. **Multiple browsers** - Current impl supports single browser connection
3. **Session persistence** - MCP sessions could be persisted to database
4. **Rate limiting** - Protect against abuse
5. **HTTPS** - For production deployment

