/**
 * Layer 0: Infrastructure & Environment Tests
 */

import { spawn } from 'child_process';
import http from 'http';

const SERVER_PORT = 3000;
const WS_PORT = 3001;

let serverProcess = null;

async function test0_1_DependencyCheck() {
  console.log('\n=== Test 0.1: Dependency Check ===');
  
  const { execSync } = await import('child_process');
  
  try {
    const nodeVersion = execSync('node -v', { encoding: 'utf-8' }).trim();
    const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
    
    if (majorVersion < 20) {
      console.log('❌ FAIL: Node version must be v20+');
      return false;
    }
    console.log(`✅ PASS: Node version ${nodeVersion}`);
    
    const npmList = execSync('npm list --depth=0', { encoding: 'utf-8', cwd: process.cwd() });
    const hasWs = npmList.includes('ws@');
    const hasExpress = npmList.includes('express@');
    
    if (!hasWs) {
      console.log('❌ FAIL: Missing ws dependency');
      return false;
    }
    if (!hasExpress) {
      console.log('❌ FAIL: Missing express dependency');
      return false;
    }
    
    console.log('✅ PASS: All required dependencies present');
    return true;
  } catch (error) {
    console.log('❌ FAIL:', error.message);
    return false;
  }
}

async function test0_2_ServerLifecycle() {
  console.log('\n=== Test 0.2: Server Lifecycle ===');
  
  return new Promise((resolve) => {
    serverProcess = spawn('node', ['--loader', 'tsx/esm', 'server.js'], {
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    
    let output = '';
    let hasStarted = false;
    
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('Local Imagine Server running')) {
        hasStarted = true;
        console.log('✅ PASS: Server started successfully');
        console.log('   Output:', output.trim());
        resolve(true);
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    setTimeout(() => {
      if (!hasStarted) {
        console.log('❌ FAIL: Server did not start within 5 seconds');
        console.log('   Output:', output);
        serverProcess.kill();
        resolve(false);
      }
    }, 5000);
  });
}

async function test0_3_StaticAssetServing() {
  console.log('\n=== Test 0.3: Static Asset Serving ===');
  
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${SERVER_PORT}/`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (data.includes('Waiting for Claude')) {
          console.log('✅ PASS: Static assets served correctly');
          console.log('   Found "Waiting for Claude" placeholder');
          resolve(true);
        } else {
          console.log('❌ FAIL: Expected "Waiting for Claude" not found');
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ FAIL: Could not connect to server:', error.message);
      resolve(false);
    });
    
    req.setTimeout(3000, () => {
      console.log('❌ FAIL: Request timeout');
      req.destroy();
      resolve(false);
    });
  });
}

async function test0_4_WebSocketHandshake() {
  console.log('\n=== Test 0.4: WebSocket Handshake ===');
  
  return new Promise((resolve) => {
    const WebSocket = (await import('ws')).default;
    const ws = new WebSocket(`ws://localhost:${WS_PORT}/ws`);
    
    let receivedMessage = false;
    
    ws.on('open', () => {
      console.log('✅ PASS: WebSocket connection established');
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.method === 'connected') {
          receivedMessage = true;
          console.log('✅ PASS: Received connection confirmation');
          console.log('   Conversation ID:', message.params?.conversationId);
          ws.close();
          resolve(true);
        }
      } catch (error) {
        // Ignore parse errors for now
      }
    });
    
    ws.on('error', (error) => {
      console.log('❌ FAIL: WebSocket error:', error.message);
      resolve(false);
    });
    
    setTimeout(() => {
      if (!receivedMessage) {
        console.log('❌ FAIL: Did not receive connection message within 3 seconds');
        ws.close();
        resolve(false);
      }
    }, 3000);
  });
}

async function runTests() {
  console.log('Starting Layer 0 Tests...\n');
  
  const results = {
    '0.1': await test0_1_DependencyCheck(),
    '0.2': await test0_2_ServerLifecycle(),
    '0.3': await test0_3_StaticAssetServing(),
    '0.4': await test0_4_WebSocketHandshake(),
  };
  
  console.log('\n=== Layer 0 Test Results ===');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`Test ${test}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  });
  
  const allPassed = Object.values(results).every(r => r);
  
  if (serverProcess) {
    serverProcess.kill();
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Handle cleanup
process.on('SIGINT', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  process.exit(0);
});

runTests().catch(console.error);

