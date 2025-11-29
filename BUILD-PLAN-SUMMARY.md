# Build Plan Summary - Claude Imagine

## What We're Building

**Claude Imagine** - A system where Claude CLI builds and manages browser UIs in real-time using MCP tools.

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

## Current Status

### ✅ Completed (Implementation)

1. **MCP Server** (`server-mcp.js`)
   - Express HTTP server (port 3000)
   - WebSocket server for browser
   - MCP stdio transport for Claude CLI
   - Two tools: `update_ui` and `log_thought`

2. **Browser Frontend** (`index.html`)
   - WebSocket client
   - DOM patching with morphdom
   - Sidebar for logs
   - Main container for UI updates

3. **Backend Infrastructure**
   - Backend instance playbooks
   - Isolated instance creation
   - OAuth credential copying
   - Conversation management

4. **Test Suites** (70+ tests)
   - All prerequisite tests created
   - Component tests created
   - Integration readiness tests created

### ⚠️ Pending (Testing & Verification)

1. **Prerequisites Testing**
   - Run all 70+ tests
   - Verify all components work

2. **Browser Connection**
   - Test WebSocket connection
   - Verify messages flow

3. **Visual Verification**
   - Open browser
   - See UI updates
   - Verify DOM patching

4. **Integration Test**
   - End-to-end flow
   - Complex UI building
   - Multiple tool calls

## The Plan - 4 Phases

### Phase 1: Test All Prerequisites ⚠️

**Goal:** Verify all foundational components work

**Action:**
```bash
# Verify Claude CLI installed
which claude

# Run all prerequisite tests
npm run test:all-prerequisites
```

**Tests:**
- Browser prerequisites (16 tests)
- Isolated primitives (8 tests)
- MCP tool configuration (8 tests)
- Backend playbooks (10 tests)
- Conversation management (8 tests)
- CLAUDE.md configuration (7 tests)
- Claude tools execution (3 tests)
- Backend E2E (10 tests)

**Success:** All 70+ tests pass

---

### Phase 2: Test Browser Connection ⚠️

**Goal:** Verify browser can connect and receive messages

**Action:**
```bash
npm run test:browser-connection
```

**Verifies:**
- Server starts
- WebSocket connects
- Messages received
- Tool execution works

**Success:** Server starts, WebSocket connects, messages flow

---

### Phase 3: Visual Verification ⚠️

**Goal:** Verify UI updates appear in actual browser

**Action:**
1. Start server: `node server-mcp.js`
2. Open browser: `http://localhost:3000`
3. Run Claude CLI:
   ```bash
   claude --print \
     --mcp-config ./claude_config.json \
     --dangerously-skip-permissions \
     "Use mcp__imagine__update_ui to create a header with text 'Hello World'"
   ```
4. Verify UI updates appear

**Success:** Browser shows logs and UI updates correctly

---

### Phase 4: Integration Test ⚠️

**Goal:** Test complete end-to-end flow

**Action:**
1. Create backend instance: `npm run create:backend ~/test-backend`
2. Start it: `cd ~/test-backend && ./start.sh`
3. Open browser: `http://localhost:3000`
4. Run complex prompt:
   ```bash
   claude --print \
     --mcp-config ~/test-backend/claude_config.json \
     --dangerously-skip-permissions \
     "Build a calculator UI. First log your plan, then create a calculator with buttons 0-9, +, -, *, /, and ="
   ```
5. Verify complete flow works

**Success:** End-to-end flow works, complex UI builds correctly

---

## Next Step

**Phase 1: Test All Prerequisites**

```bash
# Verify Claude CLI installed
which claude

# Run all tests
npm run test:all-prerequisites
```

## What We're Building

A system where:
1. **Claude CLI** (backend) processes requests
2. **MCP Server** (relay) bridges CLI and browser
3. **Browser** (frontend) displays UI updates
4. **Tools** (`update_ui`, `log_thought`) enable UI building

**Goal:** Claude can build and manage browser UIs in real-time.

## Key Features

- ✅ Real-time UI building
- ✅ Logging to sidebar
- ✅ DOM patching (preserves state)
- ✅ Isolated instances
- ✅ Backend instances (permanent)
- ✅ OAuth authentication support

## Timeline

- **Phase 1:** 30-60 minutes
- **Phase 2:** 15-30 minutes
- **Phase 3:** 15-30 minutes
- **Phase 4:** 30-60 minutes

**Total:** ~2-3 hours to complete all phases

