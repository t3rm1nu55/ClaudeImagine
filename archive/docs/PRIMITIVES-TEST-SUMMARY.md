# Primitives Test Summary

## Overview

The `test-isolated-primitives.js` test suite verifies all core primitives using an isolated Claude CLI instance. This ensures each test runs in a completely clean environment with no conversation history or shared state.

## Primitives Tested

### 1. ✅ Isolated Instance Creation
**What it tests:**
- Can create an isolated Claude CLI instance
- Instance responds correctly
- Uses temporary config directory
- Auto-cleanup works

**Verification:**
- Instance creates successfully
- Returns valid response
- No errors in creation process

### 2. ✅ MCP Server Connection
**What it tests:**
- Isolated instance can connect to MCP server
- MCP tools are visible to Claude
- Server communication works

**Verification:**
- MCP tools appear in tool list
- Connection established successfully
- Tools are accessible

### 3. ✅ Tool Discovery
**What it tests:**
- Both tools (`log_thought`, `update_ui`) are discoverable
- Tool names are correct
- Tool descriptions are accessible

**Verification:**
- `mcp__imagine__log_thought` found
- `mcp__imagine__update_ui` found
- Both tools listed correctly

### 4. ✅ log_thought Tool Execution
**What it tests:**
- Tool can be called by Claude
- Message sent via WebSocket
- Message content is correct
- WebSocket receives LOG message

**Verification:**
- LOG message received
- Message content matches expected
- WebSocket flow works

### 5. ✅ update_ui Tool Execution
**What it tests:**
- Tool can be called by Claude
- HTML sent via WebSocket
- UPDATE_DOM message received
- HTML content is correct

**Verification:**
- UPDATE_DOM message received
- HTML content matches expected
- Selector is correct (#app)

### 6. ✅ Combined Tool Calls
**What it tests:**
- Multiple tools can be called in sequence
- Both messages received via WebSocket
- Order is preserved
- No interference between calls

**Verification:**
- LOG message received
- UPDATE_DOM message received
- Both in correct order
- No missing messages

### 7. ✅ Isolation Verification
**What it tests:**
- Each isolated instance is independent
- No conversation history between instances
- Fresh start every time
- No shared state

**Verification:**
- New instance doesn't remember previous conversation
- Each call is independent
- No state leakage

### 8. ✅ WebSocket Message Flow
**What it tests:**
- Messages flow from MCP server to WebSocket
- Message format is correct
- Message types are correct
- No message loss

**Verification:**
- Messages received via WebSocket
- Correct message types (LOG, UPDATE_DOM)
- Message format is valid JSON
- No errors in flow

## Running the Tests

### Prerequisites

1. **Set Auth Token:**
   ```bash
   export ANTHROPIC_API_KEY="your-anthropic-api-key"
   ```

2. **Dependencies Installed:**
   ```bash
   npm install
   ```

3. **MCP Server Available:**
   - `server-mcp.js` must exist
   - Server must be able to start

### Run All Tests

```bash
npm run test:isolated-primitives
```

Or directly:
```bash
node test-isolated-primitives.js
```

### Expected Output

```
============================================================
🧪 Testing All Primitives with Isolated Claude Instance
============================================================

📋 Setup Phase
──────────────────────────────────────────────────────────

1️⃣  Cleaning up port 3000...
2️⃣  Starting MCP server...
   ✅ Server running
3️⃣  Connecting browser WebSocket...
   ✅ WebSocket connected

📋 Primitive Tests
──────────────────────────────────────────────────────────

🧪 Testing: 1. Isolated Instance Creation
──────────────────────────────────────────────────────────
   ✅ Isolated instance created successfully
   📝 Response length: 123 characters
✅ PASS: 1. Isolated Instance Creation

🧪 Testing: 2. MCP Server Connection
──────────────────────────────────────────────────────────
   ✅ MCP server connected
   📝 Tools visible: log_thought
✅ PASS: 2. MCP Server Connection

... (more tests)

📊 Test Summary
============================================================

✅ Passed: 8/8
❌ Failed: 0/8

🎉 All primitives tested successfully!
✅ Isolated Claude instance working correctly
✅ MCP server integration verified
✅ Tool execution confirmed
✅ WebSocket flow validated
```

## Test Architecture

```
┌─────────────────┐
│  Test Runner    │
└────────┬────────┘
         │
         ├─► createIsolatedClaudeWithMCP()
         │   └─► Creates temp config
         │   └─► Spawns Claude CLI
         │   └─► Claude CLI spawns MCP server
         │
         ├─► MCP Server (server-mcp.js)
         │   ├─► MCP stdio (Claude CLI)
         │   └─► HTTP/WebSocket (Browser)
         │
         └─► WebSocket Client
             └─► Receives tool messages
```

## What Makes This Test Suite Special

### 1. Complete Isolation
- Each test uses a fresh isolated instance
- No conversation history
- No shared state
- Temporary config directories

### 2. End-to-End Testing
- Tests the complete flow:
  - Claude CLI → MCP Server → WebSocket → Browser
- Verifies actual message delivery
- Tests real tool execution

### 3. Comprehensive Coverage
- Tests all core primitives
- Verifies isolation works
- Confirms WebSocket flow
- Validates tool execution

### 4. Real-World Scenarios
- Uses actual Claude CLI
- Real MCP server
- Real WebSocket communication
- Actual tool calls

## Troubleshooting

### Auth Token Not Set
```bash
export ANTHROPIC_API_KEY="your-token"
```

### Port Already in Use
```bash
lsof -ti:3000 | xargs kill -9
```

### MCP Server Not Found
- Ensure `server-mcp.js` exists
- Check path is correct
- Verify server can start

### WebSocket Connection Fails
- Check server is running
- Verify port 3000 is accessible
- Check firewall settings

## Next Steps

After all primitives pass:
1. ✅ Core functionality verified
2. ✅ Isolation working correctly
3. ✅ Ready for production use
4. ✅ Can build on these primitives

## Integration with Other Tests

This test suite complements:
- `test-progressive.js` - Infrastructure tests
- `test-e2e-simple.js` - Simple end-to-end
- `test-claude-tools.js` - Tool execution with regular Claude CLI

All together, they provide comprehensive coverage of the system.

