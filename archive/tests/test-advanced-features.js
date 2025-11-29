/**
 * Advanced Claude CLI Features Testing
 * 
 * Tests:
 * 1. Session management (--continue, --resume, --session-id)
 * 2. Custom agents (--agents)
 * 3. Tool limiting (--allowedTools, --disallowedTools, --tools)
 * 4. Multiple instances with different configs
 * 5. Thinking mode (if available)
 * 6. Sub-agents
 */

import { spawn } from 'child_process';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

function runClaude(args, input = null) {
  return new Promise((resolve, reject) => {
    const claude = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    if (input) {
      claude.stdin.write(input);
    }
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

async function testSessionManagement() {
  console.log('\n💾 Testing Session Management\n');

  // Test 1: Get session ID from first call
  console.log('1. Getting session ID from first call...');
  const turn1 = await runClaude([
    '--print',
    '--model', 'sonnet',
    '--output-format', 'json',
    'My name is Alice and my favorite color is blue.'
  ]);

  let sessionId = null;
  try {
    const data1 = JSON.parse(turn1.stdout);
    sessionId = data1.session_id;
    console.log(`   ✅ Session ID: ${sessionId}`);
  } catch (e) {
    console.log('   ⚠️  Could not parse session ID from JSON');
    // Try to extract from text
    const match = turn1.stdout.match(/session[_-]id["\s:]+([a-f0-9-]+)/i);
    if (match) {
      sessionId = match[1];
      console.log(`   ✅ Session ID (extracted): ${sessionId}`);
    }
  }

  // Test 2: Use --session-id to continue
  let turn2 = null;
  if (sessionId) {
    console.log('\n2. Testing --session-id to continue conversation...');
    turn2 = await runClaude([
      '--print',
      '--model', 'sonnet',
      '--session-id', sessionId,
      'What is my favorite color?'
    ]);

    const remembers = turn2.stdout.toLowerCase().includes('blue');
    console.log(`   ${remembers ? '✅' : '❌'} State management: ${remembers ? 'REMEMBERS' : 'DOES NOT REMEMBER'}`);
    console.log(`   Response: ${turn2.stdout.substring(0, 100)}...`);
  }

  // Test 3: Test --continue flag
  console.log('\n3. Testing --continue flag...');
  const turn3 = await runClaude([
    '--print',
    '--model', 'sonnet',
    '--continue',
    'What did we discuss?'
  ]);

  console.log(`   Response: ${turn3.stdout.substring(0, 150)}...`);

  return { sessionId, turn1, turn2, turn3 };
}

async function testCustomAgents() {
  console.log('\n🤖 Testing Custom Agents\n');

  const agentsConfig = JSON.stringify({
    reviewer: {
      description: "A code reviewer that checks for bugs and security issues",
      prompt: "You are a senior code reviewer. Review code for bugs, security issues, and best practices."
    },
    planner: {
      description: "A planning agent that creates detailed plans",
      prompt: "You are a planning expert. Create detailed, step-by-step plans."
    }
  });

  console.log('1. Testing custom agent: reviewer');
  const reviewer = await runClaude([
    '--print',
    '--model', 'sonnet',
    '--agents', agentsConfig,
    'Review this code: function add(a,b) { return a+b }'
  ]);

  console.log(`   Response: ${reviewer.stdout.substring(0, 200)}...`);

  console.log('\n2. Testing custom agent: planner');
  const planner = await runClaude([
    '--print',
    '--model', 'sonnet',
    '--agents', agentsConfig,
    'Create a plan for building a web app'
  ]);

  console.log(`   Response: ${planner.stdout.substring(0, 200)}...`);

  return { reviewer, planner };
}

async function testToolLimiting() {
  console.log('\n🛡️  Testing Tool Limiting\n');

  // Test 1: Allow only specific tools
  console.log('1. Testing --allowedTools (only Read tool)...');
  const limited = await runClaude([
    '--print',
    '--model', 'sonnet',
    '--allowedTools', 'Read',
    'What tools do you have? Try to use Bash tool.'
  ]);

  console.log(`   Response: ${limited.stdout.substring(0, 300)}...`);
  const hasBash = limited.stdout.toLowerCase().includes('bash');
  console.log(`   ${!hasBash ? '✅' : '❌'} Tool limiting: ${!hasBash ? 'WORKING' : 'NOT WORKING'}`);

  // Test 2: Disallow specific tools
  console.log('\n2. Testing --disallowedTools (disallow Bash)...');
  const disallowed = await runClaude([
    '--print',
    '--model', 'sonnet',
    '--disallowedTools', 'Bash',
    'What tools do you have? Can you use Bash?'
  ]);

  console.log(`   Response: ${disallowed.stdout.substring(0, 300)}...`);

  // Test 3: Use --tools to specify exact set
  console.log('\n3. Testing --tools (only Read, Write)...');
  const exact = await runClaude([
    '--print',
    '--model', 'sonnet',
    '--tools', 'Read,Write',
    'List your available tools.'
  ]);

  console.log(`   Response: ${exact.stdout.substring(0, 300)}...`);

  return { limited, disallowed, exact };
}

async function testMultipleInstances() {
  console.log('\n🔄 Testing Multiple Instances\n');

  console.log('1. Starting instance 1 (Sonnet, limited tools)...');
  const instance1 = spawn('claude', [
    '--print',
    '--model', 'sonnet',
    '--tools', 'Read',
    '--output-format', 'json',
    'What is 2+2?'
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  console.log('2. Starting instance 2 (Opus, all tools)...');
  const instance2 = spawn('claude', [
    '--print',
    '--model', 'opus',
    '--output-format', 'json',
    'What is 2+2?'
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  const results = await Promise.all([
    new Promise((resolve) => {
      let output = '';
      instance1.stdout.on('data', (d) => output += d.toString());
      instance1.on('close', () => resolve({ instance: 1, output }));
    }),
    new Promise((resolve) => {
      let output = '';
      instance2.stdout.on('data', (d) => output += d.toString());
      instance2.on('close', () => resolve({ instance: 2, output }));
    })
  ]);

  console.log('\n3. Comparing results...');
  results.forEach(({ instance, output }) => {
    try {
      const data = JSON.parse(output);
      console.log(`   Instance ${instance}:`);
      console.log(`     Model: ${data.modelUsage ? Object.keys(data.modelUsage)[0] : 'unknown'}`);
      console.log(`     Cost: $${data.total_cost_usd}`);
      console.log(`     Result: ${data.result}`);
    } catch (e) {
      console.log(`   Instance ${instance}: ${output.substring(0, 100)}...`);
    }
  });

  return results;
}

async function testThinkingMode() {
  console.log('\n🧠 Testing Thinking Mode\n');

  // Check if thinking mode is available
  console.log('1. Checking for thinking mode...');
  const check = await runClaude([
    '--print',
    '--model', 'opus', // Opus might have thinking mode
    'Do you have a thinking mode? Can you show your reasoning process?'
  ]);

  console.log(`   Response: ${check.stdout.substring(0, 300)}...`);

  // Try with system prompt
  console.log('\n2. Testing with thinking system prompt...');
  const thinking = await runClaude([
    '--print',
    '--model', 'opus',
    '--system-prompt', 'Show your thinking process step by step.',
    'Solve: If a train travels 60 mph for 2 hours, how far does it go?'
  ]);

  console.log(`   Response: ${thinking.stdout.substring(0, 400)}...`);

  return { check, thinking };
}

async function testSubAgents() {
  console.log('\n👥 Testing Sub-Agents\n');

  // Test using Task tool with agents
  console.log('1. Testing sub-agents via Task tool...');
  const subAgent = await runClaude([
    '--print',
    '--model', 'sonnet',
    'Use the Plan agent to create a plan for building a calculator app.'
  ]);

  console.log(`   Response: ${subAgent.stdout.substring(0, 400)}...`);

  // Test with custom agents
  console.log('\n2. Testing custom sub-agents...');
  const agentsConfig = JSON.stringify({
    architect: {
      description: "Designs system architecture",
      prompt: "You are a system architect. Design the architecture."
    }
  });

  const customSub = await runClaude([
    '--print',
    '--model', 'sonnet',
    '--agents', agentsConfig,
    'Use the architect agent to design a microservices architecture.'
  ]);

  console.log(`   Response: ${customSub.stdout.substring(0, 400)}...`);

  return { subAgent, customSub };
}

async function runAll() {
  console.log('🧪 Advanced Claude CLI Features Testing\n');
  console.log('='.repeat(60));

  const results = {};

  try {
    results.sessionManagement = await testSessionManagement();
    results.customAgents = await testCustomAgents();
    results.toolLimiting = await testToolLimiting();
    results.multipleInstances = await testMultipleInstances();
    results.thinkingMode = await testThinkingMode();
    results.subAgents = await testSubAgents();

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Test Results Summary\n');
    
    Object.keys(results).forEach((test) => {
      console.log(`✅ ${test}: Tested`);
    });

    console.log('\n🎉 Advanced testing complete!\n');

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    console.error(error.stack);
  }
}

runAll();

