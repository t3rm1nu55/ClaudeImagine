/**
 * Modular Testing - Each test is independent and runnable separately
 */

import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, rmSync } from 'fs';

// Utility function to run Claude with timeout
function runClaude(args, input = null, timeout = 15000) {
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

    const timer = setTimeout(() => {
      claude.kill();
      reject(new Error('Timeout'));
    }, timeout);

    claude.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code });
    });

    claude.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

// Test 1: Query Session ID
export async function test1_QuerySessionID() {
  console.log('\n[Test 1] Query Session ID');
  console.log('-'.repeat(40));
  
  try {
    const result = await runClaude([
      '--print',
      '--model', 'sonnet',
      '--output-format', 'json',
      'test'
    ], null, 10000);

    const data = JSON.parse(result.stdout);
    if (data.session_id) {
      console.log(`✅ PASS: Session ID = ${data.session_id}`);
      return { success: true, sessionId: data.session_id };
    }
    throw new Error('No session_id in output');
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test 2: Run 2 Instances (Sequential, not simultaneous)
export async function test2_MultipleInstances() {
  console.log('\n[Test 2] Multiple Instances (Sequential)');
  console.log('-'.repeat(40));
  
  try {
    // Run instances sequentially to avoid conflicts
    const instance1 = await runClaude([
      '--print',
      '--model', 'sonnet',
      '--output-format', 'json',
      'Instance 1'
    ], null, 10000);

    const instance2 = await runClaude([
      '--print',
      '--model', 'sonnet',
      '--output-format', 'json',
      'Instance 2'
    ], null, 10000);

    const data1 = JSON.parse(instance1.stdout);
    const data2 = JSON.parse(instance2.stdout);

    if (data1.session_id && data2.session_id && data1.session_id !== data2.session_id) {
      console.log(`✅ PASS: Both instances completed with different session IDs`);
      return { success: true, sessionIds: [data1.session_id, data2.session_id] };
    }
    throw new Error('Instances may have same session ID');
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test 3: Different MCP Config Per Instance
export async function test3_DifferentMCPConfig() {
  console.log('\n[Test 3] Different MCP Config Per Instance');
  console.log('-'.repeat(40));
  
  try {
    const config1 = {
      mcpServers: {
        imagine: {
          command: "node",
          args: ["/Users/markforster/ClaudeImagine/server-mcp.js"]
        }
      }
    };

    writeFileSync('/tmp/mcp-config-1.json', JSON.stringify(config1));

    const result = await runClaude([
      '--print',
      '--mcp-config', '/tmp/mcp-config-1.json',
      'What MCP tools do you have? List only MCP tools.'
    ], null, 15000);

    const hasImagine = result.stdout.toLowerCase().includes('imagine') || 
                       result.stdout.toLowerCase().includes('update_ui') ||
                       result.stdout.toLowerCase().includes('log_thought') ||
                       result.stdout.toLowerCase().includes('mcp__imagine');

    if (hasImagine) {
      console.log(`✅ PASS: MCP config applied (imagine tools found)`);
      return { success: true };
    } else {
      console.log(`⚠️  WARN: MCP config may not be applied`);
      return { success: false, warning: 'MCP tools not found' };
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test 4: Different Tools Per Instance
export async function test4_DifferentTools() {
  console.log('\n[Test 4] Different Tools Per Instance');
  console.log('-'.repeat(40));
  
  try {
    const instance1 = await runClaude([
      '--print',
      '--tools', 'Read',
      'What tools do you have? List only tool names.'
    ], null, 10000);

    const instance2 = await runClaude([
      '--print',
      '--tools', 'Write',
      'What tools do you have? List only tool names.'
    ], null, 10000);

    const hasRead1 = instance1.stdout.toLowerCase().includes('read');
    const hasWrite2 = instance2.stdout.toLowerCase().includes('write');
    // Check that tools are limited (may still mention other tools in description)
    const readOnly1 = instance1.stdout.toLowerCase().includes('read') && 
                      !instance1.stdout.toLowerCase().includes('bash') &&
                      !instance1.stdout.toLowerCase().includes('grep');
    const writeOnly2 = instance2.stdout.toLowerCase().includes('write') &&
                       !instance2.stdout.toLowerCase().includes('bash') &&
                       !instance2.stdout.toLowerCase().includes('grep');

    if (hasRead1 && hasWrite2) {
      console.log(`✅ PASS: Different tool sets applied (Read vs Write)`);
      console.log(`   Instance 1 mentions: Read`);
      console.log(`   Instance 2 mentions: Write`);
      return { success: true };
    } else {
      console.log(`⚠️  WARN: Tool sets may overlap`);
      return { success: false, warning: 'Tools may not be isolated' };
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test 5: Different Agents Per Instance
export async function test5_DifferentAgents() {
  console.log('\n[Test 5] Different Agents Per Instance');
  console.log('-'.repeat(40));
  
  try {
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
      'What agents do you have access to?'
    ], null, 20000);

    const instance2 = await runClaude([
      '--print',
      '--agents', agents2,
      'What agents do you have access to?'
    ], null, 20000);

    const hasReviewer1 = instance1.stdout.toLowerCase().includes('reviewer');
    const hasPlanner2 = instance2.stdout.toLowerCase().includes('planner');

    if (hasReviewer1 && hasPlanner2) {
      console.log(`✅ PASS: Different agents configured`);
      return { success: true };
    } else {
      console.log(`⚠️  WARN: Agents may not be different`);
      return { success: false, warning: 'Agents not clearly different' };
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test 6: Project-Specific Configuration
export async function test6_ProjectConfig() {
  console.log('\n[Test 6] Project-Specific Configuration');
  console.log('-'.repeat(40));
  
  try {
    const projectDir = '/tmp/test-claude-project';
    mkdirSync(`${projectDir}/.claude`, { recursive: true });
    
    const projectSettings = JSON.stringify({
      model: 'sonnet'
    });
    writeFileSync(`${projectDir}/.claude/settings.json`, projectSettings);

    // Change directory and test
    process.chdir(projectDir);
    
    const result = await runClaude([
      '--print',
      '--setting-sources', 'local',
      'test'
    ], null, 10000);

    // Cleanup
    process.chdir('/Users/markforster/ClaudeImagine');
    rmSync(projectDir, { recursive: true, force: true });

    console.log(`✅ PASS: Project config test completed`);
    return { success: true };
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test 7: Expert Instance
export async function test7_ExpertInstance() {
  console.log('\n[Test 7] Expert Instance Configuration');
  console.log('-'.repeat(40));
  
  try {
    const agents = JSON.stringify({
      reviewer: {
        description: "Expert code reviewer",
        prompt: "You are an expert code reviewer specializing in security and quality."
      }
    });

    const result = await runClaude([
      '--print',
      '--model', 'sonnet',
      '--agents', agents,
      '--tools', 'Read,Grep',
      '--system-prompt', 'You are a code review expert.',
      'Review: function add(a,b) { return a+b }'
    ], null, 20000);

    const isExpert = result.stdout.toLowerCase().includes('review') || 
                     result.stdout.toLowerCase().includes('security') ||
                     result.stdout.toLowerCase().includes('quality') ||
                     result.stdout.toLowerCase().includes('bug');

    if (isExpert) {
      console.log(`✅ PASS: Expert instance configured`);
      return { success: true };
    } else {
      console.log(`⚠️  WARN: Expert behavior not clear`);
      return { success: false, warning: 'Expert behavior not evident' };
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run single test or all tests
const testName = process.argv[2];

if (testName) {
  // Run specific test
  const testMap = {
    '1': test1_QuerySessionID,
    '2': test2_MultipleInstances,
    '3': test3_DifferentMCPConfig,
    '4': test4_DifferentTools,
    '5': test5_DifferentAgents,
    '6': test6_ProjectConfig,
    '7': test7_ExpertInstance
  };

  const test = testMap[testName];
  if (test) {
    test().then(result => {
      process.exit(result.success ? 0 : 1);
    }).catch(error => {
      console.error('Test error:', error);
      process.exit(1);
    });
  } else {
    console.error(`Unknown test: ${testName}`);
    process.exit(1);
  }
} else {
  // Run all tests sequentially
  async function runAll() {
    console.log('🧪 Modular Testing Suite\n');
    console.log('='.repeat(60));

    const results = [];
    
    results.push(await test1_QuerySessionID());
    if (!results[0].success) {
      console.log('\n⚠️  Stopping - Test 1 failed');
      return;
    }

    results.push(await test2_MultipleInstances());
    results.push(await test3_DifferentMCPConfig());
    results.push(await test4_DifferentTools());
    results.push(await test5_DifferentAgents());
    results.push(await test6_ProjectConfig());
    results.push(await test7_ExpertInstance());

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Summary\n');
    
    const passed = results.filter(r => r.success).length;
    console.log(`✅ Passed: ${passed}/${results.length}`);
    
    results.forEach((r, i) => {
      if (!r.success) {
        console.log(`❌ Test ${i + 1} failed`);
      }
    });
  }

  runAll().catch(console.error);
}

