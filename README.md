# Claude Imagine

A visual UI builder powered by Claude AI using the Model Context Protocol (MCP).

Claude connects to an MCP server via HTTP transport, which relays UI commands to a browser via WebSocket. This enables Claude to build and update web interfaces in real-time.

## Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌─────────┐
│ Claude CLI  │──HTTP──►│  server-mcp.js   │◄──WS───│ Browser │
└─────────────┘         │  (MCP Server)    │         └─────────┘
                        │                  │
                        │  Tools:          │
                        │  - update_ui     │
                        │  - log_thought   │
                        └──────────────────┘
```

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the MCP Server
```bash
npm run server:mcp
```
Server runs at `http://localhost:3000`

### 3. Add MCP Server to Claude (one-time)
```bash
claude mcp add --transport http imagine http://localhost:3000/mcp
```

### 4. Open Browser
Navigate to `http://localhost:3000` in your browser.

### 5. Use Claude
```bash
# Interactive mode
claude

# Or non-interactive
claude --print --dangerously-skip-permissions \
  "Use update_ui to create a hello world page"
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `update_ui` | Updates HTML content in the browser |
| `log_thought` | Displays status/thinking messages |

## Project Structure

```
ClaudeImagine/
├── src/
│   └── server-mcp.js      # MCP server (HTTP transport)
├── public/
│   └── index.html         # Browser UI
├── scripts/
│   └── create-isolated-claude.js
├── tests/
│   ├── prerequisites/     # Unit tests
│   └── e2e/              # Integration tests
├── docs/
│   ├── CLAUDE-LEARNING.md # Key discoveries
│   ├── ROADMAP.md        # Development plan
│   └── ...
├── claude_config.json     # MCP configuration
└── package.json
```

## Configuration

### claude_config.json
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

### Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `HOST` | 127.0.0.1 | Server host |

## Development

```bash
# Start server
npm run server:mcp

# Run tests
npm test

# Check MCP connection
claude mcp list
```

## Documentation

- [CLAUDE-LEARNING.md](docs/CLAUDE-LEARNING.md) - Key technical discoveries
- [ROADMAP.md](docs/ROADMAP.md) - Development roadmap
- [LESSONS-LEARNED.md](docs/LESSONS-LEARNED.md) - Project insights

## Key Learnings

1. **HTTP Transport** - Claude connects to a running server (not spawned)
2. **Tool Naming** - Tools become `mcp__imagine__<tool_name>`
3. **Session Management** - Each Claude session creates an MCP session
4. **WebSocket Bridge** - Single server handles both MCP and browser

See [docs/CLAUDE-LEARNING.md](docs/CLAUDE-LEARNING.md) for full details.

## License

MIT
