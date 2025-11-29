/**
 * Conversation Manager
 * 
 * Utilities for managing conversation IDs and history in Claude Code instances.
 * 
 * Features:
 * - Extract conversation IDs from Claude CLI output
 * - Configure conversation history location
 * - Read conversation history files
 * - List conversations for an instance
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { spawn } from 'child_process';

/**
 * Extract conversation ID from Claude CLI JSON output
 * @param {string} output - Claude CLI stdout
 * @returns {string|null} - Session/conversation ID or null
 */
export function extractConversationId(output) {
  try {
    const data = JSON.parse(output);
    if (data.session_id && typeof data.session_id === 'string') {
      return data.session_id;
    }
  } catch (e) {
    // Try regex extraction as fallback
    const match = output.match(/session[_-]id["\s:]+([a-f0-9-]{36})/i);
    if (match) {
      return match[1];
    }
  }
  return null;
}

/**
 * Get conversation ID from a Claude CLI call
 * @param {string} prompt - Prompt to send
 * @param {Object} options - Options
 * @returns {Promise<string|null>} - Conversation ID
 */
export async function getConversationId(prompt, options = {}) {
  const {
    model = 'sonnet',
    authToken = null, // Claude CLI handles its own authentication
    mcpConfigPath = null
  } = options;

  return new Promise((resolve, reject) => {
    const args = [
      '--print',
      '--model', model,
      '--output-format', 'json',
      '--dangerously-skip-permissions'
    ];

    if (mcpConfigPath) {
      args.push('--mcp-config', mcpConfigPath);
    }

    const claude = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Optionally pass auth token if provided
        ...(authToken && { ANTHROPIC_API_KEY: authToken })
      }
    });

    let stdout = '';
    claude.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    claude.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Claude CLI exited with code ${code}`));
        return;
      }
      const sessionId = extractConversationId(stdout);
      resolve(sessionId);
    });

    claude.on('error', reject);

    claude.stdin.write(prompt);
    claude.stdin.end();

    // Timeout
    setTimeout(() => {
      claude.kill();
      reject(new Error('Timeout getting conversation ID'));
    }, 30000);
  });
}

/**
 * Get conversation history directory for an instance
 * @param {string} instancePath - Path to instance directory
 * @returns {string} - Path to conversation history directory
 */
export function getConversationHistoryPath(instancePath) {
  // Claude Code stores conversations in ~/.claude/projects/
  // But we want instance-specific location
  // Use instance's .claude directory if CLAUDE_CONFIG_DIR is set
  const configDir = process.env.CLAUDE_CONFIG_DIR || join(instancePath, '.claude');
  return join(configDir, 'projects');
}

/**
 * List conversation files for an instance
 * @param {string} instancePath - Path to instance directory
 * @returns {Promise<Array>} - Array of conversation file info
 */
export async function listConversations(instancePath) {
  const historyPath = getConversationHistoryPath(instancePath);
  
  try {
    // Check if directory exists
    await stat(historyPath);
  } catch (e) {
    // Directory doesn't exist yet
    return [];
  }

  const conversations = [];
  
  try {
    // List project directories
    const projects = await readdir(historyPath);
    
    for (const project of projects) {
      const projectPath = join(historyPath, project);
      const projectStat = await stat(projectPath);
      
      if (projectStat.isDirectory()) {
        // List conversation files (.jsonl files)
        const files = await readdir(projectPath);
        const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));
        
        for (const file of jsonlFiles) {
          const filePath = join(projectPath, file);
          const fileStat = await stat(filePath);
          
          conversations.push({
            sessionId: file.replace('.jsonl', ''),
            project: project,
            path: filePath,
            size: fileStat.size,
            modified: fileStat.mtime
          });
        }
      }
    }
  } catch (e) {
    // Error reading directory
    console.warn(`Warning: Could not read conversation history: ${e.message}`);
  }

  return conversations;
}

/**
 * Read a conversation file
 * @param {string} conversationPath - Path to .jsonl conversation file
 * @returns {Promise<Array>} - Array of conversation messages
 */
export async function readConversation(conversationPath) {
  try {
    const content = await readFile(conversationPath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    return lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter(msg => msg !== null);
  } catch (e) {
    throw new Error(`Could not read conversation: ${e.message}`);
  }
}

/**
 * Configure conversation history location for an instance
 * @param {string} instancePath - Path to instance directory
 * @returns {Object} - Configuration object
 */
export function configureConversationHistory(instancePath) {
  // Set CLAUDE_CONFIG_DIR to instance's .claude directory
  // This ensures conversations are stored per-instance
  const configDir = join(instancePath, '.claude');
  
  return {
    CLAUDE_CONFIG_DIR: configDir,
    // Also set XDG_CONFIG_HOME if on Linux
    ...(process.platform === 'linux' && {
      XDG_CONFIG_HOME: configDir
    })
  };
}

/**
 * Get conversation ID from instance using --continue
 * @param {string} instancePath - Path to instance directory
 * @param {Object} options - Options
 * @returns {Promise<string|null>} - Most recent conversation ID
 */
export async function getRecentConversationId(instancePath, options = {}) {
  const {
    model = 'sonnet',
    authToken = process.env.ANTHROPIC_API_KEY,
    mcpConfigPath = null
  } = options;

  // List conversations and get most recent
  const conversations = await listConversations(instancePath);
  
  if (conversations.length === 0) {
    return null;
  }

  // Sort by modified time, most recent first
  conversations.sort((a, b) => b.modified - a.modified);
  
  return conversations[0].sessionId;
}

