/**
 * Create Client Instance Playbook
 * 
 * Sets up a Claude Code instance that connects to a backend MCP server.
 * This is for testing and development.
 */

import { writeFile, mkdir } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Creates a client instance directory structure
 * @param {string} instancePath - Path where to create the instance
 * @param {Object} options - Configuration options
 */
export async function createClientInstance(instancePath, options = {}) {
  const {
    model = 'sonnet',
    mcpServerPath = resolve(__dirname, '..', 'server-mcp.js'),
    backendUrl = null,  // If connecting to remote backend
    systemPrompt = 'You are a client instance connecting to Claude Imagine backend. Use MCP tools to interact with the backend.'
  } = options;

  // Create directory structure
  await mkdir(instancePath, { recursive: true });
  await mkdir(join(instancePath, '.claude'), { recursive: true });

  // Create CLAUDE.md
  const claudeMd = `# Claude Imagine Client Instance

This instance connects to the Claude Imagine backend.

## Purpose
- Connect to backend MCP server
- Test tool execution
- Develop new features
- Debug issues

## Configuration
- Model: ${model}
- MCP Server: ${mcpServerPath}
${backendUrl ? `- Backend URL: ${backendUrl}` : ''}

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

  // Create claude_config.json
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

  // Create start script
  const startScript = `#!/bin/bash
# Start Claude Imagine Client Instance

cd "${instancePath}"
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
  const instancePath = process.argv[2] || join(process.cwd(), 'client-instance');
  
  createClientInstance(instancePath)
    .then(result => {
      console.log('✅ Client instance created successfully!');
      console.log(`\n📁 Instance directory: ${result.instancePath}`);
      console.log(`📝 CLAUDE.md: ${result.claudeMdPath}`);
      console.log(`⚙️  Settings: ${result.settingsPath}`);
      console.log(`🔧 Config: ${result.configPath}`);
      console.log(`🚀 Start script: ${result.startScriptPath}`);
      console.log(`\nTo start the client instance:`);
      console.log(`  cd ${result.instancePath}`);
      console.log(`  ./start.sh`);
    })
    .catch(error => {
      console.error('❌ Error creating client instance:', error.message);
      process.exit(1);
    });
}

