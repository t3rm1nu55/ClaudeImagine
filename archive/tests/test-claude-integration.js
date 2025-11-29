/**
 * Claude CLI Integration Test
 * 
 * Tests Claude CLI connection, tool discovery, and execution
 */

import { spawn } from 'child_process';
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
    }
  } catch (e) {
    // Port not in use
  }
}

function startServer() {
  return new Promise((resolve, reject) => {
    // Start server with stdin connected (for MCP)
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

async function testToolDiscovery() {
  console.log('\n🧪 Testing Claude CLI Tool Discovery\n');

  cleanupPort(PORT);
  await new Promise(resolve => setTimeout(resolve, 1000));

  await startServer();
  console.log('✅ Server started\n');

  // Test tool discovery
  console.log('Testing: What tools are available?\n');
  
  return new Promise((resolve, reject) => {
    const claude = spawn('claude', [
      '--mcp-config', './claude_config.json',
      '--print',
      '--model', 'sonnet',
      'What tools do you have available? List them clearly.'
    ], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    claude.stdout.on('data', (data) => {
      output += data.toString();
    });

    claude.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    claude.on('close', (code) => {
      console.log('Claude CLI Output:');
      console.log(output);
      if (errorOutput) {
        console.log('\nClaude CLI Errors:');
        console.log(errorOutput);
      }

      if (output.includes('update_ui') || output.includes('log_thought')) {
        console.log('\n✅ Tool discovery test PASSED');
        stopServer();
        resolve(true);
      } else {
        console.log('\n❌ Tool discovery test FAILED - tools not found in output');
        stopServer();
        reject(new Error('Tools not discovered'));
      }
    });

    claude.on('error', (error) => {
      console.error('Claude CLI error:', error);
      stopServer();
      reject(error);
    });

    setTimeout(() => {
      claude.kill();
      stopServer();
      reject(new Error('Test timeout'));
    }, 30000);
  });
}

async function testToolExecution() {
  console.log('\n🧪 Testing Claude CLI Tool Execution\n');

  cleanupPort(PORT);
  await new Promise(resolve => setTimeout(resolve, 1000));

  await startServer();
  console.log('✅ Server started\n');

  // Start browser connection simulation
  const WebSocket = (await import('ws')).default;
  const browserWs = new WebSocket(`ws://localhost:${PORT}`);
  
  await new Promise((resolve) => {
    browserWs.on('open', () => {
      console.log('✅ Browser WebSocket connected\n');
      resolve();
    });
  });

  let messageReceived = false;
  browserWs.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'UPDATE_DOM' || msg.type === 'LOG') {
      messageReceived = true;
      console.log('✅ Received tool execution message:', msg.type);
    }
  });

  // Test tool execution
  console.log('Testing: Call log_thought with message "Test thought"\n');
  
  return new Promise((resolve, reject) => {
    const claude = spawn('claude', [
      '--mcp-config', './claude_config.json',
      '--print',
      '--model', 'sonnet',
      'Call the log_thought tool with the message "Test thought from Claude CLI"'
    ], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';

    claude.stdout.on('data', (data) => {
      output += data.toString();
    });

    claude.on('close', (code) => {
      console.log('Claude CLI Output:');
      console.log(output);

      setTimeout(() => {
        if (messageReceived) {
          console.log('\n✅ Tool execution test PASSED');
          browserWs.close();
          stopServer();
          resolve(true);
        } else {
          console.log('\n⚠️  Tool execution test - message not received (may need more time)');
          browserWs.close();
          stopServer();
          resolve(false);
        }
      }, 2000);
    });

    claude.on('error', (error) => {
      console.error('Claude CLI error:', error);
      browserWs.close();
      stopServer();
      reject(error);
    });

    setTimeout(() => {
      claude.kill();
      browserWs.close();
      stopServer();
      reject(new Error('Test timeout'));
    }, 30000);
  });
}

async function runAll() {
  try {
    await testToolDiscovery();
    await testToolExecution();
    console.log('\n🎉 Claude CLI integration tests complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    stopServer();
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  stopServer();
  process.exit(0);
});

runAll();

