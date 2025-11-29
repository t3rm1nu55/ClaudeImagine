# Authentication Notes - Claude CLI

## How Claude CLI Authenticates

Claude CLI supports two authentication methods:

1. **OAuth Authentication** (Interactive)
   - Interactive login via `claude auth login`
   - Credentials stored in `~/.claude/`
   - Persistent across sessions
   - Better rate limits

2. **API Key Authentication** (Environment Variable)
   - Set `ANTHROPIC_API_KEY` environment variable
   - Used when OAuth credentials not available
   - Suitable for automated/CI environments

## For Genuinely New Instances

When creating **isolated instances** with `CLAUDE_CONFIG_DIR` pointing to a new temp directory:

### The Problem
- Claude CLI stores OAuth credentials in `~/.claude/`
- Isolated instances use `CLAUDE_CONFIG_DIR` pointing to temp directory
- Temp directory won't have OAuth credentials
- Claude CLI may not find existing auth

### The Solution
**Yes, we should pass `ANTHROPIC_API_KEY` for genuinely new instances:**

```javascript
// For isolated instances, pass auth token
const result = await createIsolatedClaude('prompt', {
  authToken: process.env.ANTHROPIC_API_KEY  // Needed for isolated instances
});
```

### Why?
1. Isolated config directory (`CLAUDE_CONFIG_DIR`) is empty
2. No OAuth credentials in isolated directory
3. Claude CLI may not fall back to `~/.claude/` for auth
4. Passing `ANTHROPIC_API_KEY` ensures it works

## Current Implementation

The code now:
- ✅ Defaults to `process.env.ANTHROPIC_API_KEY` if available
- ✅ Passes it to Claude CLI via environment
- ✅ Works for both:
  - Regular instances (may use OAuth from ~/.claude/)
  - Isolated instances (needs API key)

## When API Key is Needed

**Required:**
- ✅ Genuinely new instances with isolated config
- ✅ CI/CD environments
- ✅ Automated testing
- ✅ Docker containers

**Optional:**
- ⚠️ Regular instances (may use OAuth)
- ⚠️ If Claude CLI already authenticated

## Best Practice

For isolated instances, always provide auth token:

```javascript
// Good: Explicit auth token for isolated instance
const result = await createIsolatedClaudeWithMCP('prompt', {
  authToken: process.env.ANTHROPIC_API_KEY  // Explicit for isolated instances
});
```

For regular usage, Claude CLI may use OAuth:

```bash
# If already authenticated via OAuth, may work without API key
claude --print --mcp-config ./claude_config.json "prompt"
```

## Conclusion

**For genuinely new/isolated instances: YES, pass auth token.**

The code now defaults to `process.env.ANTHROPIC_API_KEY` which is the right approach for isolated instances.

