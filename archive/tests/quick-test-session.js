/**
 * Quick Session Management Test
 * Tests --continue flag which we know works
 */

import { spawn } from 'child_process';

function runClaude(args, input = null) {
  return new Promise((resolve, reject) => {
    const claude = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    claude.stdout.on('data', (d) => stdout += d.toString());
    
    if (input) claude.stdin.write(input);
    claude.stdin.end();

    claude.on('close', () => resolve(stdout));
    claude.on('error', reject);
    
    setTimeout(() => {
      claude.kill();
      reject(new Error('Timeout'));
    }, 15000);
  });
}

async function test() {
  console.log('Testing --continue flag (known to work)...\n');
  
  // Turn 1: Set context
  console.log('Turn 1: Setting context...');
  await runClaude([
    '--print',
    '--model', 'sonnet',
    'My name is Bob and I like pizza.'
  ]);
  
  // Turn 2: Continue conversation
  console.log('\nTurn 2: Continuing conversation...');
  const result = await runClaude([
    '--print',
    '--model', 'sonnet',
    '--continue',
    'What is my name and what do I like?'
  ]);
  
  console.log('Result:', result.substring(0, 200));
  
  const remembers = result.toLowerCase().includes('bob') && result.toLowerCase().includes('pizza');
  console.log(`\n${remembers ? '✅' : '❌'} State management: ${remembers ? 'WORKS' : 'FAILED'}`);
}

test().catch(console.error);

