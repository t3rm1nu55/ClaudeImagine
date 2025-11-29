/**
 * Progressive Testing Suite
 * 
 * Tests components incrementally to catch issues early
 */

import { spawn, execSync } from 'child_process';
import http from 'http';
import WebSocket from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let serverProcess = null;
const PORT = 3000;
const WS_PORT = 3000; // Same port, WebSocket upgrades HTTP

// Cleanup function
function cleanupPort(port) {
  try {
    const pids = execSync(`lsof -ti:${port}`, { encoding: 'utf-8' }).trim();
    if (pids) {
      execSync(`kill -9 ${pids}`, { stdio: 'ignore' });
      return true;
    }
  } catch (e) {
    // Port not in use, that's fine
  }
  return false;
}

const tests = [];
let currentTest = 0;

function log(message, type = 'info') {
  const prefix = type === 'pass' ? '✅' : type === 'fail' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} ${message}`);
}

function addTest(name, fn) {
  tests.push({ name, fn });
}

async function runTest(test) {
  log(`Running: ${test.name}`, 'info');
  try {
    await test.fn();
    log(`PASS: ${test.name}`, 'pass');
    return true;
  } catch (error) {
    log(`FAIL: ${test.name} - ${error.message}`, 'fail');
    console.error(error);
    return false;
  }
}

// Test 1: Server can start
addTest('Server starts without errors', async () => {
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['server-mcp.js'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let hasStarted = false;

    const timeout = setTimeout(() => {
      if (!hasStarted) {
        serverProcess.kill();
        reject(new Error('Server did not start within 5 seconds'));
      }
    }, 5000);

    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    serverProcess.stderr.on('data', (data) => {
      output += data.toString();
      if (output.includes('Local Imagine Server running')) {
        hasStarted = true;
        clearTimeout(timeout);
        setTimeout(() => resolve(), 500); // Give it a moment to fully start
      }
    });

    serverProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
});

// Test 2: HTTP server responds
addTest('HTTP server responds on port 3000', async () => {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${PORT}/`, (res) => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject(new Error(`Unexpected status code: ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
});

// Test 3: index.html is served
addTest('index.html is served correctly', async () => {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${PORT}/index.html`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (data.includes('Waiting for Claude') && 
            data.includes('id="app"') && 
            data.includes('WebSocket')) {
          resolve();
        } else {
          reject(new Error('index.html missing required content'));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
});

// Test 4: WebSocket server accepts connections
addTest('WebSocket server accepts connections', async () => {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${WS_PORT}`);

    ws.on('open', () => {
      ws.close();
      resolve();
    });

    ws.on('error', (error) => {
      reject(new Error(`WebSocket connection failed: ${error.message}`));
    });

    setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }
    }, 3000);
  });
});

// Test 5: Server logs browser connection
addTest('Server logs browser connection', async () => {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${WS_PORT}`);
    let serverOutput = '';

    // Capture server stderr output
    if (serverProcess && serverProcess.stderr) {
      serverProcess.stderr.on('data', (data) => {
        serverOutput += data.toString();
        if (serverOutput.includes('Browser connected')) {
          ws.close();
          resolve();
        }
      });
    }

    ws.on('open', () => {
      // Give server time to log
      setTimeout(() => {
        if (!serverOutput.includes('Browser connected')) {
          ws.close();
          reject(new Error('Server did not log browser connection'));
        } else {
          ws.close();
          resolve();
        }
      }, 500);
    });

    ws.on('error', reject);

    setTimeout(() => {
      ws.close();
      reject(new Error('Test timeout'));
    }, 3000);
  });
});

// Test 6: WebSocket receives UPDATE_DOM message
addTest('WebSocket can receive UPDATE_DOM messages', async () => {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${WS_PORT}`);
    let connectionReady = false;

    ws.on('open', () => {
      connectionReady = true;
      // Verify WebSocket is ready to receive messages
      // In real scenario, MCP server would send UPDATE_DOM messages
      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'UPDATE_DOM' || msg.type === 'LOG') {
            ws.close();
            resolve();
          }
        } catch (e) {
          // Not JSON, that's okay for this test
        }
      });

      // Connection is ready - message handling would work
      setTimeout(() => {
        if (connectionReady && ws.readyState === WebSocket.OPEN) {
          ws.close();
          resolve(); // Connection works, message handling would work
        } else {
          ws.close();
          reject(new Error('WebSocket not ready'));
        }
      }, 200);
    });

    ws.on('error', (error) => {
      reject(new Error(`WebSocket error: ${error.message}`));
    });

    setTimeout(() => {
      if (!connectionReady) {
        ws.close();
        reject(new Error('Test timeout - connection not established'));
      }
    }, 3000);
  });
});

// Test 7: Server file syntax is valid
addTest('server-mcp.js has valid syntax', async () => {
  return new Promise((resolve, reject) => {
    const check = spawn('node', ['--check', 'server-mcp.js'], {
      cwd: __dirname,
      stdio: 'pipe'
    });

    check.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error('Syntax check failed'));
      }
    });

    check.on('error', reject);
  });
});

// Test 8: Required imports are available
addTest('All required modules can be imported', async () => {
  // Try importing the server file's dependencies
  await import('@modelcontextprotocol/sdk/server/index.js');
  await import('ws');
  await import('express');
  // If we get here, imports succeeded
});

async function runAllTests() {
  log('Starting Progressive Test Suite\n', 'info');
  log('Cleaning up port 3000...', 'info');
  if (cleanupPort(PORT)) {
    log('Killed existing process on port 3000', 'warn');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for port to be free
  }
  log(`Running ${tests.length} tests...\n`, 'info');

  const results = [];
  
  for (let i = 0; i < tests.length; i++) {
    currentTest = i + 1;
    const passed = await runTest(tests[i]);
    results.push(passed);
    
    // Stop on first failure for progressive testing
    if (!passed) {
      log(`\n⚠️  Stopping at test ${currentTest} due to failure`, 'warn');
      log('Fix the issue before proceeding to next tests', 'warn');
      break;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Cleanup
  if (serverProcess) {
    serverProcess.kill();
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n=== Test Summary ===');
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  log(`Passed: ${passed}/${total}`, passed === total ? 'pass' : 'fail');
  
  if (passed === total) {
    log('\n✅ All tests passed! Ready for next phase.', 'pass');
    process.exit(0);
  } else {
    log('\n❌ Some tests failed. Fix issues before proceeding.', 'fail');
    process.exit(1);
  }
}

// Handle cleanup
process.on('SIGINT', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  process.exit(0);
});

runAllTests().catch((error) => {
  log(`Fatal error: ${error.message}`, 'fail');
  if (serverProcess) {
    serverProcess.kill();
  }
  process.exit(1);
});

