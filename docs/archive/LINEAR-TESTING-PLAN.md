# Linear Testing Plan - One Thing at a Time

## Understanding from Existing Files

### Plugin Structure (Discovered):
- **Agents**: `{plugin}/agents/{name}.md` with frontmatter:
  - `name`: Agent identifier
  - `description`: What the agent does
  - `tools`: Comma-separated list of tools
  - `model`: Model to use (sonnet, opus, etc.)
  - `color`: UI color (red, yellow, green, etc.)
- **Skills**: `{plugin}/skills/{name}/SKILL.md` with frontmatter:
  - `name`: Skill identifier
  - `description`: What the skill does
  - `license`: License info
- **Commands**: `{plugin}/commands/{name}.md` with frontmatter:
  - `description`: Command description
  - `argument-hint`: Optional argument hint
- **Hooks**: `{plugin}/hooks/hooks.json` with:
  - `description`: Hook description
  - `hooks`: Object mapping hook types to handlers

### Settings Structure (Discovered):
- Global: `~/.claude/settings.json`
- Local: `~/.claude/settings.local.json`
- Project: `.claude/` directory (needs testing)

### MCP Configuration (Discovered):
- `--mcp-config` accepts JSON files or strings
- `claude mcp` commands for management
- Per-instance configs via flags

## Phase 1: Research Complete ✅

**Status:** Based on existing files and CLI help, we have enough to proceed with testing.

## Phase 2: Testing - ONE THING AT A TIME

### Test 1: Query Session ID ✅ READY
**Goal:** Extract session ID from Claude output

**Test:**
```bash
claude --print --model sonnet --output-format json "test" | jq -r '.session_id'
```

**Expected:** UUID string

**Success Criteria:** Can extract session ID programmatically

---

### Test 2: Run 2 Instances Simultaneously ✅ READY
**Goal:** Verify multiple instances can run at once

**Test:**
```bash
# Terminal 1
claude --print --model sonnet "Instance 1" &

# Terminal 2  
claude --print --model opus "Instance 2" &
```

**Expected:** Both complete successfully

**Success Criteria:** Both instances complete without errors

---

### Test 3: Different MCP Config Per Instance ✅ READY
**Goal:** Each instance has different MCP servers

**Test:**
```bash
# Instance 1: Only imagine MCP
claude --print --mcp-config ./claude_config.json "test" &

# Instance 2: Only context7 MCP (default)
claude --print "test" &
```

**Expected:** Each instance sees different tools

**Success Criteria:** Tool lists differ between instances

---

### Test 4: Different Tools Per Instance ✅ READY
**Goal:** Each instance has different tool sets

**Test:**
```bash
# Instance 1: Only Read tool
claude --print --tools "Read" "test" &

# Instance 2: Only Write tool
claude --print --tools "Write" "test" &
```

**Expected:** Each instance sees different tools

**Success Criteria:** Tool lists differ

---

### Test 5: Different Agents Per Instance ✅ READY
**Goal:** Each instance has different agents

**Test:**
```bash
# Instance 1: Reviewer agent
claude --print --agents '{"reviewer": {"description": "...", "prompt": "..."}}' "test" &

# Instance 2: Planner agent
claude --print --agents '{"planner": {"description": "...", "prompt": "..."}}' "test" &
```

**Expected:** Each instance has different agents available

**Success Criteria:** Agents differ between instances

---

### Test 6: Different Settings Per Instance ✅ READY
**Goal:** Each instance uses different settings

**Test:**
```bash
# Instance 1: Custom settings file
claude --print --settings ./settings1.json "test" &

# Instance 2: Different settings file
claude --print --settings ./settings2.json "test" &
```

**Expected:** Settings applied per instance

**Success Criteria:** Behavior differs based on settings

---

### Test 7: Project-Specific Configuration ✅ READY
**Goal:** Claude in project folder uses project configs

**Test:**
```bash
# Create project with .claude directory
mkdir -p test-project/.claude
# Add config files
cd test-project
claude --print "test"
```

**Expected:** Project configs are used

**Success Criteria:** Project-specific behavior

---

### Test 8: Expert Instance Configuration ✅ READY
**Goal:** Create specialized expert instance

**Test:**
```bash
# Code reviewer expert
claude --print \
  --model sonnet \
  --agents '{"reviewer": {"description": "Code reviewer", "prompt": "You are an expert code reviewer..."}}' \
  --tools "Read,Grep" \
  --system-prompt "You are a code review expert" \
  "Review this code: ..."
```

**Expected:** Expert behaves as specialized reviewer

**Success Criteria:** Expert shows specialized behavior

---

### Test 9: Plugin System Understanding ✅ READY
**Goal:** Understand how plugins work

**Test:**
```bash
# List plugins
claude plugin list

# Install plugin
claude plugin install <plugin>

# Use plugin
claude --plugin-dir <path> "test"
```

**Expected:** Plugins can be installed and used

**Success Criteria:** Plugins work as expected

---

### Test 10: Skills Library ✅ READY
**Goal:** Create and use custom skills

**Test:**
```bash
# Create skill
# Use skill via plugin
```

**Expected:** Skills can be created and used

**Success Criteria:** Skills work as expected

---

## Execution Order

**CRITICAL:** Test ONE thing at a time. Don't proceed to next test until current test is:
1. ✅ Understood
2. ✅ Tested
3. ✅ Documented
4. ✅ Verified working

## Current Status

**Next Test:** Test 1 - Query Session ID

**Status:** Ready to execute

