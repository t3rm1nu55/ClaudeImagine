/**
 * Create Backend Instance Playbook
 * 
 * Sets up a permanent Claude Code instance configured as MCP backend
 * for Claude Imagine. This instance can run continuously and serve
 * as the backend for browser-based UI building.
 */

import { writeFile, mkdir } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Creates a backend instance directory structure
 * @param {string} instancePath - Path where to create the instance
 * @param {Object} options - Configuration options
 */
export async function createBackendInstance(instancePath, options = {}) {
  const {
    model = 'sonnet',
    mcpServerPath = resolve(__dirname, '..', 'server-mcp.js'),
    port = 3000,
    systemPrompt = 'You are the backend for Claude Imagine. Always use MCP tools (mcp__imagine__update_ui and mcp__imagine__log_thought) for all operations.'
  } = options;

  // Create directory structure
  await mkdir(instancePath, { recursive: true });
  await mkdir(join(instancePath, '.claude'), { recursive: true });

  // Create CLAUDE.md
  const claudeMd = `# Claude Imagine Backend Instance

This is a permanent backend instance for Claude Imagine.

## Purpose
- Serve as MCP server backend
- Handle tool execution (update_ui, log_thought)
- Communicate with browser via WebSocket
- Provide stable, persistent backend service

## Configuration
- Model: ${model}
- Tools: MCP tools only (update_ui, log_thought)
- MCP Server: ${mcpServerPath}
- Port: ${port} (WebSocket)

## Behavior
- Always use MCP tools for UI operations
- Log all operations via log_thought
- Update UI via update_ui tool
- Maintain connection to browser

## Usage

\`\`\`bash
cd ${instancePath}
claude --mcp-config ./claude_config.json
\`\`\`

## MCP Tools Available

- \`mcp__imagine__update_ui\` - Update browser UI
- \`mcp__imagine__log_thought\` - Log messages to browser sidebar
`;

  await writeFile(join(instancePath, 'CLAUDE.md'), claudeMd);

  // Create .claude/settings.json
  const settings = {
    model: model,
    tools: "",  // Only MCP tools, no built-in tools
    mcpServers: {
      imagine: {
        command: "node",
        args: [mcpServerPath]
      }
    },
    systemPrompt: systemPrompt
  };

  await writeFile(
    join(instancePath, '.claude', 'settings.json'),
    JSON.stringify(settings, null, 2)
  );

  // Create claude_config.json (for --mcp-config flag)
  const mcpConfig = {
    mcpServers: {
      imagine: {
        command: "node",
        args: [mcpServerPath]
      }
    }
  };

  await writeFile(
    join(instancePath, 'claude_config.json'),
    JSON.stringify(mcpConfig, null, 2)
  );

  // Create start script with conversation history configuration
  const startScript = `#!/bin/bash
# Start Claude Imagine Backend Instance
# Conversation history stored in: ${join(instancePath, '.claude', 'projects')}

cd "${instancePath}"
export CLAUDE_CONFIG_DIR="${join(instancePath, '.claude')}"
claude --mcp-config ./claude_config.json --dangerously-skip-permissions
`;

  await writeFile(join(instancePath, 'start.sh'), startScript);
  
  // Make start script executable
  const { chmod } = await import('fs/promises');
  await chmod(join(instancePath, 'start.sh'), 0o755);

  return {
    instancePath,
    claudeMdPath: join(instancePath, 'CLAUDE.md'),
    settingsPath: join(instancePath, '.claude', 'settings.json'),
    configPath: join(instancePath, 'claude_config.json'),
    startScriptPath: join(instancePath, 'start.sh')
  };
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const instancePath = process.argv[2] || join(process.cwd(), 'backend-instance');
  
  createBackendInstance(instancePath)
    .then(result => {
      console.log('✅ Backend instance created successfully!');
      console.log(`\n📁 Instance directory: ${result.instancePath}`);
      console.log(`📝 CLAUDE.md: ${result.claudeMdPath}`);
      console.log(`⚙️  Settings: ${result.settingsPath}`);
      console.log(`🔧 Config: ${result.configPath}`);
      console.log(`🚀 Start script: ${result.startScriptPath}`);
      console.log(`\nTo start the backend instance:`);
      console.log(`  cd ${result.instancePath}`);
      console.log(`  ./start.sh`);
      console.log(`\nOr:`);
      console.log(`  claude --mcp-config ${result.configPath}`);
    })
    .catch(error => {
      console.error('❌ Error creating backend instance:', error.message);
      process.exit(1);
    });
}

