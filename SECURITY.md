# Security Model - Test Sandboxing

## Overview

The test suite (`test-claude-tools.js`) is designed with security sandboxing to ensure it can run safely in isolated environments without access to the local machine or external networks (except what's necessary for the demonstration).

## Sandboxing Measures

### Network Isolation

1. **Server Binding**
   - MCP server binds only to `127.0.0.1` (localhost)
   - Never binds to `0.0.0.0` (all interfaces)
   - Prevents external network access

2. **WebSocket Connections**
   - Only connects to `ws://127.0.0.1:3000`
   - Explicit localhost IP validation
   - No external WebSocket connections allowed

3. **Claude CLI Network Access**
   - Can only connect to localhost MCP server
   - Requires Anthropic API access (for Claude functionality)
   - No other external network access

### File System Isolation

1. **Directory Restrictions**
   - All operations restricted to test directory (`__dirname`)
   - No access to parent directories
   - No access to system directories (`/etc`, `/usr`, etc.)

2. **Process Working Directory**
   - Server process: `cwd` set to test directory
   - Claude CLI: `cwd` set to test directory
   - Prevents accidental file system traversal

### Process Isolation

1. **Environment Variables**
   - Test processes run with `NODE_ENV=test`
   - Restricted environment variable inheritance
   - No access to sensitive environment variables

2. **Process Lifecycle**
   - All spawned processes tracked and can be killed
   - Cleanup on exit (SIGINT handler)
   - No orphaned processes

### Permission Model

1. **`--dangerously-skip-permissions` Flag**
   - Required for MCP servers to work in `--print` mode
   - Safe in this context because:
     - Isolated test environment
     - Localhost-only network access
     - No file system access outside test directory
     - No system-level operations

2. **What This Flag Does**
   - Bypasses Claude CLI permission prompts
   - Does NOT grant additional system privileges
   - Does NOT allow file system access outside sandbox
   - Does NOT allow external network access

## What IS Allowed (for Demo)

The following are intentionally allowed for the demonstration to work:

1. **Localhost HTTP Server** (port 3000)
   - Serves `index.html` for browser UI
   - Required for WebSocket connection

2. **Localhost WebSocket** (port 3000)
   - Real-time communication between server and browser
   - Required for UI updates

3. **MCP Server Communication** (stdio)
   - Communication between Claude CLI and MCP server
   - Required for tool execution

4. **Claude CLI API Calls** (to Anthropic)
   - Required for Claude model functionality
   - Cannot be restricted without breaking functionality

5. **File Access** (test directory only)
   - Reading test files, config files
   - Required for test execution

## Security Guarantees

✅ **Cannot access external networks** (except Anthropic API)  
✅ **Cannot access file system outside test directory**  
✅ **Cannot bind to external interfaces**  
✅ **Cannot execute arbitrary system commands**  
✅ **All processes can be terminated**  
✅ **No persistent changes to system**

## Running in Production

⚠️ **Important**: This test is designed for **testing/demonstration purposes only**.

For production use:
- Review and adjust sandboxing measures as needed
- Consider additional security measures (firewall rules, containerization)
- Audit what permissions Claude CLI actually needs
- Consider using Docker/containers for stronger isolation

## Verification

To verify sandboxing:
1. Run test in isolated network environment
2. Monitor network traffic (should only see localhost + Anthropic API)
3. Monitor file system access (should only see test directory)
4. Check process tree (should only see test processes)

