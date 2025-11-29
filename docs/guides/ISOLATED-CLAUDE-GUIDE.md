# Creating Isolated Claude CLI Instances

## Overview

This guide explains how to create completely isolated Claude CLI instances that:
- ✅ Use your auth token (from environment)
- ✅ Have their own isolated config directory
- ✅ No conversation history (fresh start every time)
- ✅ Don't touch your main Claude setup
- ✅ Perfect for one-off standalone agents

## Why Isolated Instances?

Sometimes you need a Claude instance that:
- Has no memory of previous conversations
- Uses different MCP servers than your main setup
- Runs in a completely isolated environment
- Doesn't interfere with your regular Claude usage
- Can be easily cleaned up after use

## Method 1: Using the Helper Script

### Basic Usage

```bash
# Set your auth token
export ANTHROPIC_API_KEY="your-token-here"

# Run isolated instance
node create-isolated-claude.js "Your prompt here"
```

### With MCP Server

```javascript
import { createIsolatedClaudeWithMCP } from './create-isolated-claude.js';

const result = await createIsolatedClaudeWithMCP('Build a calculator UI', {
  mcpServerPath: '/path/to/server-mcp.js',
  model: 'sonnet',
  authToken: process.env.ANTHROPIC_API_KEY
});

console.log(result.stdout);
```

## Method 2: Manual Isolation

### Step 1: Create Temporary Config Directory

```bash
# Create isolated config directory
ISOLATED_DIR=$(mktemp -d)
echo "Isolated config: $ISOLATED_DIR"
```

### Step 2: Create Minimal Config

```bash
# Create minimal config (no MCP servers, no history)
cat > "$ISOLATED_DIR/claude_config.json" <<EOF
{
  "mcpServers": {}
}
EOF
```

### Step 3: Run Claude CLI with Isolated Config

```bash
# Run with isolated config
claude --print \
  --model sonnet \
  --dangerously-skip-permissions \
  --mcp-config "$ISOLATED_DIR/claude_config.json" \
  "Your prompt here"

# Cleanup
rm -rf "$ISOLATED_DIR"
```

## Method 3: Using Environment Variables

### Isolated Instance with Custom Config

```bash
# Create isolated config
ISOLATED_DIR=$(mktemp -d)
cat > "$ISOLATED_DIR/config.json" <<EOF
{
  "mcpServers": {
    "imagine": {
      "command": "node",
      "args": ["/path/to/server-mcp.js"]
    }
  }
}
EOF

# Run with isolated config
ANTHROPIC_API_KEY="your-token" \
CLAUDE_CONFIG_DIR="$ISOLATED_DIR" \
claude --print \
  --model sonnet \
  --mcp-config "$ISOLATED_DIR/config.json" \
  --dangerously-skip-permissions \
  "Your prompt"

# Cleanup
rm -rf "$ISOLATED_DIR"
```

## Method 4: Programmatic Isolation (Node.js)

```javascript
import { spawn } from 'child_process';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

async function isolatedClaude(prompt, authToken) {
  // Create isolated config directory
  const isolatedDir = await mkdtemp(join(tmpdir(), 'claude-isolated-'));
  const configPath = join(isolatedDir, 'config.json');
  
  // Create minimal config
  await writeFile(configPath, JSON.stringify({ mcpServers: {} }));
  
  // Run Claude CLI
  return new Promise((resolve, reject) => {
    const claude = spawn('claude', [
      '--print',
      '--model', 'sonnet',
      '--mcp-config', configPath,
      '--dangerously-skip-permissions'
    ], {
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: authToken,
        CLAUDE_CONFIG_DIR: isolatedDir
      }
    });
    
    let stdout = '';
    claude.stdout.on('data', d => stdout += d.toString());
    
    claude.on('close', async (code) => {
      // Cleanup
      await rm(isolatedDir, { recursive: true });
      resolve({ stdout, code });
    });
    
    claude.stdin.write(prompt);
    claude.stdin.end();
  });
}

// Usage
const result = await isolatedClaude(
  'Hello, isolated Claude!',
  process.env.ANTHROPIC_API_KEY
);
console.log(result.stdout);
```

