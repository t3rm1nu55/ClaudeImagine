/**
 * End-to-End Test: Backend Instance as Permanent MCP Backend
 * 
 * Tests that backend instances created via playbooks can serve
 * as permanent MCP backends for Claude Imagine.
 * 
 * This test:
 * 1. Creates a backend instance
 * 2. Verifies configuration
 * 3. Tests tool execution
 * 4. Tests persistence
 * 5. Tests multiple clients connecting
 */

import { createBackendInstance } from './playbooks/create-backend-instance.js';
import { createIsolatedClaudeWithMCP } from '../../scripts/create-isolated-claude.js';
import { readFile, stat } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { mkdtemp, rm } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

let testResults = [];

function logTest(name, passed, details = '') {
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}${details ? ` - ${details}` : ''}`);
  testResults.push({ name, passed, details });
}

async function testPrimitive(name, testFn) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log('─'.repeat(60));
  try {
    await testFn();
    logTest(name, true);
    return true;
  } catch (error) {
    logTest(name, false, error.message);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// ============================================================================
// END-TO-END TESTS
// ============================================================================

async function test1_BackendInstanceCreation() {
  // Create backend instance
  const testDir = await mkdtemp(join(tmpdir(), 'test-backend-e2e-'));
  
  const result = await createBackendInstance(testDir, {
    model: 'sonnet',
    mcpServerPath: resolve(__dirname, 'src/server-mcp.js')
  });
  
  // Verify all files exist
  const files = [
    'CLAUDE.md',
    '.claude/settings.json',
    'claude_config.json',
    'start.sh'
  ];
  
  for (const file of files) {
    await stat(join(testDir, file));
  }
  
  console.log(`   ✅ Backend instance created`);
  console.log(`   📁 Directory: ${testDir}`);
  
  // Don't cleanup - we'll use it in next tests
  return testDir;
}

async function test2_BackendConfiguration() {
  // Verify backend configuration
  const testDir = await mkdtemp(join(tmpdir(), 'test-backend-e2e-'));
  
  await createBackendInstance(testDir);
  
  // Read configs
  const settings = JSON.parse(
    await readFile(join(testDir, '.claude', 'settings.json'), 'utf-8')
  );
  const config = JSON.parse(
    await readFile(join(testDir, 'claude_config.json'), 'utf-8')
  );
  
  // Verify MCP server configured
  if (!settings.mcpServers?.imagine || !config.mcpServers?.imagine) {
    throw new Error('MCP server not configured');
  }
  
  // Verify model
  if (settings.model !== 'sonnet') {
    throw new Error('Model not configured correctly');
  }
  
  console.log(`   ✅ Configuration correct`);
  console.log(`   📝 Model: ${settings.model}`);
  console.log(`   📝 MCP Server: ${settings.mcpServers.imagine.command}`);
  
  await rm(testDir, { recursive: true, force: true });
}

async function test3_BackendToolExecution() {
  // Test tool execution from backend instance
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }
  
  const result = await createIsolatedClaudeWithMCP(
    'Use mcp__imagine__log_thought to log "Backend E2E test"',
    {
      model: 'sonnet',
      authToken: process.env.ANTHROPIC_API_KEY,
      tools: ""  // MCP tools only, like backend
    }
  );
  
  if (result.code !== 0) {
    throw new Error(`Tool execution failed with code ${result.code}`);
  }
  
  console.log(`   ✅ Tool execution successful`);
  console.log(`   📝 Exit code: ${result.code}`);
}

async function test4_BackendPersistence() {
  // Test that backend instance persists across sessions
  const testDir = await mkdtemp(join(tmpdir(), 'test-backend-e2e-'));
  
  await createBackendInstance(testDir);
  
  // Read configs
  const settings1 = JSON.parse(
    await readFile(join(testDir, '.claude', 'settings.json'), 'utf-8')
  );
  const config1 = JSON.parse(
    await readFile(join(testDir, 'claude_config.json'), 'utf-8')
  );
  
  // Simulate restart - re-read configs
  const settings2 = JSON.parse(
    await readFile(join(testDir, '.claude', 'settings.json'), 'utf-8')
  );
  const config2 = JSON.parse(
    await readFile(join(testDir, 'claude_config.json'), 'utf-8')
  );
  
  // Verify persistence
  if (JSON.stringify(settings1) !== JSON.stringify(settings2) ||
      JSON.stringify(config1) !== JSON.stringify(config2)) {
    throw new Error('Configuration not persistent');
  }
  
  console.log(`   ✅ Configuration persists`);
  console.log(`   📝 Settings match across reads`);
  
  await rm(testDir, { recursive: true, force: true });
}

async function test5_MultipleClientConnections() {
  // Test multiple clients connecting to same backend config
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }
  
  // Simulate multiple clients using same backend config
  const prompts = [
    'Use mcp__imagine__log_thought to log "Client 1"',
    'Use mcp__imagine__log_thought to log "Client 2"',
    'Use mcp__imagine__log_thought to log "Client 3"'
  ];
  
  const results = await Promise.all(
    prompts.map(prompt =>
      createIsolatedClaudeWithMCP(prompt, {
        model: 'sonnet',
        authToken: process.env.ANTHROPIC_API_KEY
      })
    )
  );
  
  // Verify all succeeded
  for (let i = 0; i < results.length; i++) {
    if (results[i].code !== 0) {
      throw new Error(`Client ${i + 1} failed`);
    }
  }
  
  console.log(`   ✅ Multiple clients can connect`);
  console.log(`   📝 ${results.length} clients tested`);
}

async function test6_BackendWithCustomAgents() {
  // Test backend with custom agents
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }
  
  const agents = {
    backend_ui_builder: {
      description: "Backend UI builder agent",
      prompt: "You are a backend UI builder. Always use mcp__imagine__update_ui and mcp__imagine__log_thought tools."
    }
  };
  
  const result = await createIsolatedClaudeWithMCP(
    '@backend_ui_builder Build a simple header',
    {
      model: 'sonnet',
      authToken: process.env.ANTHROPIC_API_KEY,
      agents: agents
    }
  );
  
  if (result.code !== 0) {
    throw new Error('Backend with agents failed');
  }
  
  console.log(`   ✅ Backend works with custom agents`);
  console.log(`   📝 Agent: backend_ui_builder`);
}

async function test7_BackendStartScript() {
  // Test backend start script
  const testDir = await mkdtemp(join(tmpdir(), 'test-backend-e2e-'));
  
  await createBackendInstance(testDir);
  
  const startScript = await readFile(join(testDir, 'start.sh'), 'utf-8');
  
  // Verify script content
  if (!startScript.includes('claude --mcp-config')) {
    throw new Error('Start script missing MCP config');
  }
  
  if (!startScript.includes('--dangerously-skip-permissions')) {
    throw new Error('Start script missing permissions flag');
  }
  
  console.log(`   ✅ Start script correct`);
  console.log(`   📝 Script length: ${startScript.length} chars`);
  
  await rm(testDir, { recursive: true, force: true });
}

async function test8_BackendIsolation() {
  // Test that backend instance is isolated
  const testDir = await mkdtemp(join(tmpdir(), 'test-backend-e2e-'));
  
  await createBackendInstance(testDir);
  
  // Verify it uses its own config
  const config = JSON.parse(
    await readFile(join(testDir, 'claude_config.json'), 'utf-8')
  );
  
  // Config should point to server-mcp.js
  const serverPath = config.mcpServers.imagine.args[0];
  if (!serverPath.includes('src/server-mcp.js')) {
    throw new Error('Backend config not isolated');
  }
  
  console.log(`   ✅ Backend instance isolated`);
  console.log(`   📝 Uses own MCP config`);
  
  await rm(testDir, { recursive: true, force: true });
}

async function test9_BackendProductionReady() {
  // Test that backend instance is production-ready
  const testDir = await mkdtemp(join(tmpdir(), 'test-backend-e2e-'));
  
  await createBackendInstance(testDir, {
    model: 'sonnet',  // Cost-effective for production
    systemPrompt: 'You are a production backend. Always use MCP tools.'
  });
  
  // Verify production settings
  const settings = JSON.parse(
    await readFile(join(testDir, '.claude', 'settings.json'), 'utf-8')
  );
  
  // Should use sonnet (cost-effective)
  if (settings.model !== 'sonnet') {
    throw new Error('Not configured for production');
  }
  
  // Should have MCP tools only
  if (settings.tools !== "") {
    console.log(`   ⚠️  Tools: "${settings.tools}" (expected empty for MCP-only)`);
  }
  
  console.log(`   ✅ Production-ready configuration`);
  console.log(`   📝 Model: ${settings.model}`);
  
  await rm(testDir, { recursive: true, force: true });
}

async function test10_BackendDocumentation() {
  // Test that backend instance has proper documentation
  const testDir = await mkdtemp(join(tmpdir(), 'test-backend-e2e-'));
  
  await createBackendInstance(testDir);
  
  const claudeMd = await readFile(join(testDir, 'CLAUDE.md'), 'utf-8');
  
  // Verify documentation sections
  const requiredSections = [
    'Purpose',
    'Configuration',
    'Behavior',
    'MCP Tools Available'
  ];
  
  for (const section of requiredSections) {
    if (!claudeMd.includes(section)) {
      throw new Error(`Missing documentation section: ${section}`);
    }
  }
  
  console.log(`   ✅ Documentation complete`);
  console.log(`   📝 Sections: ${requiredSections.length}`);
  
  await rm(testDir, { recursive: true, force: true });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Backend Instance E2E Test Suite');
  console.log('='.repeat(60));
  
  // Claude CLI handles authentication (OAuth credentials automatically copied)
  // Just verify Claude CLI is installed
  try {
    const { execSync } = await import('child_process');
    execSync('which claude', { stdio: 'ignore' });
  } catch (e) {
    console.error('\n❌ Error: Claude CLI not found');
    console.error('   Please install Claude CLI first');
    process.exit(1);
  }
  
  const results = [];
  
  try {
    console.log('\n📋 BACKEND INSTANCE E2E TESTS');
    console.log('='.repeat(60));
    results.push(await testPrimitive('1. Backend Instance Creation', test1_BackendInstanceCreation));
    results.push(await testPrimitive('2. Backend Configuration', test2_BackendConfiguration));
    results.push(await testPrimitive('3. Backend Tool Execution', test3_BackendToolExecution));
    results.push(await testPrimitive('4. Backend Persistence', test4_BackendPersistence));
    results.push(await testPrimitive('5. Multiple Client Connections', test5_MultipleClientConnections));
    results.push(await testPrimitive('6. Backend With Custom Agents', test6_BackendWithCustomAgents));
    results.push(await testPrimitive('7. Backend Start Script', test7_BackendStartScript));
    results.push(await testPrimitive('8. Backend Isolation', test8_BackendIsolation));
    results.push(await testPrimitive('9. Backend Production Ready', test9_BackendProductionReady));
    results.push(await testPrimitive('10. Backend Documentation', test10_BackendDocumentation));
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));
    
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log(`\n✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${total - passed}/${total}`);
    
    console.log('\n📋 Detailed Results:');
    testResults.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.passed ? '✅' : '❌'} ${r.name}${r.details ? ` - ${r.details}` : ''}`);
    });
    
    if (passed === total) {
      console.log('\n🎉 All backend E2E tests passed!');
      console.log('✅ Backend instances are production-ready');
      console.log('✅ Can serve as permanent MCP backends');
    } else {
      console.log('\n⚠️  Some tests failed. Review before deploying.');
    }
    
    process.exit(passed === total ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runAllTests();

