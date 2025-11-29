# Client Instance Playbook

## Purpose

Creates a Claude Code instance that acts as a client, connecting to the backend MCP server. This is for testing and development.

## Setup Steps

### 1. Create Client Directory

```bash
mkdir -p ~/claude-imagine-client
cd ~/claude-imagine-client
```

### 2. Create CLAUDE.md

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
```

### 3. Create .claude/settings.json

```json
{
  "model": "sonnet",
  "mcpServers": {
    "imagine": {
      "command": "node",
      "args": ["/absolute/path/to/server-mcp.js"]
    }
  }
}
```

### 4. Connect to Backend

```bash
claude --mcp-config ./claude_config.json
```

