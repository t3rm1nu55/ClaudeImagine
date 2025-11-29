# Comprehensive Testing Plan - Linear Approach

## Understanding Requirements

### Core Requirements:
1. ✅ Run multiple Claude instances simultaneously
2. ✅ Query session IDs
3. ✅ Configure MCP servers per instance
4. ✅ Configure tools per instance
5. ✅ Configure agents per instance
6. ✅ Configure all limitation settings per instance
7. ✅ Spin up Claude in folders with bespoke settings
8. ✅ Use configured instances as experts
9. ✅ Understand plugins system
10. ✅ Build plugin library
11. ✅ Build skills library

## Phase 1: Research (MUST COMPLETE FIRST) 🔍

### 1.1 Plugin System Research
**Status:** ⚠️ IN PROGRESS

**Findings So Far:**
- Plugins are markdown files with frontmatter
- Located in `~/.claude/plugins/marketplaces/`
- Structure: `plugins/{plugin-name}/{agents|commands|skills|hooks}/`
- Agents: `.md` files with frontmatter (name, description, tools, model, color)
- Skills: `SKILL.md` files
- Commands: `.md` files
- Hooks: `hooks.json` files

**Still Need:**
- [ ] Official plugin manifest format documentation
- [ ] Plugin installation process
- [ ] Plugin marketplace structure
- [ ] Plugin capabilities and limitations
- [ ] Plugin development guide

**Sources:**
- [ ] docs.anthropic.com
- [ ] github.com/anthropics/claude-code-plugins
- [ ] Existing plugin examples

### 1.2 Settings & Configuration Research
**Status:** ⚠️ IN PROGRESS

**Findings So Far:**
- Settings in `~/.claude/settings.json`
- Project-specific settings possible
- `--settings` flag accepts file or JSON
- `--setting-sources` flag controls source precedence

**Still Need:**
- [ ] Official settings schema documentation
- [ ] Project-specific settings format
- [ ] Settings precedence rules
- [ ] `.claude` directory structure
- [ ] `CLAUDE.md` file format

**Sources:**
- [ ] docs.anthropic.com
- [ ] Existing settings files

### 1.3 MCP Configuration Research
**Status:** ✅ PARTIALLY COMPLETE

**Findings:**
- `--mcp-config` flag accepts JSON files or strings
- `claude mcp` commands for management
- MCP servers configured per-instance
- Project-specific MCP configs possible

**Still Need:**
- [ ] Official MCP configuration format
- [ ] Per-instance MCP setup
- [ ] Project-specific MCP configs
- [ ] MCP server isolation

**Sources:**
- [ ] docs.anthropic.com
- [ ] MCP protocol docs

### 1.4 Skills & Agents Research
**Status:** ⚠️ IN PROGRESS

**Findings So Far:**
- Agents: Markdown files with frontmatter
- Skills: `SKILL.md` files
- Agents have: name, description, tools, model, color
- Skills have: Different structure (need to understand)

**Still Need:**
- [ ] Official agent format documentation
- [ ] Official skill format documentation
- [ ] Difference between agents and skills
- [ ] How to create custom agents/skills
- [ ] How agents/skills are invoked

**Sources:**
- [ ] docs.anthropic.com
- [ ] Existing agent/skill examples

## Phase 2: Testing (ONLY AFTER RESEARCH COMPLETE) 🧪

### 2.1 Multiple Instances Testing
**Prerequisites:** Complete Phase 1

**Tests:**
- [ ] Test 1: Run 2 instances simultaneously
- [ ] Test 2: Run 5 instances simultaneously
- [ ] Test 3: Different models per instance
- [ ] Test 4: Different configs per instance
- [ ] Test 5: Rate limiting behavior
- [ ] Test 6: Session isolation
- [ ] Test 7: Resource usage

### 2.2 Session ID Management
**Prerequisites:** Complete Phase 1

**Tests:**
- [ ] Test 1: Query session ID from JSON output
- [ ] Test 2: Extract session ID programmatically
- [ ] Test 3: Use session ID to resume
- [ ] Test 4: Session persistence across instances
- [ ] Test 5: Session sharing between instances
- [ ] Test 6: Session isolation

### 2.3 Per-Instance Configuration
**Prerequisites:** Complete Phase 1

**Tests:**
- [ ] Test 1: MCP config per instance
- [ ] Test 2: Tool config per instance
- [ ] Test 3: Agent config per instance
- [ ] Test 4: Settings per instance
- [ ] Test 5: Model per instance
- [ ] Test 6: System prompt per instance

### 2.4 Project-Specific Configuration
**Prerequisites:** Complete Phase 1

**Tests:**
- [ ] Test 1: `.claude` directory in project
- [ ] Test 2: Project-specific MCP servers
- [ ] Test 3: Project-specific tools
- [ ] Test 4: Project-specific agents
- [ ] Test 5: Project-specific settings
- [ ] Test 6: `CLAUDE.md` file usage

### 2.5 Expert Instances
**Prerequisites:** Complete Phase 1, 2.3, 2.4

**Tests:**
- [ ] Test 1: Create expert config (code reviewer)
- [ ] Test 2: Create expert config (architect)
- [ ] Test 3: Create expert config (planner)
- [ ] Test 4: Test expert specialization
- [ ] Test 5: Test expert delegation
- [ ] Test 6: Test expert coordination

## Phase 3: Building Libraries (ONLY AFTER TESTING) 🏗️

### 3.1 Plugin Library
**Prerequisites:** Complete Phase 1, 2.1-2.5

**Tasks:**
- [ ] Create plugin template
- [ ] Build plugin examples
- [ ] Create plugin utilities
- [ ] Document plugin development
- [ ] Create plugin testing framework

### 3.2 Skills Library
**Prerequisites:** Complete Phase 1, 2.1-2.5

**Tasks:**
- [ ] Create skill template
- [ ] Build skill examples
- [ ] Create skill utilities
- [ ] Document skill development
- [ ] Create skill testing framework

## Current Status: Phase 1 - Research

**Next Actions:**
1. Complete plugin system research
2. Complete settings research
3. Complete skills/agents research
4. Document all findings
5. THEN proceed to testing

## Research Checklist

### Plugin System:
- [ ] Plugin manifest format
- [ ] Plugin installation process
- [ ] Plugin marketplace structure
- [ ] Plugin capabilities
- [ ] Plugin development guide

### Settings:
- [ ] Settings schema
- [ ] Project settings format
- [ ] Settings precedence
- [ ] `.claude` directory structure
- [ ] `CLAUDE.md` format

### MCP:
- [ ] MCP config format
- [ ] Per-instance MCP
- [ ] Project MCP configs

### Skills/Agents:
- [ ] Agent format
- [ ] Skill format
- [ ] Difference between them
- [ ] Custom creation process
- [ ] Invocation methods

## Testing Checklist (After Research)

### Multiple Instances:
- [ ] 2 instances
- [ ] 5+ instances
- [ ] Different configs
- [ ] Rate limiting
- [ ] Session isolation

### Configuration:
- [ ] MCP per instance
- [ ] Tools per instance
- [ ] Agents per instance
- [ ] Settings per instance
- [ ] Project-specific configs

### Expert Instances:
- [ ] Code reviewer expert
- [ ] Architect expert
- [ ] Planner expert
- [ ] Expert delegation
- [ ] Expert coordination

## Building Checklist (After Testing)

### Plugin Library:
- [ ] Template
- [ ] Examples
- [ ] Utilities
- [ ] Documentation
- [ ] Testing framework

### Skills Library:
- [ ] Template
- [ ] Examples
- [ ] Utilities
- [ ] Documentation
- [ ] Testing framework

