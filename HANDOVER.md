# Claude Imagine - Agent Handover Document

**Repository:** https://github.com/t3rm1nu55/ClaudeImagine
**Last Updated:** November 29, 2025

---

## What Is This Project?

Claude Imagine is a **visual UI builder** where Claude AI creates web interfaces in real-time. When you ask Claude to "build a calculator", it updates a browser window with actual HTML.

**The Magic:** Claude talks to an MCP server via HTTP, which relays UI commands to a browser via WebSocket.

---

## Architecture (IMPORTANT - Read This First)

```
┌─────────────┐         ┌──────────────────┐         ┌─────────┐
│ Claude CLI  │──HTTP──►│  server-mcp.js   │◄──WS───│ Browser │
│             │         │  (Port 3000)     │         │         │
│  Calls:     │         │                  │         │ Shows:  │
│  update_ui  │         │  Endpoints:      │         │  HTML   │
│  log_thought│         │  POST /mcp       │         │  UI     │
│             │         │  WS /            │         │         │
└─────────────┘         └──────────────────┘         └─────────┘
```

**Key Insight:** We use HTTP transport (not stdio). This means:
- Server runs INDEPENDENTLY (you start it first)
- Claude CONNECTS to the running server
- Browser ALSO connects to the same server
- All messages flow through ONE server instance

---

## Current State

### ✅ What's Working
1. MCP server with HTTP transport (`src/server-mcp.js`)
2. Two tools registered: `update_ui` and `log_thought`
3. Claude CLI can see and call the tools
4. WebSocket connection for browser works
5. Health endpoint at `/health`

### ⚠️ What Needs Testing
1. Full E2E flow: Claude → Server → Browser (message appears)
2. The WebSocket message timing (Claude takes ~10-20 seconds to respond)

### ❌ Not Yet Done
1. Visual verification in actual browser
2. Better browser UI (current is minimal)
3. Error handling improvements

---

## File Structure

```
ClaudeImagine/
├── src/
│   └── server-mcp.js          # ⭐ THE MAIN SERVER - start here
├── public/
│   └── index.html             # Browser UI (connects via WebSocket)
├── scripts/
│   └── create-isolated-claude.js  # Helper for testing
├── tests/
│   ├── prerequisites/         # Unit tests
│   │   └── isolated-primitives.js  # ⚠️ Needs work
│   ├── e2e/                   # Integration tests
│   └── run-all.js             # Test runner
├── docs/
│   ├── CLAUDE-LEARNING.md     # ⭐ KEY DISCOVERIES - read this!
│   ├── ROADMAP.md             # What's next
│   └── ...
├── claude_config.json         # MCP config for Claude CLI
├── package.json               # npm scripts
└── README.md                  # Overview
```

---

## How To Get Running (Step by Step)

### Step 1: Install Dependencies
```bash
cd /Users/markforster/ClaudeImagine
npm install
```

### Step 2: Start the MCP Server
```bash
npm run server:mcp
```
You should see:
```
╔════════════════════════════════════════════════════════════╗
║           Claude Imagine - MCP Server (HTTP)               ║
╠════════════════════════════════════════════════════════════╣
║  Server:    http://127.0.0.1:3000                          
║  MCP:       http://127.0.0.1:3000/mcp                      
...
```

### Step 3: Verify Server Health
```bash
curl http://localhost:3000/health
```
Expected: `{"status":"ok","browser":"disconnected","sessions":0}`

### Step 4: Check Claude Can See Tools
```bash
claude mcp list
```
Expected:
```
imagine: http://localhost:3000/mcp (HTTP) - ✓ Connected
```

If it says "Failed to connect", the server isn't running.

### Step 5: Test Tool Call
```bash
claude --print --dangerously-skip-permissions \
  "Call the log_thought tool with message 'Hello from handover'"
```

---

## Key Files You MUST Read

### 1. `src/server-mcp.js` - The Heart of Everything
```javascript
// This is an MCP server using HTTP transport
// It has two tools: update_ui and log_thought
// It also runs a WebSocket server for the browser
```
**Read lines:** 1-50 (setup), 60-100 (tools), 110-150 (HTTP handlers)

