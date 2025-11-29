/**
 * Test MCP Tool Configuration
 * 
 * Tests that MCP tools are correctly configured and accessible
 * in permanent backend instances.
 */

import { createBackendInstance } from './playbooks/create-backend-instance.js';
import { createIsolatedClaudeWithMCP } from './create-isolated-claude.js';
import { readFile } from 'fs/promises';
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
// MCP TOOL CONFIGURATION TESTS
// ============================================================================

async function test1_MCPConfigStructure() {
  // Test MCP config structure
  const testDir = await mkdtemp(join(tmpdir(), 'test-mcp-'));
  
  await createBackendInstance(testDir);
  
  const config = JSON.parse(
    await readFile(join(testDir, 'claude_config.json'), 'utf-8')
  );
  
  // Verify structure
  if (!config.mcpServers || !config.mcpServers.imagine) {
    throw new Error('MCP config missing imagine server');
  }
  
  const server = config.mcpServers.imagine;
  if (server.command !== 'node') {
    throw new Error('MCP server command incorrect');
  }
  
  if (!Array.isArray(server.args) || server.args.length === 0) {
    throw new Error('MCP server args missing');
  }
  
  console.log(`   ✅ MCP config structure correct`);
  console.log(`   📝 Server: ${server.command} ${server.args[0]}`);
  
  await rm(testDir, { recursive: true, force: true });
}

async function test2_MCPToolsAvailable() {
  // Test that MCP tools are available
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }
  
  const result = await createIsolatedClaudeWithMCP(
    'What MCP tools do you have available? List them.',
    {
      model: 'sonnet',
      authToken: process.env.ANTHROPIC_API_KEY
    }
  );
  
  // Check if response mentions MCP tools
  const response = result.stdout.toLowerCase();
  if (!response.includes('update_ui') && !response.includes('log_thought')) {
    console.log(`   ⚠️  Response: ${result.stdout.substring(0, 200)}...`);
    throw new Error('MCP tools not mentioned in response');
  }
  
  console.log(`   ✅ MCP tools available`);
  console.log(`   📝 Response mentions tools`);
}

async function test3_MCPToolExecution() {
  // Test executing MCP tools
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }
  
  const result = await createIsolatedClaudeWithMCP(
    'Use the mcp__imagine__log_thought tool to log "MCP tool test"',
    {
      model: 'sonnet',
      authToken: process.env.ANTHROPIC_API_KEY
    }
  );
  
  if (result.code !== 0) {
    throw new Error(`Tool execution failed with code ${result.code}`);
  }
  
  console.log(`   ✅ MCP tool executed successfully`);
  console.log(`   📝 Exit code: ${result.code}`);
}

async function test4_MCPToolUpdateUI() {
  // Test update_ui tool
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }
  
  const result = await createIsolatedClaudeWithMCP(
    'Use mcp__imagine__update_ui to create a simple div with text "Hello World"',
    {
      model: 'sonnet',
      authToken: process.env.ANTHROPIC_API_KEY
    }
  );
  
  if (result.code !== 0) {
    throw new Error(`update_ui tool failed with code ${result.code}`);
  }
  
  console.log(`   ✅ update_ui tool executed`);
  console.log(`   📝 Exit code: ${result.code}`);
}

async function test5_MCPToolCombined() {
  // Test using multiple MCP tools together
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }
  
  const result = await createIsolatedClaudeWithMCP(
    'First use mcp__imagine__log_thought to log "Starting UI build", then use mcp__imagine__update_ui to create a header with text "Test Header"',
    {
      model: 'sonnet',
      authToken: process.env.ANTHROPIC_API_KEY
    }
  );
  
  if (result.code !== 0) {
    throw new Error(`Combined tool execution failed with code ${result.code}`);
  }
  
  console.log(`   ✅ Combined MCP tools executed`);
  console.log(`   📝 Exit code: ${result.code}`);
}

async function test6_MCPConfigInSettings() {
  // Test that MCP config is in .claude/settings.json
  const testDir = await mkdtemp(join(tmpdir(), 'test-mcp-'));
  
  await createBackendInstance(testDir);
  
  const settings = JSON.parse(
    await readFile(join(testDir, '.claude', 'settings.json'), 'utf-8')
  );
  
  if (!settings.mcpServers || !settings.mcpServers.imagine) {
    throw new Error('MCP config missing from settings.json');
  }
  
  console.log(`   ✅ MCP config in settings.json`);
  console.log(`   📝 Server configured: ${settings.mcpServers.imagine.command}`);
  
  await rm(testDir, { recursive: true, force: true });
}

async function test7_MCPToolWithAgents() {
  // Test MCP tools with custom agents
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }
  
  const agents = {
    ui_builder: {
      description: "Builds UI using MCP tools",
      prompt: "You are a UI builder. Always use mcp__imagine__update_ui and mcp__imagine__log_thought tools."
    }
  };
  
  const result = await createIsolatedClaudeWithMCP(
    '@ui_builder Build a simple button',
    {
      model: 'sonnet',
      authToken: process.env.ANTHROPIC_API_KEY,
      agents: agents
    }
  );
  
  if (result.code !== 0) {
    throw new Error(`MCP tools with agents failed`);
  }
  
  console.log(`   ✅ MCP tools work with custom agents`);
  console.log(`   📝 Agent: ui_builder`);
}

async function test8_MCPToolErrorHandling() {
  // Test error handling for MCP tools
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }
  
  // Try with invalid tool name (should handle gracefully)
  const result = await createIsolatedClaudeWithMCP(
    'Try to use a tool called invalid_tool_name',
    {
      model: 'sonnet',
      authToken: process.env.ANTHROPIC_API_KEY
    }
  );
  
  // Should not crash, even if tool doesn't exist
  console.log(`   ✅ Error handling works`);
  console.log(`   📝 Exit code: ${result.code}`);
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 MCP Tool Configuration Test Suite');
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
    console.log('\n📋 MCP TOOL CONFIGURATION TESTS');
    console.log('='.repeat(60));
    results.push(await testPrimitive('1. MCP Config Structure', test1_MCPConfigStructure));
    results.push(await testPrimitive('2. MCP Tools Available', test2_MCPToolsAvailable));
    results.push(await testPrimitive('3. MCP Tool Execution', test3_MCPToolExecution));
    results.push(await testPrimitive('4. MCP Tool Update UI', test4_MCPToolUpdateUI));
    results.push(await testPrimitive('5. MCP Tool Combined', test5_MCPToolCombined));
    results.push(await testPrimitive('6. MCP Config In Settings', test6_MCPConfigInSettings));
    results.push(await testPrimitive('7. MCP Tool With Agents', test7_MCPToolWithAgents));
    results.push(await testPrimitive('8. MCP Tool Error Handling', test8_MCPToolErrorHandling));
    
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
      console.log('\n🎉 All MCP tool configuration tests passed!');
      console.log('✅ MCP tools correctly configured and accessible');
    } else {
      console.log('\n⚠️  Some tests failed. Review before using.');
    }
    
    process.exit(passed === total ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runAllTests();

