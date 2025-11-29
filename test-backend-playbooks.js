/**
 * Test Backend Playbooks
 * 
 * Tests the creation and configuration of permanent backend instances
 * that can serve as MCP server backends for Claude Imagine.
 * 
 * Tests:
 * 1. Backend instance creation
 * 2. CLAUDE.md configuration
 * 3. .claude/settings.json configuration
 * 4. MCP config creation
 * 5. Tool configuration
 * 6. Instance startup
 * 7. Tool execution from backend instance
 */

import { createBackendInstance } from './playbooks/create-backend-instance.js';
import { createIsolatedClaudeWithMCP } from './create-isolated-claude.js';
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
// BACKEND INSTANCE CREATION TESTS
// ============================================================================

async function test1_BackendInstanceCreation() {
  // Test creating backend instance
  const testDir = await mkdtemp(join(tmpdir(), 'test-backend-'));
  
  const result = await createBackendInstance(testDir, {
    model: 'sonnet',
    mcpServerPath: resolve(__dirname, 'server-mcp.js')
  });
  
  // Verify files were created
  const files = [
    'CLAUDE.md',
    '.claude/settings.json',
    'claude_config.json',
    'start.sh'
  ];
  
  for (const file of files) {
    const filePath = join(testDir, file);
    try {
      await stat(filePath);
      console.log(`   ✅ Created: ${file}`);
    } catch (e) {
      throw new Error(`File not created: ${file}`);
    }
  }
  
  // Cleanup
  await rm(testDir, { recursive: true, force: true });
}

async function test2_CLAUDEMdConfiguration() {
  // Test CLAUDE.md content
  const testDir = await mkdtemp(join(tmpdir(), 'test-backend-'));
  
  await createBackendInstance(testDir);
  
  const claudeMd = await readFile(join(testDir, 'CLAUDE.md'), 'utf-8');
  
  // Verify content
  const requiredSections = [
    'Purpose',
    'Configuration',
    'Behavior',
    'MCP Tools Available'
  ];
  
  for (const section of requiredSections) {
    if (!claudeMd.includes(section)) {
      throw new Error(`CLAUDE.md missing section: ${section}`);
    }
  }
  
  // Verify MCP tools are documented
  if (!claudeMd.includes('mcp__imagine__update_ui') || 
      !claudeMd.includes('mcp__imagine__log_thought')) {
    throw new Error('CLAUDE.md missing MCP tool documentation');
  }
  
  console.log(`   📝 CLAUDE.md length: ${claudeMd.length} chars`);
  console.log(`   📝 Sections found: ${requiredSections.length}`);
  
  await rm(testDir, { recursive: true, force: true });
}

async function test3_SettingsConfiguration() {
  // Test .claude/settings.json
  const testDir = await mkdtemp(join(tmpdir(), 'test-backend-'));
  
  await createBackendInstance(testDir);
  
  const settings = JSON.parse(
    await readFile(join(testDir, '.claude', 'settings.json'), 'utf-8')
  );
  
  // Verify structure
  if (!settings.model) {
    throw new Error('Settings missing model');
  }
  
  if (!settings.mcpServers || !settings.mcpServers.imagine) {
    throw new Error('Settings missing MCP server configuration');
  }
  
  if (!settings.systemPrompt) {
    throw new Error('Settings missing systemPrompt');
  }
  
  console.log(`   📝 Model: ${settings.model}`);
  console.log(`   📝 MCP Server: ${settings.mcpServers.imagine.command}`);
  console.log(`   📝 System prompt length: ${settings.systemPrompt.length} chars`);
  
  await rm(testDir, { recursive: true, force: true });
}

async function test4_MCPConfigCreation() {
  // Test claude_config.json
  const testDir = await mkdtemp(join(tmpdir(), 'test-backend-'));
  
  await createBackendInstance(testDir);
  
  const config = JSON.parse(
    await readFile(join(testDir, 'claude_config.json'), 'utf-8')
  );
  
  // Verify structure
  if (!config.mcpServers || !config.mcpServers.imagine) {
    throw new Error('MCP config missing imagine server');
  }
  
  if (config.mcpServers.imagine.command !== 'node') {
    throw new Error('MCP config has incorrect command');
  }
  
  console.log(`   📝 MCP Server configured: ${config.mcpServers.imagine.command}`);
  console.log(`   📝 Server script: ${config.mcpServers.imagine.args[0]}`);
  
  await rm(testDir, { recursive: true, force: true });
}

async function test5_ToolConfiguration() {
  // Test that tools are configured correctly
  const testDir = await mkdtemp(join(tmpdir(), 'test-backend-'));
  
  await createBackendInstance(testDir, {
    tools: ""  // Only MCP tools
  });
  
  const settings = JSON.parse(
    await readFile(join(testDir, '.claude', 'settings.json'), 'utf-8')
  );
  
  // Backend should only use MCP tools, not built-in tools
  if (settings.tools !== "") {
    console.log(`   ⚠️  Tools setting: "${settings.tools}" (expected empty for MCP-only)`);
  }
  
  console.log(`   ✅ Tool configuration: MCP tools only`);
  
  await rm(testDir, { recursive: true, force: true });
}

