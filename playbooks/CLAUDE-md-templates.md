# CLAUDE.md Templates

Templates for configuring Claude Code instances via CLAUDE.md files.

## Backend Instance Template

```markdown
# Claude Imagine Backend

This is a permanent backend instance for Claude Imagine.

## Purpose
- Serve as MCP server backend
- Handle tool execution (update_ui, log_thought)
- Communicate with browser via WebSocket
- Provide stable, persistent backend service

## Configuration
- Model: sonnet (cost-effective for backend)
- Tools: MCP tools only (update_ui, log_thought)
- MCP Server: server-mcp.js
- Port: 3000 (WebSocket)

## Behavior
- Always use MCP tools for UI operations
- Log all operations via log_thought
- Update UI via update_ui tool
- Maintain connection to browser

## MCP Tools Available

- `mcp__imagine__update_ui` - Update browser UI
- `mcp__imagine__log_thought` - Log messages to browser sidebar
```

## Client Instance Template

```markdown
# Claude Imagine Client

This instance connects to the Claude Imagine backend.

## Purpose
- Connect to backend MCP server
- Test tool execution
- Develop new features
- Debug issues

## Configuration
- Model: sonnet (or opus for complex tasks)
- MCP Server: Points to backend instance
- Tools: All available tools

## Usage

Connect to backend and use MCP tools for all operations.
```

## Development Instance Template

```markdown
# Claude Imagine Development

Development instance for building and testing Claude Imagine features.

## Purpose
- Develop new features
- Test MCP tools
- Debug issues
- Experiment with configurations

## Configuration
- Model: sonnet (fast iteration)
- Tools: All tools enabled
- MCP Server: Local development server

## Behavior
- Verbose logging enabled
- All tools available
- Development mode
```

## Production Instance Template

```markdown
# Claude Imagine Production

Production-ready instance for Claude Imagine.

## Purpose
- Serve production traffic
- Handle real user requests
- Maintain stability
- Monitor performance

## Configuration
- Model: sonnet (cost-effective)
- Tools: MCP tools only
- MCP Server: Production server
- Port: 3000

## Behavior
- Error handling enabled
- Logging to production logs
- Rate limiting enabled
- Monitoring enabled
```

## Custom Agent Instance Template

```markdown
# Custom Agent Instance

Instance configured with custom agents for specific tasks.

## Purpose
- Run specialized agents
- Handle specific use cases
- Provide expert-level responses

## Agents
- @ui_builder - Builds UI components
- @code_reviewer - Reviews code
- @architect - Designs system architecture

## Configuration
- Model: opus (for complex tasks)
- Tools: Agent-specific tools
- MCP Server: Custom configuration
```

