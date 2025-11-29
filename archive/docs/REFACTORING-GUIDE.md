# Safe Refactoring Guide

## ✅ Current Status

All automated tests passing:
- ✅ 8/8 Progressive tests
- ✅ Server infrastructure verified
- ✅ WebSocket connections working
- ✅ HTTP serving working

## Testing Strategy

### Before Any Changes

1. **Run Progressive Tests:**
   ```bash
   node test-progressive.js
   ```
   Should show: `✅ Passed: 8/8`

2. **Run E2E Test:**
   ```bash
   node test-e2e-simple.js
   ```
   Should show: `✅ All tests passed!`

3. **Verify Server Starts:**
   ```bash
   npm run server:mcp
   ```
   Should see: `Local Imagine Server running at http://localhost:3000`

### After Making Changes

1. **Re-run all automated tests**
2. **Test in browser manually** (if UI changes)
3. **Verify no regressions**

## Safe Refactoring Checklist

### ✅ Safe to Refactor (Well Tested)

- Server startup logic
- HTTP serving
- WebSocket connection handling
- Static file serving
- Port management

### ⚠️ Test Carefully (Needs Manual Verification)

- MCP tool handlers (requires Claude CLI)
- DOM patching logic (requires browser)
- Message format changes (requires integration test)
- Error handling (requires edge case testing)

### 🔴 High Risk (Requires Full E2E)

- WebSocket message routing
- Tool execution flow
- Browser state management
- MCP protocol changes

## Progressive Testing Approach

### Layer 1: Unit Tests ✅
- Server starts
- Modules import
- Syntax valid

### Layer 2: Integration Tests ✅
- HTTP server responds
- WebSocket connects
- Files are served

### Layer 3: Manual Browser Tests ⚠️
- Open http://localhost:3000
- Verify UI renders
- Check console for errors
- Test WebSocket connection

### Layer 4: MCP Integration ⚠️
- Connect Claude CLI
- Verify tool discovery
- Test tool execution
- Verify browser updates

## Common Issues & Fixes

### Port Already in Use
```bash
lsof -ti:3000 | xargs kill -9
```

### Server Won't Start
- Check Node version: `node -v` (needs v20+)
- Check dependencies: `npm list`
- Check syntax: `node --check server-mcp.js`

### WebSocket Won't Connect
- Verify server is running
- Check port 3000 is accessible
- Verify WebSocket URL: `ws://localhost:3000`

### Tests Fail After Changes
1. Check what changed
2. Run progressive tests to isolate issue
3. Fix incrementally
4. Re-run tests after each fix

## Best Practices

1. **Make Small Changes**
   - One feature at a time
   - Test after each change
   - Commit working state

2. **Run Tests Frequently**
   - Before starting work
   - After each change
   - Before committing

3. **Keep Tests Passing**
   - Don't proceed if tests fail
   - Fix issues immediately
   - Don't skip tests

4. **Document Changes**
   - Update tests if behavior changes
   - Document new features
   - Note breaking changes

## Test Commands Reference

```bash
# Run all progressive tests
node test-progressive.js

# Run simple E2E test
node test-e2e-simple.js

# Verify setup
node verify-setup.js

# Start server (for manual testing)
npm run server:mcp

# Check server syntax
node --check server-mcp.js
```

## Next Steps

1. ✅ Infrastructure tests complete
2. ⚠️ Add browser automation (Playwright/Puppeteer)
3. ⚠️ Add MCP client mocking
4. ⚠️ Add DOM patching tests
5. ⚠️ Add error scenario tests

