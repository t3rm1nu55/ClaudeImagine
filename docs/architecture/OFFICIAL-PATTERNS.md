# Official Claude Code Patterns & Architecture Alignment

This document outlines the official Claude Code CLI patterns and architecture, contrasting them with our current "Inverted Architecture" implementation. It serves as a guide for aligning our reverse-engineered solution with official standards.

## 1. Core Architecture Comparison

### Our Current "Inverted Architecture"
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

### Official "Claude Code as MCP Server" Pattern
The official docs describe a mode where Claude Code *itself* acts as an MCP server:

```bash
claude mcp serve
```

This allows another client (like a custom IDE extension or another agent) to use Claude Code's tools (Read, Edit, Bash, etc.) via MCP.

**Alignment:**
Our architecture is actually compatible with the official "Client Mode" pattern. We are using `claude` as the client that connects to our `server-mcp.js` (the MCP server).

## 2. Extensibility Patterns

### A. Skills (Filesystem-based)
**Official Pattern:**
- Defined in `.claude/skills/<skill-name>/SKILL.md`
- Structure:
  ```markdown
  ---
  name: emir-analysis
  description: >
    Analyse EMIR trade reports...
  ---
  # Instructions
  ...
  ```
- **Behavior:** Claude automatically discovers and loads these based on description matching.

**Our Implementation:**
- We currently use prompt-based "Agents" passed via JSON.
- **Action:** We should move to filesystem-based skills for "playbooks" (e.g., `ui-builder` skill).

### B. Subagents (Agents)
**Official Pattern:**
- Defined in `.claude/agents/<agent-name>.md`
- Separate system prompt, tools, and context.
- Can be delegated to by the main agent.

**Our Implementation:**
- We use `--agents` flag with JSON configuration.
- **Action:** We can formalize our `ui-builder` as a standard subagent in `.claude/agents/ui-builder.md`.

### C. Slash Commands
**Official Pattern:**
- Defined in `.claude/commands/<command>.md`
- Invoked via `/command`.
- Can leverage tools and arguments.

**Our Implementation:**
- We rely on natural language prompts.
- **Action:** We can create shortcuts like `/build-ui` or `/reset-session`.

### D. Plugins
**Official Pattern:**
- Bundles commands, agents, skills, and MCP servers.
- Manifest: `.claude-plugin/plugin.json`.
- Installed via marketplaces.

**Alignment:**
- For a "productized" Claude Imagine, we could package our MCP server and UI skills as a single Claude Code Plugin.

## 3. MCP Server Configuration

**Official Pattern:**
- `claude mcp add ...` manages configuration.
- Scopes: Local (default), Project (`.mcp.json`), User (global).

**Our Implementation:**
- We use `--mcp-config ./claude_config.json` which maps to the "Project Scope" pattern effectively.

## 4. Lessons Learned & Corrections

1.  **No API Key Needed:** Claude Code handles authentication internally via OAuth (`~/.claude/`). Our initial assumption that we needed `ANTHROPIC_API_KEY` was incorrect for the CLI context.
2.  **Native Sandboxing:** Claude Code has built-in permission systems (`--dangerously-skip-permissions` for automation). We don't need to build our own sandbox; we just configure the existing one.
3.  **Project Structure:** The canonical way to define behavior is `CLAUDE.md` + `.claude/` directory, not just passing flags.
4.  **Conversation Management:** Claude Code manages history in `~/.claude/projects/` or `CLAUDE_CONFIG_DIR`. Our isolated instance strategy works by manipulating `CLAUDE_CONFIG_DIR`.

## 5. Action Plan for Alignment

1.  **Adopt Standard Directory Structure:**
    - Move "playbooks" to `.claude/skills/` or `.claude/agents/`.
2.  **Standardize Config:**
    - Ensure `claude_config.json` acts as the project-level `.mcp.json`.
3.  **Update Documentation:**
    - Refactor `README.md` to reference these official patterns.
    - Retire custom "Agent" JSON generation in favor of markdown definitions where possible.

