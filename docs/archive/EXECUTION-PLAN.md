# Execution Plan - Next Steps

## Current Status

✅ **Implementation Complete**
- All components built (MCP server, browser frontend, backend instances)
- All test suites created (70+ tests)
- Documentation complete
- Cleanup done (API-based code archived)

⚠️ **Testing Required**
- Prerequisites need to be verified
- Browser connection needs testing
- Visual verification needed
- Integration test pending

## The Plan

### Phase 1: Test All Prerequisites ✅ → ⚠️

**Goal:** Verify all foundational components work before integration

**Steps:**

1. **Verify Claude CLI is Installed**
   ```bash
   which claude
   ```
   
   Claude CLI handles its own authentication - no API key needed.

2. **Run All Prerequisites**
   ```bash
   npm run test:all-prerequisites
   ```
   
   This runs 8 test suites sequentially:
   - Browser prerequisites (16 tests)
   - Isolated primitives (8 tests)
   - MCP tool configuration (8 tests)
   - Backend playbooks (10 tests)
   - Conversation management (8 tests)
   - CLAUDE.md configuration (7 tests)
   - Claude tools execution (3 tests)
   - Backend E2E (10 tests)

3. **Fix Any Failures**
   - Review test output
   - Fix issues
   - Re-run until all pass

**Success Criteria:**
- ✅ All 70+ tests pass
- ✅ No errors or warnings
- ✅ All components verified working

---

### Phase 2: Test Browser Connection ⚠️

**Goal:** Verify browser can connect and receive messages

**Steps:**

1. **Run Browser Connection Test**
   ```bash
   npm run test:browser-connection
   ```
   
   This will:
   - Start MCP server
   - Connect WebSocket programmatically
   - Run tool calls via Claude CLI
   - Verify messages received
   - Keep server running for manual testing

2. **Verify Server Starts**
   - Check server logs show "Local Imagine Server running"
   - Verify port 3000 is listening
   - Check WebSocket server started

3. **Verify WebSocket Connection**
   - Check test output shows "Browser WebSocket connected"
   - Verify messages are received
   - Check message format is correct

**Success Criteria:**
- ✅ Server starts successfully
- ✅ WebSocket connects
- ✅ Messages received correctly
- ✅ Tool execution works

---

### Phase 3: Visual Verification ⚠️

**Goal:** Verify UI updates appear in actual browser

**Steps:**

1. **Start Server**
   ```bash
   node server-mcp.js
   ```
   
   Keep this running in a terminal.

2. **Open Browser**
   - Navigate to `http://localhost:3000`
   - Open browser DevTools console
   - Verify "Connected to Relay" appears in sidebar

3. **Run Claude CLI**
   ```bash
   claude --print \
     --mcp-config ./claude_config.json \
     --dangerously-skip-permissions \
     "Use mcp__imagine__log_thought to log 'Hello from Claude!'"
   ```

4. **Verify Log Message**
   - Check sidebar shows "Hello from Claude!"
   - Verify message appears in "Agent Thoughts"

5. **Test UI Update**
   ```bash
   claude --print \
     --mcp-config ./claude_config.json \
     --dangerously-skip-permissions \
     "Use mcp__imagine__update_ui to create a header with text 'Hello World'"
   ```

6. **Verify UI Update**
   - Check main container (#app) updates
   - Verify HTML appears correctly
   - Check DOM patching works (no flicker)

**Success Criteria:**
- ✅ Browser connects to server
- ✅ Log messages appear in sidebar
- ✅ UI updates appear in main container
- ✅ DOM patching works smoothly
- ✅ No errors in browser console

---

### Phase 4: Integration Test ⚠️

**Goal:** Test complete end-to-end flow

**Steps:**

1. **Create Backend Instance**
   ```bash
   npm run create:backend ~/test-backend
   ```

2. **Start Backend Instance**
   ```bash
   cd ~/test-backend
   ./start.sh
   ```

3. **Open Browser**
   - Navigate to `http://localhost:3000`
   - Verify connection

4. **Run Complex Prompt**
   ```bash
   claude --print \
     --mcp-config ~/test-backend/claude_config.json \
     --dangerously-skip-permissions \
     "Build a calculator UI. First log your plan, then create a calculator with buttons 0-9, +, -, *, /, and ="
   ```

5. **Verify Complete Flow**
   - Check logs appear in sidebar
   - Verify calculator UI appears
   - Test calculator functionality (if interactive)
   - Verify multiple tool calls work

**Success Criteria:**
- ✅ Backend instance works
- ✅ Complete flow works end-to-end
- ✅ Multiple tool calls work
- ✅ Complex UI builds correctly
- ✅ All components integrate properly

---

## Quick Reference

### Test Commands

```bash
# All prerequisites
npm run test:all-prerequisites

# Individual tests
npm run test:browser-prerequisites
npm run test:isolated-primitives
npm run test:mcp-tools
npm run test:backend-playbooks
npm run test:conversations
npm run test:claude-md
npm run test:claude-tools
npm run test:backend-e2e

# Browser connection
npm run test:browser-connection
```

### Server Commands

```bash
# Start server
node server-mcp.js

# Create backend instance
npm run create:backend ~/my-backend

# Start backend instance
cd ~/my-backend && ./start.sh
```

### Claude CLI Commands

```bash
# Basic tool call
claude --print \
  --mcp-config ./claude_config.json \
  --dangerously-skip-permissions \
  "Your prompt here"

# With backend instance
claude --print \
  --mcp-config ~/my-backend/claude_config.json \
  --dangerously-skip-permissions \
  "Your prompt here"
```

---

## Current Priority

**NEXT STEP: Phase 1 - Test All Prerequisites**

1. Verify Claude CLI is installed: `which claude`
2. Run `npm run test:all-prerequisites`
3. Fix any failures
4. Proceed to Phase 2 once all pass

**Note:** OAuth credentials are automatically copied for isolated instances. No API key needed if Claude CLI is pre-authenticated.

---

## Troubleshooting

### Tests Fail
- Check API key is set
- Verify Claude CLI is installed
- Check server-mcp.js path in claude_config.json
- Review test output for specific errors

### Server Won't Start
- Check port 3000 is available: `lsof -i :3000`
- Verify dependencies installed: `npm install`
- Check Node.js version: `node -v` (v20+)

### Browser Won't Connect
- Verify server is running
- Check browser console for errors
- Verify WebSocket URL: `ws://localhost:3000`

### Tools Don't Work
- Verify browser is connected (check server logs)
- Check tool names match exactly: `mcp__imagine__update_ui`, `mcp__imagine__log_thought`
- Verify Claude CLI can see tools: Ask Claude "What MCP tools do you have?"

---

## Timeline Estimate

- **Phase 1:** 30-60 minutes (depending on test failures)
- **Phase 2:** 15-30 minutes
- **Phase 3:** 15-30 minutes
- **Phase 4:** 30-60 minutes

**Total:** ~2-3 hours to complete all phases

---

## Success Definition

✅ All phases complete when:
- All prerequisite tests pass
- Browser connects successfully
- UI updates appear correctly
- End-to-end flow works
- Backend instances work
- Ready for production use