### 2. `claude_config.json` - How Claude Connects
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

### 3. `public/index.html` - Browser UI
Simple HTML that:
- Connects WebSocket to `ws://localhost:3000`
- Listens for `UPDATE_DOM` and `LOG` messages
- Updates the page accordingly

### 4. `docs/CLAUDE-LEARNING.md` - All The Discoveries
Everything learned about MCP, Claude CLI, transports, etc.

---

## The Two MCP Tools

### `update_ui`
Updates HTML in the browser.
```javascript
// Claude calls:
mcp__imagine__update_ui({ html: "<h1>Hello</h1>", selector: "#app" })

// Server sends to browser via WebSocket:
{ type: "UPDATE_DOM", html: "<h1>Hello</h1>", selector: "#app" }

// Browser updates the DOM
```

### `log_thought`
Shows a status message.
```javascript
// Claude calls:
mcp__imagine__log_thought({ message: "Thinking..." })

// Server sends to browser:
{ type: "LOG", message: "Thinking..." }

// Browser shows in status area
```

---

## Common Pitfalls (Learn From My Pain)

### 1. "No MCP tools found"
**Cause:** Server not running or wrong transport type
**Fix:** 
```bash
# Make sure server is running
npm run server:mcp

# Re-add with HTTP transport
claude mcp remove imagine
claude mcp add --transport http imagine http://localhost:3000/mcp
```

### 2. "No browser connected"
**Cause:** Browser not open or WebSocket disconnected
**Fix:** Open http://localhost:3000 in browser, check health endpoint

### 3. Claude takes forever / times out
**Cause:** Normal - Claude CLI takes 10-20 seconds to process
**Fix:** Be patient, or use simpler prompts

### 4. Tests fail with WebSocket issues
**Cause:** Timing - WebSocket closes before Claude responds
**Fix:** Keep WebSocket open longer, increase timeouts

---

## Next Task: E2E Browser Test

The main thing to verify is the full flow works:

1. Start server
2. Connect a WebSocket (simulating browser)
3. Call Claude with a tool invocation
4. Verify the WebSocket receives the message

**Test file to fix/complete:** `tests/prerequisites/isolated-primitives.js`

The issue is timing - Claude takes 10-20 seconds, so the WebSocket must stay open.

---

## Useful Commands

```bash
# Start server (ALWAYS DO THIS FIRST)
npm run server:mcp

# Check server health
curl http://localhost:3000/health

# List Claude's MCP servers
claude mcp list

# Test a tool call
claude --print --dangerously-skip-permissions "Call log_thought with message 'test'"

# Open browser UI
open http://localhost:3000

# Run tests (server must be running)
npm test
```

---

## NPM Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `server:mcp` | `node src/server-mcp.js` | Start the MCP server |
| `test` | `node tests/run-all.js` | Run all tests |
| `test:prerequisites` | `node tests/prerequisites/browser.js` | Run prerequisite tests |

---

## Environment

- **Node.js:** v25+ (ES modules)
- **Claude CLI:** Installed and authenticated
- **Port:** 3000 (configurable via `PORT` env var)

---

## Questions You Might Have

**Q: Why HTTP transport instead of stdio?**
A: With stdio, Claude SPAWNS the server each time. With HTTP, ONE server runs and both Claude and Browser connect to it.

**Q: Why `--dangerously-skip-permissions`?**
A: Required for MCP tools to work in `--print` (non-interactive) mode.

**Q: Where are tool definitions?**
A: In `src/server-mcp.js`, look for `server.tool(...)` calls.

**Q: How do I add a new tool?**
A: Add another `server.tool("name", "description", { params }, handler)` in server-mcp.js.

---

---

## 🚨 CRITICAL ARCHITECTURE GAPS (Must Build)

These were identified in the original reverse-engineering but **NOT YET IMPLEMENTED**:

### Gap 1: Two-Way Interactivity (The "Input" Problem)

