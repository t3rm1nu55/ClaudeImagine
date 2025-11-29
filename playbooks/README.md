# Playbooks Directory

This directory contains playbooks for creating and managing permanent Claude Code instances that can serve as MCP server backends for Claude Imagine.

## Quick Start

### Create a Backend Instance

```bash
# From project root
npm run create:backend ~/my-backend-instance

# Or directly
node playbooks/create-backend-instance.js ~/my-backend-instance
```

### Create a Client Instance

```bash
npm run create:client ~/my-client-instance
```

## Files

### Playbooks

- **`backend-instance-playbook.md`** - Documentation for backend instance playbook
- **`client-instance-playbook.md`** - Documentation for client instance playbook
- **`CLAUDE-md-templates.md`** - Templates for CLAUDE.md configuration files

### Scripts

- **`create-backend-instance.js`** - Script to create backend instances
- **`create-client-instance.js`** - Script to create client instances

## Usage

### Backend Instance

A backend instance is a permanent Claude Code instance configured to:
- Serve as an MCP server backend
- Handle tool execution (update_ui, log_thought)
- Communicate with browser via WebSocket
- Provide stable, persistent backend service

**Example:**
```javascript
import { createBackendInstance } from './playbooks/create-backend-instance.js';

const result = await createBackendInstance('/path/to/backend', {
  model: 'sonnet',
  mcpServerPath: '/path/to/server-mcp.js',
  port: 3000
});
```

### Client Instance

A client instance connects to a backend MCP server for testing and development.

**Example:**
```javascript
import { createClientInstance } from './playbooks/create-client-instance.js';

const result = await createClientInstance('/path/to/client', {
  model: 'sonnet',
  mcpServerPath: '/path/to/server-mcp.js'
});
```

## Configuration

### CLAUDE.md

Each instance has a `CLAUDE.md` file that documents:
- Purpose of the instance
- Configuration details
- Behavior guidelines
- Available MCP tools

### .claude/settings.json

Claude Code settings including:
- Model selection
- MCP server configuration
- System prompt
- Tool configuration

### claude_config.json

MCP configuration file used by `--mcp-config` flag:
- MCP server definitions
- Server command and args

## Testing

Run tests to verify playbooks work correctly:

```bash
# Test backend playbooks
npm run test:backend-playbooks

# Test CLAUDE.md configuration
npm run test:claude-md

# Test MCP tool configuration
npm run test:mcp-tools

# Test end-to-end
npm run test:backend-e2e
```

## See Also

- `PLAYBOOKS-SUMMARY.md` - Comprehensive summary of all playbooks
- `../test-backend-playbooks.js` - Backend playbook tests
- `../test-claude-md-configuration.js` - CLAUDE.md tests
- `../test-mcp-tool-configuration.js` - MCP tool tests
- `../test-backend-e2e.js` - End-to-end tests

