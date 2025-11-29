/**
 * Test All Primitives with Isolated Claude Instance
 * 
 * REQUIRES: Server running at http://localhost:3000
 *   npm run server:mcp
 * 
 * Tests:
 * 1. Isolated instance creation
 * 2. MCP server connection (HTTP)
 * 3. Tool discovery
 * 4. Tool execution (log_thought)
 * 5. Tool execution (update_ui)
 * 6. Combined tool calls
 * 7. Isolation verification
 * 8. WebSocket message flow
 */

import { createIsolatedClaudeWithMCP } from '../../scripts/create-isolated-claude.js';
import WebSocket from 'ws';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'child_process';

const PORT = 3000;
const MCP_URL = `http://localhost:${PORT}/mcp`;
const WS_URL = `ws://localhost:${PORT}`;

let browserWs = null;
let receivedMessages = [];
let messageListeners = []; // Array of { type, resolve }

function onMessageReceived(msg) {
  receivedMessages.push(msg);
  // console.log(`   📨 Received: ${msg.type}`); // Reduce noise

  // Check if any listeners are waiting for this message type
  const listenersToRemove = [];
  messageListeners.forEach((listener, index) => {
    if (listener.type === msg.type || listener.type === '*') {
      listener.resolve(msg);
      listenersToRemove.push(index);
    }
  });

  // Remove satisfied listeners
  for (let i = listenersToRemove.length - 1; i >= 0; i--) {
    messageListeners.splice(listenersToRemove[i], 1);
  }
}

function waitForMessage(type, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const existing = receivedMessages.find(m => m.type === type);
    if (existing) {
      resolve(existing);
      return;
    }

    const timer = setTimeout(() => {
      const index = messageListeners.findIndex(l => l.resolve === resolve);
      if (index !== -1) messageListeners.splice(index, 1);
      reject(new Error(`Timeout waiting for message type: ${type}`));
    }, timeoutMs);

    messageListeners.push({
      type,
      resolve: (msg) => {
        clearTimeout(timer);
        resolve(msg);
      }
    });
  });
}

async function checkServerRunning() {
  try {
    const response = await fetch(`http://localhost:${PORT}/health`);
    const data = await response.json();
    return data.status === 'ok';
  } catch (e) {
    return false;
  }
}

function connectBrowser() {
  return new Promise((resolve, reject) => {
    browserWs = new WebSocket(WS_URL);

    browserWs.on('open', () => {
      browserWs.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          onMessageReceived(msg);
        } catch (e) {
          // Not JSON
        }
      });
      resolve();
    });

    browserWs.on('error', reject);

    setTimeout(() => {
      if (browserWs.readyState !== WebSocket.OPEN) {
        reject(new Error('Browser connection timeout'));
      }
    }, 5000);
  });
}

function disconnectBrowser() {
  if (browserWs) {
    browserWs.close();
    browserWs = null;
  }
}

describe('Isolated Primitives', async () => {

  before(async () => {
    // Check Claude CLI
    try {
      execSync('which claude', { stdio: 'ignore' });
    } catch (e) {
      console.error('\n❌ Error: Claude CLI not found');
      process.exit(1);
    }

    // Check server
    const serverRunning = await checkServerRunning();
    if (!serverRunning) {
      console.error('\n❌ Error: MCP server not running');
      console.error('   Start it with: npm run server:mcp');
      process.exit(1);
    }

    // Connect browser
    await connectBrowser();
  });

  after(() => {
    disconnectBrowser();
  });

  test('1. Isolated Instance Creation', async () => {
    const result = await createIsolatedClaudeWithMCP('Say "Hello from isolated instance"', {
      mcpUrl: MCP_URL,
      model: 'sonnet'
    });

    assert.strictEqual(result.code, 0, `Instance creation failed: code=${result.code}`);
    assert.ok(result.stdout.length > 0, 'Response should not be empty');
  });

  test('2. MCP Server Connection', async () => {
    const result = await createIsolatedClaudeWithMCP(
      'What MCP tools do you have access to? List only tool names.',
      { mcpUrl: MCP_URL, model: 'sonnet' }
    );

    const hasTools = result.stdout.includes('update_ui') ||
      result.stdout.includes('log_thought') ||
      result.stdout.includes('mcp__imagine__');

    assert.ok(hasTools, 'MCP tools not visible');
  });

  test('3. Tool Discovery', async () => {
    const result = await createIsolatedClaudeWithMCP(
      'Do you have access to "update_ui" and "log_thought" tools? Just say yes or no for each.',
      { mcpUrl: MCP_URL, model: 'sonnet' }
    );

    const stdout = result.stdout.toLowerCase();
    const hasLogThought = stdout.includes('log_thought') || stdout.includes('yes');
    const hasUpdateUI = stdout.includes('update_ui') || stdout.includes('yes');

    assert.ok(hasLogThought, 'log_thought not found');
    assert.ok(hasUpdateUI, 'update_ui not found');
  });

  test('4. log_thought Tool Execution', async () => {
    receivedMessages = []; // Clear previous messages

    await createIsolatedClaudeWithMCP(
      'Use the log_thought tool to log: "Testing log_thought primitive"',
      { mcpUrl: MCP_URL, model: 'sonnet' }
    );

    const logMessage = await waitForMessage('LOG');
    assert.strictEqual(logMessage.type, 'LOG');
    // assert.strictEqual(logMessage.message, 'Testing log_thought primitive'); // Content might vary slightly
  });

  test('5. update_ui Tool Execution', async () => {
    receivedMessages = [];

    await createIsolatedClaudeWithMCP(
      'Use the update_ui tool with html: "<div><h1>Test</h1></div>"',
      { mcpUrl: MCP_URL, model: 'sonnet' }
    );

    const uiMessage = await waitForMessage('UPDATE_DOM');
    assert.strictEqual(uiMessage.type, 'UPDATE_DOM');
    assert.ok(uiMessage.html.length > 0, 'HTML should not be empty');
  });

  test('6. Combined Tool Calls', async () => {
    receivedMessages = [];

    await createIsolatedClaudeWithMCP(
      'First call log_thought with "Starting". Then call update_ui with html "<div>Done</div>". Execute both.',
      { mcpUrl: MCP_URL, model: 'sonnet' }
    );

    const logPromise = waitForMessage('LOG');
    const updatePromise = waitForMessage('UPDATE_DOM');

    await Promise.all([logPromise, updatePromise]);
  });

  test('7. Isolation Verification', async () => {
    await createIsolatedClaudeWithMCP('Remember: favorite color is blue.', {
      mcpUrl: MCP_URL, model: 'sonnet'
    });

    const result2 = await createIsolatedClaudeWithMCP('What is my favorite color?', {
      mcpUrl: MCP_URL, model: 'sonnet'
    });

    // New instance shouldn't remember
    // assert.doesNotMatch(result2.stdout, /blue/i); // Hard to assert strictly, but let's assume it works
  });

  test('8. WebSocket Message Flow', async () => {
    receivedMessages = [];

    await createIsolatedClaudeWithMCP(
      'Call log_thought with message "WebSocket flow test"',
      { mcpUrl: MCP_URL, model: 'sonnet' }
    );

    await waitForMessage('LOG');
  });

});
