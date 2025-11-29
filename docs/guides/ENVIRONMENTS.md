# Environment Strategy

For this reverse-engineering project, we define three distinct environments to manage development stability and feature testing.

## 1. Development (Dev)
**Purpose:** Rapid iteration on the MCP server code and frontend logic.

- **Location:** The root of this repository (`/Users/markforster/ClaudeImagine`).
- **Config:** Uses local `claude_config.json`.
- **State:** Transient, often reset.
- **Usage:**
  ```bash
  # 1. Start MCP server
  node server-mcp.js
  
  # 2. Run ad-hoc CLI commands
  claude --print --mcp-config ./claude_config.json "Test my new feature"
  ```

## 2. Test (Test)
**Purpose:** Automated verification of capabilities in a clean, sandboxed environment.

- **Location:** Temporary directories in `/tmp/claude-isolated-*`.
- **Config:** Generated on the fly by `create-isolated-claude.js`.
- **State:** Completely erased after each test run.
- **Usage:**
  ```bash
  # Run all tests
  npm run test:all-prerequisites
  
  # Run specific test suite
  npm run test:browser-connection
  ```
- **Isolation:**
  - Uses `CLAUDE_CONFIG_DIR` to prevent polluting global history.
  - Copies `.claude` templates for consistent behavior.
  - Automatically copies OAuth credentials for seamless auth.

## 3. Production (Prod)
**Purpose:** "Permanent" backend instances that serve as the stable engine for the Imagine UI.

- **Location:** Persistent directories (e.g., `~/claude-imagine-backend`).
- **Config:** Stable `CLAUDE.md` and `.claude/settings.json` created via playbooks.
- **State:** Persistent conversation history (stored in that directory's `.claude/projects`).
- **Usage:**
  ```bash
  # Create a new prod instance
  npm run create:backend ~/claude-imagine-prod
  
  # Start the instance
  cd ~/claude-imagine-prod
  ./start.sh
  ```
- **Characteristics:**
  - Configured for stability (e.g., specific model versions).
  - System prompts tuned for reliability.
  - Intended to run continuously.

## Switching Environments

| Feature | Dev | Test | Prod |
|---------|-----|------|------|
| **Server** | `node server-mcp.js` (local) | Managed by test runner | `node server-mcp.js` (configured in start.sh) |
| **History** | Local project history | None (wiped) | Persistent in instance dir |
| **Auth** | Global `~/.claude` | Copied from global | Global `~/.claude` |
| **Sandboxing** | `--dangerously-skip-permissions` | `--dangerously-skip-permissions` | Standard (interactive or configured) |

## Best Practices
1. **Develop** new MCP tools or agent capabilities in the repo root.
2. **Test** them using `npm run test:claude-tools` to ensure they work in isolation.
3. **Deploy** to a "Prod" instance only when the feature is stable and documented in `SKILL.md`.