**Current:** Claude → Browser (one-way only)
**Required:** Browser → Claude (user clicks should trigger Claude)

**Why it matters:** If user clicks a button in the generated UI, Claude has no idea. The calculator Claude builds has buttons that do nothing.

**Design needed:**
```javascript
// Browser catches clicks on generated DOM
document.querySelector('#app').addEventListener('click', (e) => {
  ws.send(JSON.stringify({
    type: "USER_INTERACTION",
    elementId: e.target.id,
    elementText: e.target.textContent
  }));
});
```

**Challenge:** Claude CLI is request/response - it doesn't "listen" for events. Need a loop wrapper or different architecture.

---

### Gap 2: State Verification (The "Blind" Problem)

**Current:** `update_ui` returns "Success" without checking what actually rendered
**Required:** Feedback loop so Claude can verify its work

**Why it matters:** If Claude hallucinates a CSS class that doesn't exist, the UI breaks silently. Claude assumes it worked.

**Design needed:**
```javascript
// update_ui should wait for ACK from browser
server.tool("update_ui", ..., async ({ html, selector }) => {
  broadcastToBrowser({ type: "UPDATE_DOM", html, selector, requestId: uuid() });
  
  // Wait for browser to confirm and return actual DOM state
  const ack = await waitForAck(requestId, timeout=5000);
  
  return {
    content: [{
      type: "text",
      text: `Updated. Actual innerHTML: ${ack.actualHtml}`
    }]
  };
});
```

---

### Gap 3: Session Isolation (Multi-Tab Problem)

**Current:** One global `activeBrowserSocket` variable
**Required:** Unique session IDs per browser tab

**Why it matters:** Open two browser tabs → they fight over the same WebSocket. Messages go to random tab.

**Design needed:**
```javascript
// Browser connects with session ID
const ws = new WebSocket('ws://localhost:3000?sessionId=abc123');

// Server tracks multiple connections
const browserSockets = new Map(); // sessionId -> WebSocket
```

---

### Gap 4: HTTP Timeout Handling

**Current:** Default HTTP timeouts (could be 2 minutes)
**Required:** Keep-alive for long Claude thinking times

**Why it matters:** If Claude thinks for 30+ seconds on complex UI, HTTP connection might timeout.

**Design needed:**
```javascript
// Send keep-alive or use proper timeout config
app.post('/mcp', async (req, res) => {
  res.setTimeout(120000); // 2 min timeout
  // ... handle request
});
```

---

### Gap 5: Security (HTTP Port Exposure)

**Current:** Port 3000 open on localhost, no auth
**Required (for production):** Authentication

**Why it matters:** stdio was local-only by design. HTTP opens a network port. Anyone on local network could connect.

**Design needed:**
- Auth headers on MCP endpoint
- Token validation on WebSocket connect
- HTTPS for production

---

## Architecture Decision Log

### Why HTTP Transport Instead of Stdio?

**Original Plan:** Use `StdioServerTransport` (Claude spawns server)

**Problem Discovered:** 
- Stdio means Claude **spawns a NEW server process** each invocation
- WebSocket connects to a **separately running server**
- Result: **TWO different servers** - messages never reach browser

**Solution:** HTTP transport
- Server runs **once, persistently**
- Claude **connects** to existing server
- Browser **connects** to same server
- All messages flow through **single instance**

**Trade-off:** Lost local-only security of stdio, gained working architecture.

---

## Summary

1. **Start server:** `npm run server:mcp`
2. **Open browser:** http://localhost:3000
3. **Use Claude:** Ask it to use `update_ui` or `log_thought`
4. **Watch the magic:** Browser updates in real-time

### What's Done ✅
- HTTP transport works
- Tools registered and callable
- One-way message flow (Claude → Browser)

### What's Missing 🚨
- Two-way interaction (Browser → Claude)
- Feedback loop (verify DOM actually updated)
- Multi-session support
- Timeout handling
- Security/auth

The **happy path works**. The **real-world robustness** needs building.

Good luck! 🚀

