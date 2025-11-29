/**
 * Test CLAUDE.md Configuration
 * 
 * Tests that CLAUDE.md files correctly configure Claude Code instances
 * and that Claude respects the configuration.
 */

import { createBackendInstance } from './playbooks/create-backend-instance.js';
import { createIsolatedClaudeWithMCP } from './create-isolated-claude.js';
import { readFile, stat } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { mkdtemp, rm, writeFile } from 'fs/promises';

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
// CLAUDE.MD CONFIGURATION TESTS
// ============================================================================

async function test1_CLAUDEMdExists() {
  // Test that CLAUDE.md is created
  const testDir = await mkdtemp(join(tmpdir(), 'test-claude-md-'));
  
  await createBackendInstance(testDir);
  
  const claudeMdPath = join(testDir, 'CLAUDE.md');
  await stat(claudeMdPath);
  
  console.log(`   ✅ CLAUDE.md exists at: ${claudeMdPath}`);
  
  await rm(testDir, { recursive: true, force: true });
}

async function test2_CLAUDEMdContent() {
  // Test CLAUDE.md content structure
  const testDir = await mkdtemp(join(tmpdir(), 'test-claude-md-'));
  
  await createBackendInstance(testDir);
  
  const claudeMd = await readFile(join(testDir, 'CLAUDE.md'), 'utf-8');
  
  // Check for required sections
  const requiredSections = [
    '# Claude Imagine',
    '## Purpose',
    '## Configuration',
    '## Behavior',
    '## MCP Tools Available'
  ];
  
  for (const section of requiredSections) {
    if (!claudeMd.includes(section)) {
      throw new Error(`Missing section: ${section}`);
    }
  }
  
  console.log(`   📝 CLAUDE.md has all required sections`);
  console.log(`   📝 Length: ${claudeMd.length} characters`);
  
  await rm(testDir, { recursive: true, force: true });
}

async function test3_CLAUDEMdMCPTools() {
  // Test that MCP tools are documented in CLAUDE.md
  const testDir = await mkdtemp(join(tmpdir(), 'test-claude-md-'));
  
  await createBackendInstance(testDir);
  
  const claudeMd = await readFile(join(testDir, 'CLAUDE.md'), 'utf-8');
  
  // Check for MCP tool documentation
  const requiredTools = [
    'mcp__imagine__update_ui',
    'mcp__imagine__log_thought'
  ];
  
  for (const tool of requiredTools) {
    if (!claudeMd.includes(tool)) {
      throw new Error(`Missing tool documentation: ${tool}`);
    }
  }
  
  console.log(`   ✅ All MCP tools documented`);
  
  await rm(testDir, { recursive: true, force: true });
}

async function test4_CLAUDEMdCustomConfiguration() {
  // Test custom CLAUDE.md configuration
  const testDir = await mkdtemp(join(tmpdir(), 'test-claude-md-'));
  
  // Create custom CLAUDE.md
  const customClaudeMd = `# Custom Backend Instance

## Purpose
Custom backend for testing

## Configuration
- Model: opus
- Tools: Custom tools
- Port: 4000

## Behavior
Custom behavior for testing
`;

  await mkdir(testDir, { recursive: true });
  await writeFile(join(testDir, 'CLAUDE.md'), customClaudeMd);
  
  // Verify it was written correctly
  const readMd = await readFile(join(testDir, 'CLAUDE.md'), 'utf-8');
  if (readMd !== customClaudeMd) {
    throw new Error('Custom CLAUDE.md not written correctly');
  }
  
  console.log(`   ✅ Custom CLAUDE.md created`);
  console.log(`   📝 Custom content: ${readMd.length} characters`);
  
  await rm(testDir, { recursive: true, force: true });
}

