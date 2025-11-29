# Modular Testing Guide

## Running Tests

### Run Single Test:
```bash
node test-modular.js 1  # Test 1: Query Session ID
node test-modular.js 2  # Test 2: Multiple Instances
node test-modular.js 3  # Test 3: Different MCP Config
node test-modular.js 4  # Test 4: Different Tools
node test-modular.js 5  # Test 5: Different Agents
node test-modular.js 6  # Test 6: Project Config
node test-modular.js 7  # Test 7: Expert Instance
```

### Run All Tests:
```bash
node test-modular.js
```

## Test Descriptions

### Test 1: Query Session ID ✅
**Goal:** Extract session ID from Claude output
**Command:** `node test-modular.js 1`
**Expected:** UUID string in JSON output

### Test 2: Multiple Instances
**Goal:** Verify multiple instances can run
**Command:** `node test-modular.js 2`
**Expected:** Both instances complete with different session IDs

### Test 3: Different MCP Config
**Goal:** Each instance has different MCP servers
**Command:** `node test-modular.js 3`
**Expected:** Instance sees imagine MCP tools

### Test 4: Different Tools
**Goal:** Each instance has different tool sets
**Command:** `node test-modular.js 4`
**Expected:** Instance 1 has Read, Instance 2 has Write

### Test 5: Different Agents
**Goal:** Each instance has different agents
**Command:** `node test-modular.js 5`
**Expected:** Each instance has different agents available

### Test 6: Project Config
**Goal:** Project-specific configuration works
**Command:** `node test-modular.js 6`
**Expected:** Project settings are used

### Test 7: Expert Instance
**Goal:** Create specialized expert instance
**Command:** `node test-modular.js 7`
**Expected:** Expert shows specialized behavior

## Testing Strategy

1. **Run one test at a time**
2. **Verify it passes before moving on**
3. **Fix any issues before proceeding**
4. **Document results**

## Next Steps After Testing

1. Build plugin library
2. Build skills library
3. Create expert instance templates
4. Document best practices

