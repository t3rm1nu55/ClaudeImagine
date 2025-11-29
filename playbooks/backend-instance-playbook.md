# Backend Instance Playbook

## Purpose

Creates a permanent Claude Code instance configured as an MCP server backend for Claude Imagine. This instance runs continuously and serves as the backend for browser-based UI building.

## Architecture

```
┌─────────────┐         MCP (stdio)         ┌──────────────┐
│ Claude Code │◄───────────────────────────►│ MCP Backend  │
│  (Backend)  │                              │  Instance    │
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

## Setup Steps

### 1. Create Backend Directory

```bash
mkdir -p ~/claude-imagine-backend
cd ~/claude-imagine-backend
```

### 2. Create CLAUDE.md Configuration

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
```

### 3. Create .claude Directory Structure

```bash
mkdir -p .claude
```

### 4. Create .claude/settings.json

```json
{
  "model": "sonnet",
  "tools": "",
  "mcpServers": {
    "imagine": {
      "command": "node",
      "args": ["/absolute/path/to/server-mcp.js"]
    }
  },
  "systemPrompt": "You are the backend for Claude Imagine. Always use MCP tools (mcp__imagine__update_ui and mcp__imagine__log_thought) for all operations."
}
```

### 5. Create MCP Config (claude_config.json)

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

### 6. Start Backend Instance

```bash
# In backend directory
claude --mcp-config ./claude_config.json
```

## Verification

1. Check MCP connection: `claude mcp list` should show "imagine"
2. Check tools: Ask Claude "What MCP tools do you have?"
3. Test tool execution: Ask Claude to use log_thought tool

## Usage as Backend

This instance:
- Runs continuously
- Serves as MCP backend
- Handles all tool execution
- Communicates with browser
- Maintains persistent state