## Key Features

### 1. No Conversation History

- Uses `--print` mode (one-shot execution)
- No `--continue` or `--resume` flags
- Each call is completely independent
- Fresh start every time

### 2. Isolated Config

- Temporary config directory
- No access to your main Claude config
- Can specify custom MCP servers
- Automatically cleaned up after use

### 3. Auth Token Isolation

- Uses your auth token (from env or parameter)
- Doesn't rely on Claude CLI's stored credentials
- Can use different tokens for different instances

### 4. MCP Server Isolation

- Can specify custom MCP config
- Doesn't use your main MCP servers
- Perfect for testing new MCP servers
- Clean separation from production setup

## Use Cases

### 1. Testing New MCP Servers

```javascript
// Test a new MCP server without affecting main setup
const result = await createIsolatedClaudeWithMCP('Test new tool', {
  mcpServerPath: '/path/to/new-server.js'
});
```

### 2. One-Off Agents

```javascript
// Create a standalone agent with no memory
const agent = await createIsolatedClaude('You are a calculator agent', {
  model: 'sonnet'
});
```

### 3. CI/CD Pipelines

```bash
# Run in CI without affecting local setup
ANTHROPIC_API_KEY="$CI_API_KEY" \
node create-isolated-claude.js "Run tests"
```

### 4. Demo/Prototype

```javascript
// Perfect for demos - clean slate every time
const demo = await createIsolatedClaude('Build a todo app', {
  mcpServerPath: './server-mcp.js'
});
```

## Comparison: Isolated vs Regular

| Feature | Regular Claude CLI | Isolated Instance |
|---------|-------------------|-------------------|
| Config | Uses ~/.claude/ | Temporary directory |
| History | Maintains sessions | No history |
| MCP Servers | Your configured ones | Custom/isolated |
| Cleanup | Persistent | Auto-cleanup |
| Use Case | Daily work | Testing/demos |

## Security Considerations

- ✅ Isolated instances don't touch your main config
- ✅ Temporary directories are cleaned up
- ✅ Auth token can be different per instance
- ✅ No persistent state or history
- ✅ Perfect for sandboxed environments

## Troubleshooting

### Auth Token Not Found

```bash
# Make sure to set ANTHROPIC_API_KEY
export ANTHROPIC_API_KEY="your-token"
```

### Config Directory Issues

```bash
# Check if temp directory is writable
ls -ld $(mktemp -d)
```

### MCP Server Not Found

```bash
# Use absolute path for MCP server
node create-isolated-claude.js --mcp-server /absolute/path/to/server.js
```

## Best Practices

1. **Always Cleanup**: Use `cleanup: true` option (default)
2. **Use Absolute Paths**: For MCP servers, use absolute paths
3. **Set Auth Token**: Always provide auth token explicitly
4. **Isolate Per Test**: Create new instance for each test
5. **No State**: Don't rely on conversation history

## Example: Complete Isolated Test

```javascript
import { createIsolatedClaudeWithMCP } from './create-isolated-claude.js';

async function runIsolatedTest() {
  // Create isolated instance with MCP
  const result = await createIsolatedClaudeWithMCP(
    'Use mcp__imagine__log_thought to log "Test started"',
    {
      mcpServerPath: resolve(__dirname, 'server-mcp.js'),
      model: 'sonnet',
      authToken: process.env.ANTHROPIC_API_KEY
    }
  );
  
  console.log('Result:', result.stdout);
  // Config directory automatically cleaned up
}

runIsolatedTest();
```

This creates a completely isolated Claude instance that:
- ✅ Uses your auth token
- ✅ Has its own config (temporary)
- ✅ No conversation history
- ✅ Doesn't touch your main setup
- ✅ Automatically cleans up after use

