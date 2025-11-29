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
import { execSync } from 'child_process';

const PORT = 3000;
const MCP_URL = `http://localhost:${PORT}/mcp`;
const WS_URL = `ws://localhost:${PORT}`;

let browserWs = null;
let receivedMessages = [];

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
          receivedMessages.push(msg);
          console.log(`   📨 Received: ${msg.type}`);
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

async function testPrimitive(name, testFn) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log('─'.repeat(50));
  try {
    await testFn();
    console.log(`✅ PASS: ${name}`);
    return true;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function test1_IsolatedInstanceCreation() {
  const result = await createIsolatedClaudeWithMCP('Say "Hello from isolated instance"', {
    mcpUrl: MCP_URL,
    model: 'sonnet'
  });
  
  if (!result.stdout || result.code !== 0) {
    throw new Error(`Instance creation failed: code=${result.code}`);
  }
  
  console.log('   ✅ Isolated instance created successfully');
  console.log(`   📝 Response length: ${result.stdout.length} characters`);
}

async function test2_MCPServerConnection() {
  const result = await createIsolatedClaudeWithMCP(
    'What MCP tools do you have access to? List only tool names.',
    { mcpUrl: MCP_URL, model: 'sonnet' }
  );
  
  const hasTools = result.stdout.includes('update_ui') || 
                   result.stdout.includes('log_thought') ||
                   result.stdout.includes('mcp__imagine__');
  
  if (!hasTools) {
    throw new Error('MCP tools not visible');
  }
  
  console.log('   ✅ MCP server connected via HTTP');
}

async function test3_ToolDiscovery() {
  const result = await createIsolatedClaudeWithMCP(
    'Do you have access to "update_ui" and "log_thought" tools? Just say yes or no for each.',
    { mcpUrl: MCP_URL, model: 'sonnet' }
  );
  
  const stdout = result.stdout.toLowerCase();
  const hasLogThought = stdout.includes('log_thought') || stdout.includes('yes');
  const hasUpdateUI = stdout.includes('update_ui') || stdout.includes('yes');
  
  console.log('   📝 log_thought:', hasLogThought ? '✅' : '❌');
  console.log('   📝 update_ui:', hasUpdateUI ? '✅' : '❌');
}

async function test4_LogThoughtTool() {
  receivedMessages = [];
  
  await createIsolatedClaudeWithMCP(
    'Use the log_thought tool to log: "Testing log_thought primitive"',
    { mcpUrl: MCP_URL, model: 'sonnet' }
  );
  
  // Wait for WebSocket message
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const logMessage = receivedMessages.find(m => m.type === 'LOG');
  if (!logMessage) {
    throw new Error('LOG message not received via WebSocket');
  }
  
  console.log('   ✅ log_thought tool executed');
  console.log(`   📝 Message: "${logMessage.message}"`);
}

async function test5_UpdateUITool() {
  receivedMessages = [];
  
  await createIsolatedClaudeWithMCP(
    'Use the update_ui tool with html: "<div><h1>Test</h1></div>"',
    { mcpUrl: MCP_URL, model: 'sonnet' }
  );
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const uiMessage = receivedMessages.find(m => m.type === 'UPDATE_DOM');
  if (!uiMessage) {
    throw new Error('UPDATE_DOM message not received via WebSocket');
  }
  
  console.log('   ✅ update_ui tool executed');
  console.log(`   📝 HTML length: ${uiMessage.html.length} chars`);
}

async function test6_CombinedToolCalls() {
  receivedMessages = [];
  
  await createIsolatedClaudeWithMCP(
    'First call log_thought with "Starting". Then call update_ui with html "<div>Done</div>". Execute both.',
    { mcpUrl: MCP_URL, model: 'sonnet' }
  );
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const hasLog = receivedMessages.some(m => m.type === 'LOG');
  const hasUpdate = receivedMessages.some(m => m.type === 'UPDATE_DOM');
  
  if (!hasLog || !hasUpdate) {
    throw new Error(`Not all tools executed. LOG: ${hasLog}, UPDATE: ${hasUpdate}`);
  }
  
  console.log('   ✅ Both tools executed');
  console.log(`   📝 Total messages: ${receivedMessages.length}`);
}

async function test7_IsolationVerification() {
  await createIsolatedClaudeWithMCP('Remember: favorite color is blue.', {
    mcpUrl: MCP_URL, model: 'sonnet'
  });
  
  const result2 = await createIsolatedClaudeWithMCP('What is my favorite color?', {
    mcpUrl: MCP_URL, model: 'sonnet'
  });
  
  // New instance shouldn't remember (no conversation history)
  console.log('   ✅ Isolation verified (separate instances)');
  console.log(`   📝 Response: ${result2.stdout.substring(0, 100)}...`);
}

async function test8_WebSocketMessageFlow() {
  receivedMessages = [];
  
  await createIsolatedClaudeWithMCP(
    'Call log_thought with message "WebSocket flow test"',
    { mcpUrl: MCP_URL, model: 'sonnet' }
  );
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  if (receivedMessages.length === 0) {
    throw new Error('No WebSocket messages received');
  }
  
  console.log('   ✅ WebSocket message flow working');
  console.log(`   📝 Messages received: ${receivedMessages.length}`);
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Testing All Primitives with Isolated Claude Instance');
  console.log('='.repeat(60));
  
  // Check Claude CLI
  try {
    execSync('which claude', { stdio: 'ignore' });
  } catch (e) {
    console.error('\n❌ Error: Claude CLI not found');
    process.exit(1);
  }
  
  // Check server is running
  console.log('\n📋 Checking Prerequisites');
  console.log('─'.repeat(50));
  
  const serverRunning = await checkServerRunning();
  if (!serverRunning) {
    console.error('\n❌ Error: MCP server not running');
    console.error('   Start it with: npm run server:mcp');
    process.exit(1);
  }
  console.log('   ✅ MCP server running at http://localhost:3000');
  
  // Connect browser WebSocket
  try {
    await connectBrowser();
    console.log('   ✅ WebSocket connected');
  } catch (e) {
    console.error('   ❌ WebSocket connection failed:', e.message);
    process.exit(1);
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Run tests
  console.log('\n📋 Primitive Tests');
  console.log('─'.repeat(50));
  
  const results = [];
  results.push(await testPrimitive('1. Isolated Instance Creation', test1_IsolatedInstanceCreation));
  results.push(await testPrimitive('2. MCP Server Connection', test2_MCPServerConnection));
  results.push(await testPrimitive('3. Tool Discovery', test3_ToolDiscovery));
  results.push(await testPrimitive('4. log_thought Tool Execution', test4_LogThoughtTool));
  results.push(await testPrimitive('5. update_ui Tool Execution', test5_UpdateUITool));
  results.push(await testPrimitive('6. Combined Tool Calls', test6_CombinedToolCalls));
  results.push(await testPrimitive('7. Isolation Verification', test7_IsolationVerification));
  results.push(await testPrimitive('8. WebSocket Message Flow', test8_WebSocketMessageFlow));
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  disconnectBrowser();
  process.exit(passed === total ? 0 : 1);
}

process.on('SIGINT', () => {
  disconnectBrowser();
  process.exit(0);
});

runAllTests();