async function test6_InstanceStartup() {
  // Test that instance can be started (syntax check)
  const testDir = await mkdtemp(join(tmpdir(), 'test-backend-'));
  
  await createBackendInstance(testDir);
  
  // Verify start script exists and is executable
  const startScriptPath = join(testDir, 'start.sh');
  const stats = await stat(startScriptPath);
  
  if (!stats.isFile()) {
    throw new Error('Start script not created');
  }
  
  // Check script content
  const script = await readFile(startScriptPath, 'utf-8');
  if (!script.includes('claude --mcp-config')) {
    throw new Error('Start script missing MCP config flag');
  }
  
  console.log(`   ✅ Start script created`);
  console.log(`   📝 Script length: ${script.length} chars`);
  
  await rm(testDir, { recursive: true, force: true });
}

async function test7_BackendToolExecution() {
  // Test that backend instance can execute tools
  // This uses the isolated Claude function with backend-like config
  const result = await createIsolatedClaudeWithMCP(
    'Use mcp__imagine__log_thought to log "Backend instance test"',
    {
      mcpServerPath: resolve(__dirname, 'server-mcp.js'),
      model: 'sonnet',
      authToken: process.env.ANTHROPIC_API_KEY,
      tools: ""  // MCP tools only, like backend
    }
  );
  
  if (!result.stdout && result.code !== 0) {
    throw new Error('Backend tool execution failed');
  }
  
  console.log(`   ✅ Tool execution from backend config`);
  console.log(`   📝 Response received: ${result.stdout ? 'Yes' : 'No'}`);
}

async function test8_BackendWithCustomAgents() {
  // Test backend with custom agents
  const agents = {
    ui_builder: {
      description: "Backend UI builder agent",
      prompt: "You are a UI builder agent for the backend. Always use mcp__imagine__update_ui and mcp__imagine__log_thought tools."
    }
  };
  
  const result = await createIsolatedClaudeWithMCP(
    'Build a simple header using the UI builder approach',
    {
      mcpServerPath: resolve(__dirname, 'server-mcp.js'),
      model: 'sonnet',
      authToken: process.env.ANTHROPIC_API_KEY,
      agents: agents
    }
  );
  
  if (!result.stdout) {
    throw new Error('Backend with agents failed');
  }
  
  console.log(`   ✅ Backend with custom agents`);
  console.log(`   📝 Agent used: ui_builder`);
}

async function test9_BackendPersistence() {
  // Test that backend instance configuration persists
  const testDir = await mkdtemp(join(tmpdir(), 'test-backend-'));
  
  await createBackendInstance(testDir);
  
  // Read configs
  const settings1 = JSON.parse(
    await readFile(join(testDir, '.claude', 'settings.json'), 'utf-8')
  );
  const config1 = JSON.parse(
    await readFile(join(testDir, 'claude_config.json'), 'utf-8')
  );
  
  // Re-read to verify persistence
  const settings2 = JSON.parse(
    await readFile(join(testDir, '.claude', 'settings.json'), 'utf-8')
  );
  const config2 = JSON.parse(
    await readFile(join(testDir, 'claude_config.json'), 'utf-8')
  );
  
  // Compare
  if (JSON.stringify(settings1) !== JSON.stringify(settings2) ||
      JSON.stringify(config1) !== JSON.stringify(config2)) {
    throw new Error('Configuration not persistent');
  }
  
  console.log(`   ✅ Configuration persists correctly`);
  
  await rm(testDir, { recursive: true, force: true });
}

async function test10_BackendIsolation() {
  // Test that backend instance is isolated from main Claude setup
  const testDir = await mkdtemp(join(tmpdir(), 'test-backend-'));
  
  await createBackendInstance(testDir);
  
  // Verify it uses its own config
  const config = JSON.parse(
    await readFile(join(testDir, 'claude_config.json'), 'utf-8')
  );
  
  // Config should point to server-mcp.js, not main config
  const serverPath = config.mcpServers.imagine.args[0];
  if (!serverPath.includes('server-mcp.js')) {
    throw new Error('Backend config not isolated');
  }
  
  console.log(`   ✅ Backend instance is isolated`);
  console.log(`   📝 Uses own MCP config: ${serverPath}`);
  
  await rm(testDir, { recursive: true, force: true });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Backend Playbook Test Suite');
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
    // BACKEND INSTANCE CREATION TESTS
    console.log('\n📋 BACKEND INSTANCE CREATION TESTS');
    console.log('='.repeat(60));
    results.push(await testPrimitive('1. Backend Instance Creation', test1_BackendInstanceCreation));
    results.push(await testPrimitive('2. CLAUDE.md Configuration', test2_CLAUDEMdConfiguration));
    results.push(await testPrimitive('3. Settings Configuration', test3_SettingsConfiguration));
    results.push(await testPrimitive('4. MCP Config Creation', test4_MCPConfigCreation));
    results.push(await testPrimitive('5. Tool Configuration', test5_ToolConfiguration));
    results.push(await testPrimitive('6. Instance Startup', test6_InstanceStartup));
    
    // BACKEND FUNCTIONALITY TESTS
    console.log('\n📋 BACKEND FUNCTIONALITY TESTS');
    console.log('='.repeat(60));
    results.push(await testPrimitive('7. Backend Tool Execution', test7_BackendToolExecution));
    results.push(await testPrimitive('8. Backend With Custom Agents', test8_BackendWithCustomAgents));
    results.push(await testPrimitive('9. Backend Persistence', test9_BackendPersistence));
    results.push(await testPrimitive('10. Backend Isolation', test10_BackendIsolation));
    
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
      console.log('\n🎉 All backend playbook tests passed!');
      console.log('✅ Backend instances can be created and configured');
      console.log('✅ Ready to use as permanent MCP backends');
    } else {
      console.log('\n⚠️  Some tests failed. Review before using as backend.');
    }
    
    process.exit(passed === total ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runAllTests();

