# Claude Imagine - Architecture & Execution Roadmap

## Architecture Overview
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

## Execution Phases

### Phase 1: Prerequisites Verification ✅
**Goal:** Verify all foundational components work before integration.
- [x] Verify Claude CLI installation & authentication (OAuth)
- [x] Test Browser Prerequisites (Models, Tools, Agents)
- [x] Test Isolated Primitives (CLI isolation, config copying)
- [x] Test MCP Tool Configuration
- [x] Test Backend Playbooks
- [x] Test Conversation Management

**Status:** All prerequisite tests passing.

### Phase 2: Browser Connection ⚠️
**Goal:** Verify browser can connect and receive messages.
1. **Run Browser Connection Test** (`npm run test:browser-connection`)
   - Starts MCP server
   - Connects WebSocket
   - Runs tool calls via Claude CLI
   - Verifies message reception

**Success Criteria:**
- Server starts on port 3000
- WebSocket connects
- Messages received correctly
- Tool execution works

### Phase 3: Visual Verification ⚠️
**Goal:** Verify UI updates appear in actual browser.
1. Start Server: `node server-mcp.js`
2. Open `http://localhost:3000`
3. Run manual Claude CLI command to `log_thought` and `update_ui`
4. Visually confirm sidebar logs and DOM updates (morphdom)

### Phase 4: Full Integration ⚠️
**Goal:** Test complete end-to-end flow with a persistent backend instance.
1. Create backend instance: `npm run create:backend ~/test-backend`
2. Start backend: `cd ~/test-backend && ./start.sh`
3. Open Browser: `http://localhost:3000`
4. Run complex UI generation prompt via CLI
5. Verify end-to-end functionality

## File Structure & Components

### Core Components
- `server-mcp.js`: Express + WebSocket + MCP Relay
- `index.html`: Frontend with morphdom & Tailwind
- `claude_config.json`: MCP Configuration for CLI
- `.claude/`: Standard project configuration (Agents, Skills)

### Documentation
- `docs/architecture/`: Architecture decisions, security, and MCP setup
- `docs/guides/`: User guides, quick start, and isolated instances
- `docs/archive/`: Historical implementation logs and superseded plans

## Testing Strategy
- **Unit/Prerequisite Tests:** `npm run test:all-prerequisites`
- **Browser Connection:** `npm run test:browser-connection`
- **End-to-End:** Manual verification + `test-backend-e2e.js`

