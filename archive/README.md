# Archive

This directory contains deprecated code, outdated documentation, and obsolete test files that are no longer relevant to the current Claude CLI + MCP architecture.

## What's Archived

### Code (`archive/code/`)
- `server/claude-adapter.ts` - Direct API adapter (replaced by MCP)
- `server.js` - Old API-based server
- `example-server.js` - Example API server
- `src/` - TypeScript implementation (not our approach)
- `dist/` - Build output from old approach

### Documentation (`archive/docs/`)
- Research documents referencing API approaches
- Old testing plans and guides
- Outdated feature summaries
- Testing reports from API-based approach

### Tests (`archive/tests/`)
- API-based integration tests
- Mock tool tests
- Old test scripts
- Outdated test utilities

## Current Architecture

The current implementation uses:
- **Claude CLI** (not direct API)
- **MCP Protocol** (stdio transport)
- **Backend instances** (permanent, configurable)

See the main `README.md` for current architecture details.

