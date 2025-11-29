# Playbooks Summary

## Overview

This document summarizes the playbooks for creating permanent Claude Code instances that can serve as MCP server backends for Claude Imagine.

## Purpose

These playbooks enable you to:
- Create permanent backend instances for Claude Imagine
- Configure behavior using CLAUDE.md files
- Set up tools and MCP servers
- Control instance behavior via configuration
- Use these instances as permanent MCP backends

## Playbooks

### 1. Backend Instance Playbook

**File:** `playbooks/backend-instance-playbook.md`

**Purpose:** Creates a permanent Claude Code instance configured as an MCP server backend.

**Features:**
- MCP server configuration
- Tool configuration (MCP tools only)
- CLAUDE.md documentation
- Start script for easy startup
- Production-ready settings

**Usage:**
```bash
npm run create:backend [path]
```

**Or programmatically:**
```javascript
import { createBackendInstance } from './playbooks/create-backend-instance.js';

const result = await createBackendInstance('/path/to/backend', {
  model: 'sonnet',
  mcpServerPath: '/path/to/server-mcp.js'
});
```

### 2. Client Instance Playbook

**File:** `playbooks/client-instance-playbook.md`

**Purpose:** Creates a Claude Code instance that connects to a backend MCP server.

**Features:**
- Connects to backend MCP server
- Test and development configuration
- Tool access for testing

**Usage:**
```bash
npm run create:client [path]
```

### 3. CLAUDE.md Templates

**File:** `playbooks/CLAUDE-md-templates.md`

**Purpose:** Provides templates for configuring Claude Code instances via CLAUDE.md files.

**Templates:**
- Backend Instance Template
- Client Instance Template
- Development Instance Template
- Production Instance Template
- Custom Agent Instance Template

## Test Suites

### 1. Backend Playbooks Test

**File:** `test-backend-playbooks.js`

**Purpose:** Tests the creation and configuration of backend instances.

**Tests:**
1. Backend instance creation
2. CLAUDE.md configuration
3. Settings configuration
4. MCP config creation
5. Tool configuration
6. Instance startup
7. Tool execution
8. Custom agents
9. Persistence
10. Isolation

**Run:**
```bash
npm run test:backend-playbooks
```

### 2. CLAUDE.md Configuration Test

**File:** `test-claude-md-configuration.js`

**Purpose:** Tests that CLAUDE.md files correctly configure instances.

**Tests:**
1. CLAUDE.md exists
2. Content structure
3. MCP tools documentation
4. Custom configuration
5. Agent configuration
6. Behavior influence
7. Multiple instances

**Run:**
```bash
npm run test:claude-md
```

### 3. MCP Tool Configuration Test

**File:** `test-mcp-tool-configuration.js`

**Purpose:** Tests that MCP tools are correctly configured and accessible.

**Tests:**
1. MCP config structure
2. Tools available
3. Tool execution
4. Update UI tool
5. Combined tools
6. Config in settings
7. Tools with agents
8. Error handling

**Run:**
```bash
npm run test:mcp-tools
```

### 4. Backend E2E Test

**File:** `test-backend-e2e.js`

**Purpose:** End-to-end test of backend instances as permanent MCP backends.

**Tests:**
1. Instance creation
2. Configuration
3. Tool execution
4. Persistence
5. Multiple clients
6. Custom agents
7. Start script
8. Isolation
9. Production readiness
10. Documentation

**Run:**
```bash
npm run test:backend-e2e
```

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

## Configuration Files

### CLAUDE.md

Located in instance root directory. Documents:
- Purpose of the instance
- Configuration details
- Behavior guidelines
- Available MCP tools

### Conversation History

Each instance stores conversation history in:
```
{instance-path}/.claude/projects/
```

Conversation IDs can be:
- Extracted from JSON output (`--output-format json`)
- Read using `utils/conversation-manager.js`
- Configured via `CLAUDE_CONFIG_DIR` environment variable

See `CONVERSATION-MANAGEMENT.md` for details.

### .claude/settings.json

Claude Code settings:
- Model selection
- MCP server configuration
- System prompt
- Tool configuration

### claude_config.json

MCP configuration file:
- MCP server definitions
- Server command and args
- Used by `--mcp-config` flag

### start.sh

Startup script for the instance:
- Changes to instance directory
- Starts Claude CLI with MCP config
- Includes `--dangerously-skip-permissions` flag

## Usage Workflow

### 1. Create Backend Instance

```bash
npm run create:backend ~/claude-imagine-backend
```

### 2. Configure Instance

Edit `CLAUDE.md` and `.claude/settings.json` as needed.

### 3. Start Instance

```bash
cd ~/claude-imagine-backend
./start.sh
```

### 4. Use as Backend

The instance now serves as an MCP backend:
- Handles tool execution
- Communicates with browser via WebSocket
- Maintains persistent state

## Testing

Run all tests:

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

## Best Practices

1. **Isolation:** Each backend instance should be isolated from your main Claude setup
2. **Documentation:** Always document instance purpose in CLAUDE.md
3. **Configuration:** Use `.claude/settings.json` for Claude Code settings
4. **MCP Config:** Use `claude_config.json` for MCP server configuration
5. **Testing:** Run all test suites before deploying to production
6. **Persistence:** Backend instances persist configuration across restarts
7. **Security:** Use `--dangerously-skip-permissions` only in controlled environments

## Next Steps

1. Create your backend instance
2. Configure it for your use case
3. Test it thoroughly
4. Deploy as permanent MCP backend
5. Monitor and maintain

