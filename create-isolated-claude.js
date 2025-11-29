/**
 * Create Isolated Claude CLI Instance
 * 
 * Creates a completely isolated Claude CLI instance that:
 * - Copies OAuth credentials from ~/.claude/ (if pre-authenticated)
 * - Has its own isolated config directory
 * - No conversation history (fresh start)
 * - Doesn't touch your main Claude setup
 * - Perfect for one-off standalone agents
 * 
 * Usage:
 *   node create-isolated-claude.js "your prompt here"
 * 
 * Or use as a module:
 *   import { createIsolatedClaude } from './create-isolated-claude.js';
 *   const result = await createIsolatedClaude('prompt', options);
 */

import { spawn } from 'child_process';
import { mkdtemp, writeFile, rm, readFile, copyFile, access, constants, chmod } from 'fs/promises';
import { join, dirname, resolve } from 'path';
import { tmpdir, homedir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Copy OAuth credentials from ~/.claude/ to isolated instance directory
 * This allows isolated instances to use pre-authenticated OAuth
 * @param {string} isolatedConfigDir - Isolated config directory
 */
async function copyOAuthCredentials(isolatedConfigDir) {
  const homeClaudeDir = join(homedir(), '.claude');
  const oauthFiles = ['token.json', 'credentials.json', 'auth.json']; // Common OAuth credential files
  
  try {
    // Check if ~/.claude/ exists
    await access(homeClaudeDir, constants.F_OK);
    
    // Try to copy each OAuth credential file if it exists
    for (const file of oauthFiles) {
      const sourceFile = join(homeClaudeDir, file);
      const destFile = join(isolatedConfigDir, file);
      
      try {
        // Check if source file exists
        await access(sourceFile, constants.F_OK);
        
        // Copy file securely
        await copyFile(sourceFile, destFile);
        
        // Set secure permissions (read/write for owner only)
        await chmod(destFile, 0o600); // rw-------
        
        // Only log first successful copy to avoid spam
        if (file === oauthFiles[0]) {
          // Silent success - OAuth credentials copied
        }
        break; // Found and copied OAuth file, no need to check others
      } catch (e) {
        // File doesn't exist, try next one
        continue;
      }
    }
  } catch (e) {
    // ~/.claude/ doesn't exist or no OAuth credentials found
    // This is fine - instance can use API key instead
  }
}

/**
 * Creates an isolated Claude CLI instance
 * @param {string} prompt - The prompt to send to Claude
 * @param {Object} options - Configuration options
 * @param {string} options.model - Model to use (default: 'sonnet')
 * @param {string} options.mcpConfigPath - Path to MCP config (optional)
 * @param {string} options.authToken - Anthropic API key (fallback if OAuth not available)
 * @param {string} options.tempDir - Temporary directory for isolated config (auto-generated if not provided)
 * @param {boolean} options.cleanup - Whether to cleanup temp directory after use (default: true)
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
export async function createIsolatedClaude(prompt, options = {}) {
  const {
    model = 'sonnet',
    mcpConfigPath = null,
    // For genuinely new instances, authToken may be needed if Claude CLI isn't authenticated
    // Claude CLI supports OAuth (stored in ~/.claude/) or API key via ANTHROPIC_API_KEY
    // If using isolated config dir, Claude CLI may not find OAuth credentials, so pass token
    authToken = process.env.ANTHROPIC_API_KEY || null,
    tempDir = null,
    cleanup = true,
    agents = null,
    tools = null,
    allowedTools = null,
    disallowedTools = null
  } = options;

  // Determine if we should use global auth (if no explicit token provided)
  const useGlobalAuth = !authToken;

  // Create isolated config directory (always needed for CWD isolation)
  const isolatedConfigDir = tempDir || await mkdtemp(join(tmpdir(), 'claude-isolated-'));
  const isolatedConfigPath = join(isolatedConfigDir, 'claude_config.json');

  // Only copy credentials if NOT using global auth (i.e. we want a fully isolated config)
  if (!useGlobalAuth) {
    await copyOAuthCredentials(isolatedConfigDir);
  }

  // Copy local .claude directory (agents, skills, commands) to isolated directory
  // This allows testing standard project structure patterns
  try {
    const localClaudeDir = join(__dirname, '.claude');
    const isolatedClaudeDir = join(isolatedConfigDir, '.claude');
    
    // Check if local .claude exists
    await access(localClaudeDir, constants.F_OK);
    
    // Copy recursively
    const { cp } = await import('fs/promises');
    await cp(localClaudeDir, isolatedClaudeDir, { recursive: true });
  } catch (e) {
    // Ignore if local .claude doesn't exist or copy fails
  }

  // Create minimal isolated config
  let isolatedConfig = { mcpServers: {} };
  
  // Load MCP config if provided
  if (mcpConfigPath) {
    try {
      const mcpConfigContent = await readFile(mcpConfigPath, 'utf-8');
      const mcpConfig = JSON.parse(mcpConfigContent);
      isolatedConfig.mcpServers = mcpConfig.mcpServers || {};
    } catch (e) {
      console.warn('Warning: Could not load MCP config:', e.message);
    }
  }

  // Write isolated config
  await writeFile(isolatedConfigPath, JSON.stringify(isolatedConfig, null, 2));

  // Build Claude CLI command
  const args = [
    '--print',
    '--model', model,
    '--dangerously-skip-permissions'  // Required for non-interactive mode
  ];

  // Add MCP config if provided
  if (mcpConfigPath) {
    args.push('--mcp-config', mcpConfigPath);
  }

  // Add custom agents if provided
  if (agents) {
    const agentsJson = typeof agents === 'string' ? agents : JSON.stringify(agents);
    args.push('--agents', agentsJson);
  }

  // Add tools configuration
  if (tools !== null) {
    args.push('--tools', tools);
  }
  if (allowedTools) {
    args.push('--allowedTools', allowedTools);
  }
  if (disallowedTools) {
    args.push('--disallowedTools', disallowedTools);
  }

  // Environment setup
  const env = {
    ...process.env,
    ...(authToken && { ANTHROPIC_API_KEY: authToken }),
    NODE_ENV: 'test',
    CLAUDE_SESSION_ID: '',  // Empty session = fresh start
  };

  // Only set CLAUDE_CONFIG_DIR if we are NOT using global auth
  // If using global auth, we rely on ~/.claude for credentials
  // but use the isolated CWD to create a new project history
  if (!useGlobalAuth) {
    env.CLAUDE_CONFIG_DIR = isolatedConfigDir;
    if (process.platform === 'linux') {
      env.XDG_CONFIG_HOME = isolatedConfigDir;
    }
  }

  return new Promise((resolve, reject) => {
    const claude = spawn('claude', args, {
      cwd: isolatedConfigDir, // Always run in isolated dir to scope project history
      stdio: ['pipe', 'pipe', 'pipe'],
      env
    });

    let stdout = '';
    let stderr = '';

    claude.stdin.write(prompt);
    claude.stdin.end();

    claude.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    claude.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    claude.on('close', async (code) => {
      // Cleanup isolated config directory
      if (cleanup && isolatedConfigDir) {
        try {
          await rm(isolatedConfigDir, { recursive: true, force: true });
        } catch (e) {
          console.error('Warning: Could not cleanup temp directory:', e.message);
        }
      }
      resolve({ stdout, stderr, code, configDir: isolatedConfigDir });
    });

    claude.on('error', async (error) => {
      // Cleanup on error
      if (cleanup && isolatedConfigDir) {
        try {
          await rm(isolatedConfigDir, { recursive: true, force: true });
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      reject(error);
    });

    // Timeout after 60 seconds
    setTimeout(async () => {
      claude.kill();
      if (cleanup && isolatedConfigDir) {
        try {
          await rm(isolatedConfigDir, { recursive: true, force: true });
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      reject(new Error('Claude CLI timeout'));
    }, 60000);
  });
}

/**
 * Creates an isolated Claude CLI instance with MCP server
 * @param {string} prompt - The prompt to send to Claude
 * @param {Object} options - Configuration options
 * @param {string} options.mcpServerPath - Path to MCP server script
 * @param {string} options.model - Model to use (default: 'sonnet')
 * @param {string} options.authToken - Anthropic API key
 * @param {Object} options.agents - Custom agents JSON object
 * @param {string} options.tools - Tools to allow (comma-separated)
 * @param {string} options.allowedTools - Allowed tools
 * @param {string} options.disallowedTools - Disallowed tools
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
export async function createIsolatedClaudeWithMCP(prompt, options = {}) {
  const {
    mcpServerPath = resolve(__dirname, 'server-mcp.js'),
    model = 'sonnet',
    // For genuinely new instances, authToken may be needed
    // Isolated config dir won't have OAuth credentials, so pass token
    authToken = process.env.ANTHROPIC_API_KEY || null,
    agents = null,
    tools = null,
    allowedTools = null,
    disallowedTools = null
  } = options;

  // Create isolated MCP config
  const isolatedConfigDir = await mkdtemp(join(tmpdir(), 'claude-isolated-mcp-'));
  const isolatedMCPConfigPath = join(isolatedConfigDir, 'mcp_config.json');

  const mcpConfig = {
    mcpServers: {
      imagine: {
        command: 'node',
        args: [mcpServerPath]
      }
    }
  };

  await writeFile(isolatedMCPConfigPath, JSON.stringify(mcpConfig, null, 2));

  return createIsolatedClaude(prompt, {
    model,
    authToken,
    mcpConfigPath: isolatedMCPConfigPath,
    tempDir: isolatedConfigDir,
    cleanup: true,
    agents,
    tools,
    allowedTools,
    disallowedTools
  });
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const prompt = process.argv[2] || 'Hello, this is an isolated Claude instance with no conversation history.';
  
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

