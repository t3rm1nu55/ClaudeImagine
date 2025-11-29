# Lessons Learned & Architecture Alignment

## 1. Official Extensibility Patterns vs. JSON Injection
**Lesson:** Claude Code natively supports filesystem-based extensibility via `.claude/` directory.
- **Old Way:** Injecting agents via `--agents '{"name": ...}'` JSON flag.
- **New Way:** Defining agents in `.claude/agents/<name>.md`.
- **Benefit:** Version control, cleaner separation of concerns, richer prompt definitions (markdown).

**Verification:**
We verified this by creating `.claude/agents/test-agent.md` and successfully invoking it in an isolated instance by copying the `.claude` directory.

## 2. Authentication & Isolation
**Lesson:** Claude Code handles its own authentication via OAuth.
- **Initial Misconception:** We thought we needed to pass `ANTHROPIC_API_KEY` everywhere.
- **Correction:** We implemented a `copyOAuthCredentials` utility to clone the user's `~/.claude/token.json` into our isolated test environments. This allows tests to run as "authenticated users" without managing keys manually.

## 3. MCP Configuration Scope
**Lesson:** MCP servers can be configured at different scopes.
- **Pattern:** We are using the "Project Scope" pattern by passing `--mcp-config` which points to a JSON file. This is equivalent to having a `.mcp.json` in the project root.
- **Official equivalent:** `claude mcp add --scope project ...`

## 4. Sandboxing
**Lesson:** Claude Code has a built-in sandbox.
- **Discovery:** The `--dangerously-skip-permissions` flag is essential for automated testing (non-interactive mode), as it bypasses the interactive "Allow/Deny" prompts that Claude Code normally presents for tool usage.

## 5. Future Roadmap
- **Plugins:** Package the "Imagine" capability (server + agents + skills) as a formal Claude Code Plugin (`.claude-plugin/plugin.json`).
- **Marketplace:** Create a local marketplace JSON to allow installing this plugin via `/plugin install`.

