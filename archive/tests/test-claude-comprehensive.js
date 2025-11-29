/**
 * Comprehensive Claude CLI Testing
 * 
 * Tests all features: models, tools, streaming, tokens, state
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

function startServer() {
  return spawn('node', ['server-mcp.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
}

async function connectBrowser() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${PORT}`);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
    setTimeout(() => reject(new Error('Timeout')), 5000);
  });
}

function runClaude(model, prompt, options = {}) {
  return new Promise((resolve, reject) => {
    const args = ['--print', '--model', model];
    
    if (options.outputFormat) {
      args.push('--output-format', options.outputFormat);
      if (options.outputFormat === 'stream-json') {
        args.push('--verbose', '--include-partial-messages');
      }
    }
    
    if (options.debug) {
      args.push('--debug', options.debug);
    }

    const claude = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe']
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

    claude.on('close', (code) => {
      resolve({ stdout, stderr, code });
    });

    claude.on('error', reject);

    setTimeout(() => {
      claude.kill();
      reject(new Error('Timeout'));
    }, 60000);
  });
}

async function testModels() {
  console.log('\n📊 Testing Models (Sonnet vs Opus)\n');

  const prompt = "What is the capital of France? Answer in one word.";
  
  console.log('Testing Sonnet...');
  const sonnet = await runClaude('sonnet', prompt, { outputFormat: 'json' });
  const sonnetData = JSON.parse(sonnet.stdout);
  console.log(`✅ Sonnet: ${sonnetData.result}`);
  console.log(`   Cost: $${sonnetData.total_cost_usd}`);
  console.log(`   Input tokens: ${sonnetData.usage.input_tokens}`);
  console.log(`   Output tokens: ${sonnetData.usage.output_tokens}`);
  
  console.log('\nTesting Opus...');
  const opus = await runClaude('opus', prompt, { outputFormat: 'json' });
  const opusData = JSON.parse(opus.stdout);
  console.log(`✅ Opus: ${opusData.result}`);
  console.log(`   Cost: $${opusData.total_cost_usd}`);
  console.log(`   Input tokens: ${opusData.usage.input_tokens}`);
  console.log(`   Output tokens: ${opusData.usage.output_tokens}`);

  return { sonnet: sonnetData, opus: opusData };
}

async function testToolDiscovery() {
  console.log('\n🔧 Testing Tool Discovery\n');

  const prompt = "What MCP tools do you have? List tools from the 'imagine' server specifically.";
  const result = await runClaude('sonnet', prompt);
  
  console.log('Response:');
  console.log(result.stdout.substring(0, 500));
  
  const hasImagineTools = result.stdout.includes('update_ui') || 
                         result.stdout.includes('log_thought') ||
                         result.stdout.includes('imagine');
  
  console.log(`\n${hasImagineTools ? '✅' : '❌'} Imagine tools: ${hasImagineTools ? 'FOUND' : 'NOT FOUND'}`);
  
  return hasImagineTools;
}

async function testToolExecution() {
  console.log('\n⚙️  Testing Tool Execution\n');

  cleanupPort(PORT);
  const server = startServer();
  await new Promise(resolve => setTimeout(resolve, 2000));

  const browserWs = await connectBrowser();
  console.log('✅ Browser connected');

  let toolExecuted = false;
  let receivedMessage = null;

  browserWs.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'LOG' || msg.type === 'UPDATE_DOM') {
        toolExecuted = true;
        receivedMessage = msg;
        console.log(`✅ Tool executed: ${msg.type}`);
      }
    } catch (e) {}
  });

  const prompt = 'Call the log_thought tool with message "Hello from comprehensive test"';
  const result = await runClaude('sonnet', prompt);
  
  console.log('\nClaude response:');
  console.log(result.stdout.substring(0, 300));

  // Wait for tool execution
  await new Promise(resolve => setTimeout(resolve, 5000));

  browserWs.close();
  server.kill();

  if (toolExecuted) {
    console.log('\n✅ Tool execution verified!');
    console.log('Message:', JSON.stringify(receivedMessage, null, 2));
  } else {
    console.log('\n⚠️  Tool execution not detected');
  }

  return toolExecuted;
}

async function testStreaming() {
  console.log('\n🌊 Testing Streaming Output\n');

  const prompt = "Count from 1 to 5, one number per line.";
  
  return new Promise((resolve) => {
    const claude = spawn('claude', [
      '--print',
      '--model', 'sonnet',
      '--output-format', 'stream-json',
      '--verbose',
      '--include-partial-messages'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let chunks = 0;
    let lastChunk = '';

    claude.stdin.write(prompt);
    claude.stdin.end();

    claude.stdout.on('data', (data) => {
      chunks++;
      lastChunk = data.toString();
      if (chunks <= 3) {
        console.log(`Chunk ${chunks}: ${data.toString().substring(0, 100)}...`);
      }
    });

    claude.on('close', () => {
      console.log(`\n✅ Received ${chunks} streaming chunks`);
      resolve(chunks > 1);
    });

    setTimeout(() => {
      claude.kill();
      resolve(false);
    }, 15000);
  });
}

async function testTokenUsage() {
  console.log('\n💰 Testing Token Usage Tracking\n');

  const prompt = "Write exactly 50 words about artificial intelligence.";
  const result = await runClaude('sonnet', prompt, { outputFormat: 'json' });
  
  try {
    const data = JSON.parse(result.stdout);
    console.log('✅ Token usage data:');
    console.log(`   Input tokens: ${data.usage.input_tokens}`);
    console.log(`   Output tokens: ${data.usage.output_tokens}`);
    console.log(`   Total cost: $${data.total_cost_usd}`);
    console.log(`   Duration: ${data.duration_ms}ms`);
    
    if (data.modelUsage) {
      console.log('\n   Per-model usage:');
      Object.entries(data.modelUsage).forEach(([model, usage]) => {
        console.log(`   ${model}:`);
        console.log(`     Input: ${usage.inputTokens}, Output: ${usage.outputTokens}`);
        console.log(`     Cost: $${usage.costUSD}`);
      });
    }
    
    return true;
  } catch (e) {
    console.log('❌ Could not parse token usage');
    return false;
  }
}

async function testStateManagement() {
  console.log('\n💾 Testing State Management\n');

  // First turn
  const turn1 = await runClaude('sonnet', 'Remember: My favorite color is blue.');
  const sessionId1 = turn1.stdout.match(/session[_-]id["\s:]+([a-f0-9-]+)/i)?.[1];
  
  // Second turn (should remember)
  const turn2 = await runClaude('sonnet', 'What is my favorite color?');
  
  const remembers = turn2.stdout.toLowerCase().includes('blue');
  console.log(`${remembers ? '✅' : '❌'} State management: ${remembers ? 'REMEMBERS' : 'DOES NOT REMEMBER'}`);
  
  return remembers;
}

async function runAll() {
  console.log('🧪 Comprehensive Claude CLI Feature Testing\n');
  console.log('='.repeat(60));

  const results = {};

  try {
    results.models = await testModels();
    results.toolDiscovery = await testToolDiscovery();
    results.toolExecution = await testToolExecution();
    results.streaming = await testStreaming();
    results.tokenUsage = await testTokenUsage();
    results.stateManagement = await testStateManagement();

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Final Results Summary\n');
    
    Object.entries(results).forEach(([test, result]) => {
      if (typeof result === 'boolean') {
        console.log(`${result ? '✅' : '❌'} ${test}: ${result ? 'PASS' : 'FAIL'}`);
      } else if (result && typeof result === 'object') {
        console.log(`✅ ${test}: PASS (data collected)`);
      }
    });

    console.log('\n🎉 Testing complete!\n');

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    console.error(error.stack);
  }
}

runAll();

