# Claude Imagine - Roadmap

## Current Status: HTTP Transport Implemented ✅

The core architecture has been refactored to use HTTP transport instead of stdio. This allows:
- Single server instance handles both Claude (HTTP) and Browser (WebSocket)
- Server runs independently, Claude connects to it
- No more conflicting server instances

## Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌─────────┐
│ Claude CLI  │──HTTP──►│  server-mcp.js   │◄──WS───│ Browser │
│             │         │                  │         │         │
│  POST /mcp  │         │  MCP Server:     │         │  UI     │
│  (tools)    │         │  - update_ui     │         │  Canvas │
│             │         │  - log_thought   │         │         │
└─────────────┘         └──────────────────┘         └─────────┘
```

**Current Flow:** One-way (Claude → Browser)
**Required Flow:** Two-way (Claude ↔ Browser)

---

## Completed ✅

### Phase 1: Research & Foundation
- [x] Understand Claude CLI capabilities
- [x] Research MCP protocol (stdio vs HTTP transport)
- [x] Set up project structure
- [x] Create basic MCP server

### Phase 2: HTTP Transport
- [x] Refactor server to use StreamableHTTPServerTransport
- [x] Implement session management
- [x] Configure Claude CLI for HTTP transport
- [x] Verify tool discovery works

### Phase 3: Documentation
- [x] Document key learnings (CLAUDE-LEARNING.md)
- [x] Update README
- [x] Clean up stale files
- [x] Organize archive

---

## 🚨 Critical Gaps (Must Build)

### Gap 1: Two-Way Interactivity
**Problem:** Browser → Claude communication doesn't exist
**Impact:** User clicks on generated UI do nothing
**Solution:** Add `user_interaction` tool or WebSocket event → Claude loop

### Gap 2: State Verification  
**Problem:** `update_ui` is fire-and-forget, no ACK
**Impact:** Claude can't verify if DOM actually updated correctly
**Solution:** Return actual DOM state after update

### Gap 3: Session Isolation
**Problem:** Single global WebSocket connection
**Impact:** Multiple browser tabs fight over messages
**Solution:** Session IDs per connection

### Gap 4: Timeout Handling
**Problem:** Default HTTP timeouts may be too short
**Impact:** Long Claude thinking times cause disconnects
**Solution:** Configure keep-alive, extend timeouts

### Gap 5: Security
**Problem:** HTTP port open, no authentication
**Impact:** Anyone on network can connect
**Solution:** Auth headers, HTTPS for production

---

## Next Steps

### Phase 4: Integration Testing
- [ ] Full E2E test with browser
- [ ] Verify WebSocket message flow
- [ ] Test UI updates in real browser

### Phase 5: Two-Way Communication
- [ ] Implement browser event capture
- [ ] Create `user_interaction` message type
- [ ] Design Claude loop/listener pattern
- [ ] Test click → Claude → response flow

### Phase 6: Feedback Loop
- [ ] Add ACK mechanism to `update_ui`
- [ ] Return actual DOM state after patching
- [ ] Add error reporting for render failures

### Phase 7: Multi-Session Support
- [ ] Add session ID to WebSocket connections
- [ ] Track multiple browser connections
- [ ] Route messages to correct session

### Phase 8: Production Ready
- [ ] Add authentication for browser
- [ ] Add authentication for MCP endpoint
- [ ] Add HTTPS support
- [ ] Rate limiting
- [ ] Timeout configuration

---

## Quick Commands

```bash
# Start server
npm run server:mcp

# Check status
claude mcp list
curl http://localhost:3000/health

# Test tool
claude --print --dangerously-skip-permissions \
  "Call log_thought with message 'test'"
```

## Key Files

| File | Purpose |
|------|---------|
| `src/server-mcp.js` | MCP server (HTTP transport) |
| `public/index.html` | Browser UI |
| `claude_config.json` | MCP configuration |
| `scripts/create-isolated-claude.js` | Test helper |
| `HANDOVER.md` | Agent handover document |

## References

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Claude CLI Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [docs/CLAUDE-LEARNING.md](CLAUDE-LEARNING.md) - Key discoveries
