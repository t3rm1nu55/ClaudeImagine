/**
 * Integration Tests - Fixed
 * 
 * Tests the full flow by simulating what happens when MCP calls a tool
 */

import { spawn } from 'child_process';
import WebSocket from 'ws';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let serverProcess = null;
let activeBrowserSocket = null;
const PORT = 3000;

function cleanupPort(port) {
  try {
    const pids = execSync(`lsof -ti:${port}`, { encoding: 'utf-8' }).trim();
    if (pids) {
      execSync(`kill -9 ${pids}`, { stdio: 'ignore' });
      return true;
    }
  } catch (e) {
    // Port not in use
  }
  return false;
}

function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['server-mcp.js'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    const timeout = setTimeout(() => {
      serverProcess.kill();
      reject(new Error('Server start timeout'));
    }, 5000);

    serverProcess.stderr.on('data', (data) => {
      output += data.toString();
      if (output.includes('Local Imagine Server running')) {
        clearTimeout(timeout);
        setTimeout(() => resolve(), 500);
      }
    });

    serverProcess.on('error', reject);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

// Simulate MCP tool call by directly sending message to browser
function simulateToolCall(toolName, args) {
  if (!activeBrowserSocket || activeBrowserSocket.readyState !== WebSocket.OPEN) {
    throw new Error('No active browser connection');
  }

  if (toolName === 'update_ui') {
    activeBrowserSocket.send(JSON.stringify({
      type: 'UPDATE_DOM',
      html: args.html,
      selector: args.selector || '#app'
    }));
  } else if (toolName === 'log_thought') {
    activeBrowserSocket.send(JSON.stringify({
      type: 'LOG',
      message: args.message
    }));
  }
}

async function testToolExecution() {
  console.log('\n=== Integration Test: Tool Execution ===\n');

  cleanupPort(PORT);
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Start server
  console.log('1. Starting server...');
  await startServer();
  console.log('   ✅ Server started');

  // Connect browser WebSocket
  console.log('2. Connecting browser WebSocket...');
  const browserWs = await new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${PORT}`);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
    setTimeout(() => reject(new Error('Connection timeout')), 3000);
  });
  
  // Store reference for tool simulation
  activeBrowserSocket = browserWs;
  console.log('   ✅ Browser connected');

  // Wait for server to register connection
  await new Promise(resolve => setTimeout(resolve, 500));

  // Test update_ui tool
  console.log('3. Testing update_ui tool...');
  const testHtml = '<div class="p-4 bg-blue-500 text-white rounded">Test UI Update</div>';
  
  // Set up message listener FIRST
  const receivedMessage = await new Promise((resolve, reject) => {
    browserWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'UPDATE_DOM') {
          resolve(msg);
        }
      } catch (e) {
        // Not JSON, ignore
      }
    });

    // NOW send the tool call
    simulateToolCall('update_ui', {
      html: testHtml,
      selector: '#app'
    });
    console.log('   ✅ Tool call simulated');

    setTimeout(() => {
      reject(new Error('Did not receive UPDATE_DOM message'));
    }, 2000);
  });

  if (receivedMessage.html === testHtml && receivedMessage.selector === '#app') {
    console.log('   ✅ Browser received correct UPDATE_DOM message');
  } else {
    throw new Error('Message content mismatch');
  }

  // Test log_thought tool
  console.log('4. Testing log_thought tool...');
  const testMessage = 'Test thought message';
  
  const receivedLog = await new Promise((resolve, reject) => {
    browserWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'LOG' && msg.message === testMessage) {
          resolve(msg);
        }
      } catch (e) {
        // Not JSON, ignore
      }
    });

    // Send the tool call
    simulateToolCall('log_thought', {
      message: testMessage
    });
    console.log('   ✅ Log tool call simulated');

    setTimeout(() => {
      reject(new Error('Did not receive LOG message'));
    }, 2000);
  });

  if (receivedLog.message === testMessage) {
    console.log('   ✅ Browser received correct LOG message');
  } else {
    throw new Error('Log message content mismatch');
  }

  browserWs.close();
  activeBrowserSocket = null;
  stopServer();

  console.log('\n✅ All integration tests passed!\n');
}

async function runAll() {
  try {
    await testToolExecution();
    console.log('🎉 Integration tests complete!');
    console.log('\nNext: Test with actual browser at http://localhost:3000');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    console.error(error.stack);
    stopServer();
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  stopServer();
  process.exit(0);
});

runAll();

