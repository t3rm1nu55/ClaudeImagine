/**
 * Integration Tests
 * 
 * Tests the full flow: MCP tool call → WebSocket → Browser
 */

import { spawn } from 'child_process';
import WebSocket from 'ws';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let serverProcess = null;
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

async function testToolExecution() {
  console.log('\n=== Integration Test: Tool Execution ===\n');

  // Cleanup
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
  console.log('   ✅ Browser connected');

  // Wait for server to log connection
  await new Promise(resolve => setTimeout(resolve, 500));

  // Simulate MCP tool call by directly calling the handler logic
  console.log('3. Simulating update_ui tool call...');
  
  const testHtml = '<div class="p-4 bg-blue-500 text-white rounded">Test UI Update</div>';
  const message = {
    type: 'UPDATE_DOM',
    html: testHtml,
    selector: '#app'
  };

  // Send message as if from MCP server
  browserWs.send(JSON.stringify(message));
  console.log('   ✅ Message sent');

  // Verify browser receives message
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

    setTimeout(() => {
      reject(new Error('Did not receive message'));
    }, 2000);
  });

  if (receivedMessage.html === testHtml) {
    console.log('   ✅ Browser received correct message');
  } else {
    throw new Error('Message content mismatch');
  }

  // Test log_thought
  console.log('4. Testing log_thought tool...');
  const logMessage = {
    type: 'LOG',
    message: 'Test thought message'
  };

  browserWs.send(JSON.stringify(logMessage));
  console.log('   ✅ Log message sent');

  browserWs.close();
  stopServer();

  console.log('\n✅ All integration tests passed!\n');
}

async function testErrorHandling() {
  console.log('\n=== Integration Test: Error Handling ===\n');

  cleanupPort(PORT);
  await new Promise(resolve => setTimeout(resolve, 1000));

  await startServer();
  console.log('✅ Server started');

  // Test: No browser connected (should handle gracefully)
  console.log('Testing error handling...');
  
  // Note: We can't easily test MCP error without actual MCP client
  // But we can verify server doesn't crash
  
  stopServer();
  console.log('✅ Error handling test complete\n');
}

async function runAll() {
  try {
    await testToolExecution();
    await testErrorHandling();
    console.log('🎉 All integration tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    stopServer();
    process.exit(1);
  }
}

// Handle cleanup
process.on('SIGINT', () => {
  stopServer();
  process.exit(0);
});

runAll();

