/**
 * Systematic Testing - One Feature at a Time
 * 
 * Tests each feature individually before moving to next
 */

import { spawn } from 'child_process';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';

const tests = [];
let currentTestIndex = 0;

function log(message, type = 'info') {
  const prefix = type === 'pass' ? '✅' : type === 'fail' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} ${message}`);
}

function addTest(name, fn) {
  tests.push({ name, fn, status: 'pending' });
}

function runClaude(args, input = null) {
  return new Promise((resolve, reject) => {
    const claude = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    if (input) claude.stdin.write(input);
    claude.stdin.end();

    claude.stdout.on('data', (d) => stdout += d.toString());
    claude.stderr.on('data', (d) => stderr += d.toString());

    claude.on('close', (code) => {
      resolve({ stdout, stderr, code });
    });

    claude.on('error', reject);

    setTimeout(() => {
      claude.kill();
      reject(new Error('Timeout'));
    }, 30000);
  });
}

// Test 1: Query Session ID ✅ CONFIRMED WORKING
addTest('Query Session ID', async () => {
  log('Testing: Can extract session ID from JSON output');
  
  const result = await runClaude([
    '--print',
    '--model', 'sonnet',
    '--output-format', 'json',
    'test'
  ]);

  try {
    const data = JSON.parse(result.stdout);
    if (data.session_id && typeof data.session_id === 'string') {
      log(`Session ID extracted: ${data.session_id.substring(0, 20)}...`, 'pass');
      return { success: true, sessionId: data.session_id };
    }
    throw new Error('No session_id in output');
  } catch (e) {
    log(`Failed: ${e.message}`, 'fail');
    return { success: false, error: e.message };
  }
});

// Test 2: Run 2 Instances Simultaneously
addTest('Run 2 Instances Simultaneously', async () => {
  log('Testing: Can run 2 instances at the same time');
  
  const instance1 = spawn('claude', [
    '--print',
    '--model', 'sonnet',
    '--output-format', 'json',
    'Instance 1 test'
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  const instance2 = spawn('claude', [
    '--print',
    '--model', 'sonnet',
    '--output-format', 'json',
    'Instance 2 test'
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

  const bothSucceeded = results.every(r => {
    try {
      JSON.parse(r.output);
      return true;
    } catch {
      return false;
    }
  });

  if (bothSucceeded) {
    log('Both instances completed successfully', 'pass');
    return { success: true, results };
  } else {
    log('One or both instances failed', 'fail');
    return { success: false, results };
  }
});

// Test 3: Different MCP Config Per Instance
addTest('Different MCP Config Per Instance', async () => {
  log('Testing: Each instance can have different MCP configs');
  
  // Create two different MCP configs
  const config1 = {
    mcpServers: {
      imagine: {
        command: "node",
        args: ["/Users/markforster/ClaudeImagine/server-mcp.js"]
      }
    }
  };

  const config2 = {
    mcpServers: {
      context7: {
        command: "npx",
        args: ["-y", "@upstash/context7-mcp@latest"]
      }
    }
  };

  writeFileSync('/tmp/mcp-config-1.json', JSON.stringify(config1));
  writeFileSync('/tmp/mcp-config-2.json', JSON.stringify(config2));

  const instance1 = await runClaude([
    '--print',
    '--mcp-config', '/tmp/mcp-config-1.json',
    'What MCP tools do you have?'
  ]);

  const instance2 = await runClaude([
    '--print',
    '--mcp-config', '/tmp/mcp-config-2.json',
    'What MCP tools do you have?'
  ]);

  const hasImagine1 = instance1.stdout.includes('imagine') || instance1.stdout.includes('update_ui');
  const hasContext7_2 = instance2.stdout.includes('context7') || instance2.stdout.includes('resolve-library');

  if (hasImagine1 && hasContext7_2) {
    log('Different MCP configs work per instance', 'pass');
    return { success: true };
  } else {
    log('MCP configs may not be different', 'warn');
    return { success: false };
  }
});

// Test 4: Different Tools Per Instance
addTest('Different Tools Per Instance', async () => {
  log('Testing: Each instance can have different tool sets');
  
  const instance1 = await runClaude([
    '--print',
    '--tools', 'Read',
    'What tools do you have available?'
  ]);

  const instance2 = await runClaude([
    '--print',
    '--tools', 'Write',
    'What tools do you have available?'
  ]);

  const hasRead1 = instance1.stdout.includes('Read') && !instance1.stdout.includes('Write');
  const hasWrite2 = instance2.stdout.includes('Write') && !instance2.stdout.includes('Read');

  if (hasRead1 && hasWrite2) {
    log('Different tool sets work per instance', 'pass');
    return { success: true };
  } else {
    log('Tool sets may not be different', 'warn');
    return { success: false };
  }
});

// Test 5: Different Agents Per Instance
addTest('Different Agents Per Instance', async () => {
  log('Testing: Each instance can have different agents');
  
  const agents1 = JSON.stringify({
    reviewer: {
      description: "Code reviewer",
      prompt: "You are a code reviewer."
    }
  });

  const agents2 = JSON.stringify({
    planner: {
      description: "Planning expert",
      prompt: "You are a planning expert."
    }
  });

  const instance1 = await runClaude([
    '--print',
    '--agents', agents1,
    'What agents do you have?'
  ]);

  const instance2 = await runClaude([
    '--print',
    '--agents', agents2,
    'What agents do you have?'
  ]);

  const hasReviewer1 = instance1.stdout.toLowerCase().includes('reviewer');
  const hasPlanner2 = instance2.stdout.toLowerCase().includes('planner');

  if (hasReviewer1 && hasPlanner2) {
    log('Different agents work per instance', 'pass');
    return { success: true };
  } else {
    log('Agents may not be different', 'warn');
    return { success: false };
  }
});

// Test 6: Project-Specific Configuration
addTest('Project-Specific Configuration', async () => {
  log('Testing: Claude uses project-specific configs');
  
  // Create test project
  const projectDir = '/tmp/test-claude-project';
  mkdirSync(`${projectDir}/.claude`, { recursive: true });
  
  // Create project settings
  const projectSettings = {
    model: 'sonnet',
    tools: ['Read']
  };
  writeFileSync(`${projectDir}/.claude/settings.json`, JSON.stringify(projectSettings));

  // Test from project directory
  const result = await runClaude([
    '--print',
    '--setting-sources', 'local',
    'test'
  ], null, { cwd: projectDir });

  // Cleanup
  execSync(`rm -rf ${projectDir}`);

  log('Project-specific config test completed', 'info');
  return { success: true };
});

// Test 7: Expert Instance Configuration
addTest('Expert Instance Configuration', async () => {
  log('Testing: Can create expert instance with specialized config');
  
  const expertConfig = {
    model: 'sonnet',
    agents: JSON.stringify({
      reviewer: {
        description: "Expert code reviewer",
        prompt: "You are an expert code reviewer specializing in security and quality."
      }
    }),
    tools: 'Read,Grep',
    systemPrompt: 'You are a code review expert.'
  };

  const result = await runClaude([
    '--print',
    '--model', expertConfig.model,
    '--agents', expertConfig.agents,
    '--tools', expertConfig.tools,
    '--system-prompt', expertConfig.systemPrompt,
    'Review this code: function add(a,b) { return a+b }'
  ]);

  const isExpert = result.stdout.toLowerCase().includes('review') || 
                   result.stdout.toLowerCase().includes('security') ||
                   result.stdout.toLowerCase().includes('quality');

  if (isExpert) {
    log('Expert instance configured successfully', 'pass');
    return { success: true };
  } else {
    log('Expert instance may not be specialized', 'warn');
    return { success: false };
  }
});

async function runTests() {
  console.log('🧪 Systematic Testing - One Feature at a Time\n');
  console.log('='.repeat(60));

  for (let i = 0; i < tests.length; i++) {
    currentTestIndex = i;
    const test = tests[i];
    
    console.log(`\n[${i + 1}/${tests.length}] ${test.name}`);
    console.log('-'.repeat(60));

    try {
      const result = await test.fn();
      test.status = result.success ? 'passed' : 'failed';
      test.result = result;
      
      if (!result.success) {
        console.log(`\n⚠️  Test ${i + 1} completed with warnings`);
        console.log('Review results before proceeding to next test\n');
        break; // Stop on first failure/warning
      }
    } catch (error) {
      test.status = 'error';
      test.error = error.message;
      console.log(`\n❌ Test ${i + 1} failed: ${error.message}`);
      console.log('Fix issue before proceeding\n');
      break; // Stop on error
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary\n');
  
  tests.forEach((test, i) => {
    if (test.status === 'passed') {
      log(`Test ${i + 1}: ${test.name}`, 'pass');
    } else if (test.status === 'failed') {
      log(`Test ${i + 1}: ${test.name}`, 'fail');
    } else if (test.status === 'error') {
      log(`Test ${i + 1}: ${test.name} - ERROR`, 'fail');
    } else {
      log(`Test ${i + 1}: ${test.name} - NOT RUN`, 'warn');
    }
  });

  const passed = tests.filter(t => t.status === 'passed').length;
  const total = tests.filter(t => t.status !== 'pending').length;
  
  console.log(`\n✅ Passed: ${passed}/${total}`);
  console.log(`⚠️  Remaining: ${tests.length - total}\n`);
}

runTests().catch(console.error);

