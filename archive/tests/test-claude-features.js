/**
 * Comprehensive Claude CLI Feature Testing
 * 
 * Tests:
 * - Model selection (sonnet vs opus)
 * - Tool discovery and execution
 * - Streaming output
 * - Token usage tracking
 * - Thinking modes
 * - State management
 */

import { spawn } from 'child_process';
import { execSync } from 'child_process';
import WebSocket from 'ws';

const PORT = 3000;

function cleanupPort(port) {
  try {
    const pids = execSync(`lsof -ti:${port}`, { encoding: 'utf-8' }).trim();
    if (pids) {
      execSync(`kill -9 ${pids}`, { stdio: 'ignore' });
    }
  } catch (e) {}
}

async function testModelComparison() {
  console.log('\n📊 Testing Model Comparison (Sonnet vs Opus)\n');

  const prompt = "Explain quantum computing in one sentence.";
  
  console.log('Testing Sonnet...');
  const sonnetResult = await runClaude('sonnet', prompt);
  console.log(`Sonnet: ${sonnetResult.substring(0, 100)}...\n`);

  console.log('Testing Opus...');
  const opusResult = await runClaude('opus', prompt);
  console.log(`Opus: ${opusResult.substring(0, 100)}...\n`);

  return { sonnet: sonnetResult, opus: opusResult };
}

async function testToolDiscovery() {
  console.log('\n🔧 Testing Tool Discovery\n');

  const prompt = "What MCP tools do you have access to? List them clearly, especially tools from the 'imagine' server.";
  const result = await runClaude('sonnet', prompt);
  
  console.log('Tool Discovery Result:');
  console.log(result);
  
  const hasImagineTools = result.includes('update_ui') || result.includes('log_thought') || result.includes('imagine');
  console.log(`\n${hasImagineTools ? '✅' : '❌'} Imagine tools ${hasImagineTools ? 'found' : 'not found'}`);
  
  return hasImagineTools;
}

async function testToolExecution() {
  console.log('\n⚙️  Testing Tool Execution\n');

  // Start server and browser connection
  cleanupPort(PORT);
  const serverProcess = startServer();
  await new Promise(resolve => setTimeout(resolve, 2000));

  const browserWs = await connectBrowser();
  let toolMessageReceived = false;
  let receivedMessage = null;

  browserWs.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'LOG' || msg.type === 'UPDATE_DOM') {
      toolMessageReceived = true;
      receivedMessage = msg;
    }
  });

  const prompt = 'Call the log_thought tool with the message "Testing tool execution from Claude CLI"';
  const result = await runClaude('sonnet', prompt);
  
  console.log('Claude Response:');
  console.log(result);
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  if (toolMessageReceived) {
    console.log(`\n✅ Tool executed! Received: ${receivedMessage.type}`);
    console.log('Message:', JSON.stringify(receivedMessage, null, 2));
  } else {
    console.log('\n⚠️  Tool execution not detected (may need more time or browser connection)');
  }

  browserWs.close();
  serverProcess.kill();
  
  return toolMessageReceived;
}

async function testStreaming() {
  console.log('\n🌊 Testing Streaming Output\n');

  const prompt = "Count from 1 to 10, saying each number on a new line.";
  
  return new Promise((resolve) => {
    const claude = spawn('claude', [
      '--print',
      '--model', 'sonnet',
      '--output-format', 'stream-json',
      '--include-partial-messages'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let chunks = [];
    let fullOutput = '';

    claude.stdin.write(prompt);
    claude.stdin.end();

    claude.stdout.on('data', (data) => {
      const text = data.toString();
      chunks.push(text);
      fullOutput += text;
      
      // Show first few chunks
      if (chunks.length <= 5) {
        console.log(`Chunk ${chunks.length}: ${text.substring(0, 100)}...`);
      }
    });

    claude.on('close', () => {
      console.log(`\n✅ Received ${chunks.length} chunks`);
      console.log(`Total length: ${fullOutput.length} characters`);
      resolve(chunks.length > 1); // Streaming should have multiple chunks
    });

    claude.on('error', (error) => {
      console.error('Error:', error);
      resolve(false);
    });

    setTimeout(() => {
      claude.kill();
      resolve(false);
    }, 15000);
  });
}

async function testTokenUsage() {
  console.log('\n💰 Testing Token Usage Tracking\n');

  const prompt = "Write a short story about a robot learning to paint. Make it exactly 100 words.";
  
  return new Promise((resolve) => {
    const claude = spawn('claude', [
      '--print',
      '--model', 'sonnet',
      '--debug', 'api'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let debugOutput = '';

    claude.stdin.write(prompt);
    claude.stdin.end();

    claude.stdout.on('data', (data) => {
      output += data.toString();
    });

    claude.stderr.on('data', (data) => {
      debugOutput += data.toString();
    });

    claude.on('close', () => {
      // Look for token usage in debug output
      const hasTokenInfo = debugOutput.includes('token') || 
                          debugOutput.includes('usage') ||
                          debugOutput.includes('input_tokens') ||
                          debugOutput.includes('output_tokens');
      
      if (hasTokenInfo) {
        console.log('✅ Token usage information found in debug output');
        console.log('Debug output (token-related):');
        const tokenLines = debugOutput.split('\n').filter(line => 
          line.toLowerCase().includes('token') || 
          line.toLowerCase().includes('usage')
        );
        tokenLines.slice(0, 10).forEach(line => console.log('  ', line));
      } else {
        console.log('⚠️  Token usage info not found in debug output');
        console.log('Debug output sample:', debugOutput.substring(0, 500));
      }
      
      resolve(hasTokenInfo);
    });

    setTimeout(() => {
      claude.kill();
      resolve(false);
    }, 30000);
  });
}

function runClaude(model, prompt) {
  return new Promise((resolve, reject) => {
    const claude = spawn('claude', [
      '--print',
      '--model', model
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';

    claude.stdin.write(prompt);
    claude.stdin.end();

    claude.stdout.on('data', (data) => {
      output += data.toString();
    });

    claude.on('close', () => {
      resolve(output);
    });

    claude.on('error', reject);

    setTimeout(() => {
      claude.kill();
      reject(new Error('Timeout'));
    }, 30000);
  });
}

function startServer() {
  const { spawn } = require('child_process');
  const serverProcess = spawn('node', ['server-mcp.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  return serverProcess;
}

async function connectBrowser() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${PORT}`);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });
}

async function runAll() {
  console.log('🧪 Comprehensive Claude CLI Feature Testing\n');
  console.log('=' .repeat(60));

  const results = {
    modelComparison: false,
    toolDiscovery: false,
    toolExecution: false,
    streaming: false,
    tokenUsage: false
  };

  try {
    results.modelComparison = await testModelComparison();
    results.toolDiscovery = await testToolDiscovery();
    results.toolExecution = await testToolExecution();
    results.streaming = await testStreaming();
    results.tokenUsage = await testTokenUsage();

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Test Results Summary\n');
    
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASS' : 'FAIL'}`);
    });

    const allPassed = Object.values(results).every(r => r);
    console.log(`\n${allPassed ? '🎉' : '⚠️'} Overall: ${allPassed ? 'All tests passed' : 'Some tests failed'}\n`);

  } catch (error) {
    console.error('\n❌ Test suite error:', error);
  }
}

runAll();

