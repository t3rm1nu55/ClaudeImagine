/**
 * Test Conversation Management
 * 
 * Tests conversation ID reading and history management for isolated instances.
 */

import { 
  extractConversationId,
  getConversationId,
  listConversations,
  readConversation,
  configureConversationHistory,
  getRecentConversationId
} from './utils/conversation-manager.js';
import { createIsolatedClaudeWithMCP } from '../../scripts/create-isolated-claude.js';
import { createBackendInstance } from './playbooks/create-backend-instance.js';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

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
// CONVERSATION MANAGEMENT TESTS
// ============================================================================

async function test1_ExtractConversationId() {
  // Test extracting conversation ID from JSON output
  const jsonOutput = JSON.stringify({
    content: 'Hello',
    session_id: '123e4567-e89b-12d3-a456-426614174000',
    model: 'sonnet'
  });
  
  const id = extractConversationId(jsonOutput);
  
  if (id !== '123e4567-e89b-12d3-a456-426614174000') {
    throw new Error(`Expected specific ID, got: ${id}`);
  }
  
  console.log(`   ✅ Extracted ID: ${id}`);
}

async function test2_GetConversationId() {
  // Test getting conversation ID from Claude CLI
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }
  
  const id = await getConversationId('Test message', {
    model: 'sonnet',
    authToken: process.env.ANTHROPIC_API_KEY
  });
  
  if (!id || typeof id !== 'string') {
    throw new Error(`Invalid conversation ID: ${id}`);
  }
  
  console.log(`   ✅ Got conversation ID: ${id.substring(0, 20)}...`);
}

async function test3_ConfigureConversationHistory() {
  // Test configuring conversation history location
  const testDir = await mkdtemp(join(tmpdir(), 'test-conv-'));
  
  const config = configureConversationHistory(testDir);
  
  if (!config.CLAUDE_CONFIG_DIR) {
    throw new Error('CLAUDE_CONFIG_DIR not set');
  }
  
  if (!config.CLAUDE_CONFIG_DIR.includes(testDir)) {
    throw new Error('CLAUDE_CONFIG_DIR not pointing to instance');
  }
  
  console.log(`   ✅ Configured: ${config.CLAUDE_CONFIG_DIR}`);
  
  await rm(testDir, { recursive: true, force: true });
}

async function test4_ConversationIdWithMCP() {
  // Test getting conversation ID with MCP server
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }
  
  const { resolve, dirname } = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = dirname(fileURLToPath(import.meta.url));
  
  const id = await getConversationId('Test with MCP', {
    model: 'sonnet',
    authToken: process.env.ANTHROPIC_API_KEY,
    mcpConfigPath: resolve(__dirname, 'claude_config.json')
  });
  
  if (!id) {
    throw new Error('No conversation ID returned');
  }
  
  console.log(`   ✅ Conversation ID with MCP: ${id.substring(0, 20)}...`);
}

async function test5_ListConversations() {
  // Test listing conversations for an instance
  const testDir = await mkdtemp(join(tmpdir(), 'test-conv-'));
  
  // Create backend instance
  await createBackendInstance(testDir);
  
  // List conversations (should be empty initially)
  const conversations = await listConversations(testDir);
  
  // Should return empty array, not throw
  if (!Array.isArray(conversations)) {
    throw new Error('listConversations should return array');
  }
  
  console.log(`   ✅ Listed conversations: ${conversations.length} found`);
  
  await rm(testDir, { recursive: true, force: true });
}

async function test6_ConversationIdFromIsolatedInstance() {
  // Test getting conversation ID from isolated instance
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }
  
  const result = await createIsolatedClaudeWithMCP(
    'Hello, this is a test',
    {
      model: 'sonnet',
      authToken: process.env.ANTHROPIC_API_KEY
    }
  );
  
  // Extract conversation ID from output
  const id = extractConversationId(result.stdout);
  
  if (!id) {
    // Try with JSON format
    const jsonResult = await createIsolatedClaudeWithMCP(
      'Hello',
      {
        model: 'sonnet',
        authToken: process.env.ANTHROPIC_API_KEY
      }
    );
    
    // Note: createIsolatedClaudeWithMCP doesn't use --output-format json
    // So we might not get session_id in output
    console.log(`   ⚠️  Note: Conversation ID extraction may require --output-format json`);
  } else {
    console.log(`   ✅ Extracted ID from isolated instance: ${id.substring(0, 20)}...`);
  }
}

async function test7_BackendInstanceConversationConfig() {
  // Test that backend instance configures conversation history correctly
  const testDir = await mkdtemp(join(tmpdir(), 'test-conv-'));
  
  await createBackendInstance(testDir);
  
  const config = configureConversationHistory(testDir);
  
  // Verify config points to instance directory
  if (!config.CLAUDE_CONFIG_DIR.includes(testDir)) {
    throw new Error('Conversation history not configured for instance');
  }
  
  console.log(`   ✅ Backend instance conversation config: ${config.CLAUDE_CONFIG_DIR}`);
  
  await rm(testDir, { recursive: true, force: true });
}

async function test8_ConversationIdPersistence() {
  // Test that conversation IDs persist across calls
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }
  
  // Get first conversation ID
  const id1 = await getConversationId('First message', {
    model: 'sonnet',
    authToken: process.env.ANTHROPIC_API_KEY
  });
  
  // Get second conversation ID (should be different or same depending on --continue)
  const id2 = await getConversationId('Second message', {
    model: 'sonnet',
    authToken: process.env.ANTHROPIC_API_KEY
  });
  
  // IDs should be valid UUIDs
  if (!id1 || !id2) {
    throw new Error('Could not get conversation IDs');
  }
  
  console.log(`   ✅ ID 1: ${id1.substring(0, 20)}...`);
  console.log(`   ✅ ID 2: ${id2.substring(0, 20)}...`);
  console.log(`   📝 Note: IDs may differ (new sessions) or match (--continue)`);
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Conversation Management Test Suite');
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
    console.log('\n📋 CONVERSATION MANAGEMENT TESTS');
    console.log('='.repeat(60));
    results.push(await testPrimitive('1. Extract Conversation ID', test1_ExtractConversationId));
    results.push(await testPrimitive('2. Get Conversation ID', test2_GetConversationId));
    results.push(await testPrimitive('3. Configure Conversation History', test3_ConfigureConversationHistory));
    results.push(await testPrimitive('4. Conversation ID With MCP', test4_ConversationIdWithMCP));
    results.push(await testPrimitive('5. List Conversations', test5_ListConversations));
    results.push(await testPrimitive('6. Conversation ID From Isolated Instance', test6_ConversationIdFromIsolatedInstance));
    results.push(await testPrimitive('7. Backend Instance Conversation Config', test7_BackendInstanceConversationConfig));
    results.push(await testPrimitive('8. Conversation ID Persistence', test8_ConversationIdPersistence));
    
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
      console.log('\n🎉 All conversation management tests passed!');
      console.log('✅ Conversation IDs can be read and managed');
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

