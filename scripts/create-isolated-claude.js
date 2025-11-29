/**
 * Create Isolated Claude CLI Instance
 * 
 * Creates a completely isolated Claude CLI instance that:
 * - Uses the HTTP MCP server (must be running at localhost:3000)
 * - Has its own isolated config directory
 * - No conversation history (fresh start)
 * - Doesn't touch your main Claude setup
 * 
 * Usage:
 *   node create-isolated-claude.js "your prompt here"
 * 
 * Or use as a module:
 *   import { createIsolatedClaude } from './create-isolated-claude.js';
 *   const result = await createIsolatedClaude('prompt', options);
 */

import { spawn } from 'child_process';
import { mkdtemp, writeFile, rm, access, constants, chmod, copyFile, cp } from 'fs/promises';
import { join, dirname, resolve } from 'path';
import { tmpdir, homedir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// Default MCP server URL (HTTP transport)
const DEFAULT_MCP_URL = 'http://localhost:3000/mcp';

/**
 * Copy OAuth credentials from ~/.claude/ to isolated instance directory
 */
async function copyOAuthCredentials(isolatedConfigDir) {
  const homeClaudeDir = join(homedir(), '.claude');
  const oauthFiles = ['token.json', 'credentials.json', 'auth.json'];

  try {
    await access(homeClaudeDir, constants.F_OK);

    for (const file of oauthFiles) {
      const sourceFile = join(homeClaudeDir, file);
      const destFile = join(isolatedConfigDir, file);

      try {
        await access(sourceFile, constants.F_OK);
        await copyFile(sourceFile, destFile);
        await chmod(destFile, 0o600);
        break;
      } catch (e) {
        continue;
      }
    }
  } catch (e) {
    // No OAuth credentials found
  }
}

/**
 * Creates an isolated Claude CLI instance
 * @param {string} prompt - The prompt to send to Claude
 * @param {Object} options - Configuration options
 * @param {string} options.model - Model to use (default: 'sonnet')
 * @param {string} options.mcpUrl - MCP server URL (default: http://localhost:3000/mcp)
 * @param {string} options.authToken - Anthropic API key (optional, uses OAuth if not provided)
 * @param {string} options.tempDir - Temporary directory (auto-generated if not provided)
 * @param {boolean} options.cleanup - Whether to cleanup temp directory (default: true)
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
export async function createIsolatedClaude(prompt, options = {}) {
  const {
    model = 'sonnet',
    mcpUrl = DEFAULT_MCP_URL,
    authToken = process.env.ANTHROPIC_API_KEY || null,
    tempDir = null,
    cleanup = true,
    agents = null,
    tools = null,
    allowedTools = null,
    disallowedTools = null,
    mcpApiKey = null,
    interactive = false
  } = options;

  const useGlobalAuth = !authToken;
  const isolatedConfigDir = tempDir || await mkdtemp(join(tmpdir(), 'claude-isolated-'));
  const mcpConfigPath = join(isolatedConfigDir, 'mcp_config.json');

  // Copy OAuth credentials if not using explicit token
  if (!useGlobalAuth) {
    await copyOAuthCredentials(isolatedConfigDir);
  }

  // Copy local .claude directory (agents, skills, commands)
  try {
    const localClaudeDir = join(PROJECT_ROOT, '.claude');
    const isolatedClaudeDir = join(isolatedConfigDir, '.claude');
    await access(localClaudeDir, constants.F_OK);
    await cp(localClaudeDir, isolatedClaudeDir, { recursive: true });
  } catch (e) {
    // Ignore if doesn't exist
  }

  // Create MCP config pointing to HTTP server
  const mcpConfig = {
    mcpServers: {
      imagine: {
        type: "http",
        url: mcpUrl,
        headers: mcpApiKey ? { Authorization: `Bearer ${mcpApiKey}` } : undefined
      }
    }
  };
  await writeFile(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));

  // Build Claude CLI command
  const args = [
    '--print',
    '--model', model,
    '--mcp-config', mcpConfigPath,
    '--dangerously-skip-permissions'
  ];

  if (agents) {
    const agentsJson = typeof agents === 'string' ? agents : JSON.stringify(agents);
    args.push('--agents', agentsJson);
  }
  if (tools !== null) {
    args.push('--tools', tools);
  }
  if (allowedTools) {
    args.push('--allowedTools', allowedTools);
  }
  if (disallowedTools) {
    args.push('--disallowedTools', disallowedTools);
  }

  const env = {
    ...process.env,
    ...(authToken && { ANTHROPIC_API_KEY: authToken }),
    NODE_ENV: 'test',
    CLAUDE_SESSION_ID: ''
  };

  if (!useGlobalAuth) {
    env.CLAUDE_CONFIG_DIR = isolatedConfigDir;
    if (process.platform === 'linux') {
      env.XDG_CONFIG_HOME = isolatedConfigDir;
    }
  }

  return new Promise((resolve, reject) => {
    const claude = spawn('claude', args, {
      cwd: isolatedConfigDir,
      stdio: interactive ? 'inherit' : ['pipe', 'pipe', 'pipe'],
      env
    });

    let stdout = '';
    let stderr = '';

    if (!interactive) {
      claude.stdin.write(prompt);
      claude.stdin.end();

      claude.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      claude.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    claude.on('close', async (code) => {
      if (cleanup && isolatedConfigDir) {
        try {
          await rm(isolatedConfigDir, { recursive: true, force: true });
        } catch (e) {
          // Ignore
        }
      }
      resolve({ stdout, stderr, code, configDir: isolatedConfigDir });
    });

    claude.on('error', async (error) => {
      if (cleanup && isolatedConfigDir) {
        try {
          await rm(isolatedConfigDir, { recursive: true, force: true });
        } catch (e) { }
      }
      reject(error);
    });

    setTimeout(async () => {
      claude.kill();
      if (cleanup && isolatedConfigDir) {
        try {
          await rm(isolatedConfigDir, { recursive: true, force: true });
        } catch (e) { }
      }
      reject(new Error('Claude CLI timeout'));
    }, 300000); // 5 minutes
  });
}

/**
 * Creates an isolated Claude CLI instance with MCP (HTTP transport)
 * Server must be running at the specified URL
 */
export async function createIsolatedClaudeWithMCP(prompt, options = {}) {
  const {
    mcpUrl = DEFAULT_MCP_URL,
    model = 'sonnet',
    authToken = process.env.ANTHROPIC_API_KEY || null,
    agents = null,
    tools = null,
    allowedTools = null,
    disallowedTools = null,
    mcpApiKey = null,
    interactive = false
  } = options;

  return createIsolatedClaude(prompt, {
    model,
    mcpUrl,
    authToken,
    agents,
    tools,
    allowedTools,
    disallowedTools,
    mcpApiKey,
    interactive
  });
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const prompt = process.argv[2] || 'Hello, this is an isolated Claude instance.';

  createIsolatedClaude(prompt)
    .then(result => {
      console.log('=== Isolated Claude Response ===');
      console.log(result.stdout);
      if (result.stderr) {
        console.error('=== Stderr ===');
        console.error(result.stderr);
      }
      process.exit(result.code);
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}
