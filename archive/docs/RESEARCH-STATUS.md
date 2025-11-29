# Research Status - Official Sources Only

## ✅ Completed Research

### Plugin Structure (from existing plugins):
- Agents: Markdown with frontmatter (name, description, tools, model, color)
- Skills: SKILL.md files
- Commands: .md files
- Hooks: hooks.json files
- Location: ~/.claude/plugins/marketplaces/

### Settings Structure (from existing files):
- Global: ~/.claude/settings.json
- Local: ~/.claude/settings.local.json
- Project: .claude/ directory (needs verification)

### MCP Configuration:
- --mcp-config flag works
- claude mcp commands available
- Per-instance configs possible

## ⚠️ Need Official Documentation

### From docs.anthropic.com:
1. Plugin manifest format (official spec)
2. Plugin development guide
3. Settings schema documentation
4. Project configuration format
5. Skills vs Agents documentation
6. .claude directory structure
7. CLAUDE.md file format

### From github.com/anthropics:
1. claude-code-plugins repository
2. Plugin examples
3. Plugin development examples

## 🔍 Next Steps

1. Search docs.anthropic.com for each topic
2. Search github.com/anthropics for repositories
3. Document findings
4. Create test plan based on official docs
5. THEN proceed to testing