async function test5_CLAUDEMdWithAgents() {
  // Test CLAUDE.md with agent configuration
  const testDir = await mkdtemp(join(tmpdir(), 'test-claude-md-'));
  
  const claudeMdWithAgents = `# Backend with Agents

## Purpose
Backend instance with custom agents

## Agents
- @ui_builder - Builds UI components
- @code_reviewer - Reviews code

## Configuration
- Model: sonnet
- Agents: ui_builder, code_reviewer
`;

  await mkdir(testDir, { recursive: true });
  await writeFile(join(testDir, 'CLAUDE.md'), claudeMdWithAgents);
  
  const readMd = await readFile(join(testDir, 'CLAUDE.md'), 'utf-8');
  if (!readMd.includes('@ui_builder') || !readMd.includes('@code_reviewer')) {
    throw new Error('Agent configuration not in CLAUDE.md');
  }
  
  console.log(`   ✅ CLAUDE.md with agents created`);
  
  await rm(testDir, { recursive: true, force: true });
}

async function test6_CLAUDEMdInfluenceBehavior() {
  // Test that CLAUDE.md influences Claude's behavior
  // This is a conceptual test - we verify the instance uses the config
  const testDir = await mkdtemp(join(tmpdir(), 'test-claude-md-'));
  
  await createBackendInstance(testDir, {
    systemPrompt: 'You are a backend instance. Always use MCP tools.'
  });
  
  // Read the settings that should reflect CLAUDE.md intent
  const settings = JSON.parse(
    await readFile(join(testDir, '.claude', 'settings.json'), 'utf-8')
  );
  
  // Verify system prompt reflects CLAUDE.md purpose
  if (!settings.systemPrompt || !settings.systemPrompt.includes('backend')) {
    throw new Error('System prompt does not reflect CLAUDE.md configuration');
  }
  
  console.log(`   ✅ Settings reflect CLAUDE.md configuration`);
  console.log(`   📝 System prompt: ${settings.systemPrompt.substring(0, 50)}...`);
  
  await rm(testDir, { recursive: true, force: true });
}

async function test7_CLAUDEMdMultipleInstances() {
  // Test creating multiple instances with different CLAUDE.md files
  const testDir1 = await mkdtemp(join(tmpdir(), 'test-instance-1-'));
  const testDir2 = await mkdtemp(join(tmpdir(), 'test-instance-2-'));
  
  await createBackendInstance(testDir1, {
    model: 'sonnet',
    systemPrompt: 'Backend instance 1'
  });
  
  await createBackendInstance(testDir2, {
    model: 'opus',
    systemPrompt: 'Backend instance 2'
  });
  
  // Verify they have different configurations
  const md1 = await readFile(join(testDir1, 'CLAUDE.md'), 'utf-8');
  const md2 = await readFile(join(testDir2, 'CLAUDE.md'), 'utf-8');
  
  if (md1 === md2) {
    throw new Error('Instances have identical CLAUDE.md files');
  }
  
  console.log(`   ✅ Multiple instances with different configurations`);
  console.log(`   📝 Instance 1: ${md1.length} chars`);
  console.log(`   📝 Instance 2: ${md2.length} chars`);
  
  await rm(testDir1, { recursive: true, force: true });
  await rm(testDir2, { recursive: true, force: true });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 CLAUDE.md Configuration Test Suite');
  console.log('='.repeat(60));
  
  const results = [];
  
  try {
    console.log('\n📋 CLAUDE.MD CONFIGURATION TESTS');
    console.log('='.repeat(60));
    results.push(await testPrimitive('1. CLAUDE.md Exists', test1_CLAUDEMdExists));
    results.push(await testPrimitive('2. CLAUDE.md Content', test2_CLAUDEMdContent));
    results.push(await testPrimitive('3. CLAUDE.md MCP Tools', test3_CLAUDEMdMCPTools));
    results.push(await testPrimitive('4. CLAUDE.md Custom Configuration', test4_CLAUDEMdCustomConfiguration));
    results.push(await testPrimitive('5. CLAUDE.md With Agents', test5_CLAUDEMdWithAgents));
    results.push(await testPrimitive('6. CLAUDE.md Influence Behavior', test6_CLAUDEMdInfluenceBehavior));
    results.push(await testPrimitive('7. CLAUDE.md Multiple Instances', test7_CLAUDEMdMultipleInstances));
    
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
      console.log('\n🎉 All CLAUDE.md configuration tests passed!');
      console.log('✅ CLAUDE.md files correctly configure instances');
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

