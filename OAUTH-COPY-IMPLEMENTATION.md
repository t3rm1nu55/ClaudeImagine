# OAuth Credentials Copy Implementation

## Overview

Isolated instances now automatically copy OAuth credentials from `~/.claude/` to the isolated instance directory, allowing them to use pre-authenticated OAuth without requiring API keys.

## Implementation

### Function: `copyOAuthCredentials()`

Located in `create-isolated-claude.js`, this function:

1. **Checks for `~/.claude/` directory**
   - Verifies the directory exists
   - If not, silently continues (will use API key fallback)

2. **Searches for OAuth credential files**
   - Tries common filenames: `token.json`, `credentials.json`, `auth.json`
   - Stops at first successful copy

3. **Copies securely**
   - Copies file to isolated instance directory
   - Sets permissions to `0o600` (rw-------) - owner read/write only
   - Preserves security of credentials

4. **Silent operation**
   - No logging on success (security)
   - No errors if credentials not found (fallback to API key)

## Security

- ✅ Credentials copied with secure permissions (0o600)
- ✅ Only owner can read/write
- ✅ Credentials cleaned up when instance cleaned up
- ✅ No logging of credential file paths
- ✅ Graceful fallback if OAuth not available

## Usage

```javascript
// OAuth credentials automatically copied
const result = await createIsolatedClaude('prompt', {
  // No authToken needed if OAuth credentials exist
  // Falls back to ANTHROPIC_API_KEY if OAuth not available
});
```

## How It Works

1. **Isolated instance created**
   - Temp directory created
   - OAuth credentials copied from `~/.claude/` to temp directory

2. **Claude CLI runs**
   - Uses `CLAUDE_CONFIG_DIR` pointing to temp directory
   - Finds OAuth credentials in temp directory
   - Uses OAuth authentication

3. **Cleanup**
   - Temp directory deleted (including OAuth credentials)
   - No persistent storage of credentials

## Fallback Behavior

If OAuth credentials not found:
- Falls back to `ANTHROPIC_API_KEY` environment variable
- Works with API key authentication
- No error thrown

## Files Checked

The function checks for these OAuth credential files (in order):
1. `token.json` - Most common
2. `credentials.json` - Alternative
3. `auth.json` - Alternative

Stops at first successful copy.

## Benefits

- ✅ Uses existing OAuth authentication
- ✅ No need to set API key for isolated instances
- ✅ Secure credential handling
- ✅ Automatic cleanup
- ✅ Graceful fallback

