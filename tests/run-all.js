/**
 * Test All Prerequisites
 * 
 * Runs all prerequisite tests in order before integration test.
 * This ensures everything is working before attempting browser integration.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const tests = [
  {
    name: 'Browser Prerequisites',
    script: 'prerequisites/browser.js',
    description: 'Tests models, tools, agents, skills, and response validation'
  },
  {
    name: 'Isolated Primitives',
    script: 'prerequisites/isolated-primitives.js',
    description: 'Tests isolated instance creation and MCP connection'
  },
  {
    name: 'MCP Tool Configuration',
    script: 'prerequisites/mcp-config.js',
    description: 'Tests MCP tool configuration and execution'
  },
  {
    name: 'Backend Playbooks',
    script: 'e2e/playbooks.js',
    description: 'Tests backend instance creation and configuration'
  },
  {
    name: 'Conversation Management',
    script: 'prerequisites/conversations.js',
    description: 'Tests conversation ID reading and history management'
  },
  {
    name: 'CLAUDE.md Configuration',
    script: 'prerequisites/claude-md.js',
    description: 'Tests CLAUDE.md file configuration'
  },
  {
    name: 'Claude Tools Execution',
    script: 'prerequisites/claude-tools.js',
    description: 'Tests tool execution with WebSocket'
  },
  {
    name: 'Backend E2E',
    script: 'e2e/backend.js',
    description: 'Tests backend instances as permanent MCP backends'
  }
];

const results = [];

function runTest(test) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 Running: ${test.name}`);
    console.log(`📝 ${test.description}`);
    console.log('='.repeat(60));

    const proc = spawn('node', [test.script], {
      cwd: __dirname,
      stdio: 'inherit',
      env: {
        ...process.env
      }
    });

    proc.on('close', (code) => {
      const passed = code === 0;
      results.push({
        name: test.name,
        passed,
        code
      });
      
      if (passed) {
        console.log(`\n✅ ${test.name} PASSED`);
      } else {
        console.log(`\n❌ ${test.name} FAILED (exit code: ${code})`);
      }
      
      resolve(passed);
    });

    proc.on('error', (error) => {
      console.error(`\n❌ Error running ${test.name}:`, error.message);
      results.push({
        name: test.name,
        passed: false,
        error: error.message
      });
      resolve(false);
    });
  });
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 PREREQUISITES TEST SUITE');
  console.log('='.repeat(60));
  console.log('\nRunning all prerequisite tests before integration...\n');

  // Claude CLI handles its own authentication - no API key needed
  // Just verify Claude CLI is installed
  try {
    const { execSync } = await import('child_process');
    execSync('which claude', { stdio: 'ignore' });
  } catch (e) {
    console.error('\n❌ Error: Claude CLI not found');
    console.error('   Please install Claude CLI first');
    process.exit(1);
  }

  // Run tests sequentially
  for (const test of tests) {
    const passed = await runTest(test);
    
    if (!passed) {
      console.log('\n' + '='.repeat(60));
      console.log('❌ TEST FAILED - STOPPING');
      console.log('='.repeat(60));
      console.log(`\nFailed test: ${test.name}`);
      console.log('Please fix the failing test before proceeding to integration.');
      break;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 PREREQUISITES TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const failed = results.filter(r => !r.passed);

  console.log(`\n✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);

  console.log('\n📋 Detailed Results:');
  results.forEach((r, i) => {
    const status = r.passed ? '✅' : '❌';
    console.log(`   ${i + 1}. ${status} ${r.name}${r.error ? ` - ${r.error}` : ''}`);
  });

  if (failed.length > 0) {
    console.log('\n❌ Some prerequisites failed. Please fix before integration.');
    console.log('\nFailed tests:');
    failed.forEach(f => {
      console.log(`   - ${f.name}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 All prerequisites passed!');
    console.log('✅ Ready for integration test');
    console.log('\nNext step: Run browser connection test');
    console.log('   npm run test:browser-connection');
  }
}

runAllTests();

