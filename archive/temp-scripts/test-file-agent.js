import { createIsolatedClaude } from './create-isolated-claude.js';

async function testFileBasedAgent() {
  console.log('Testing file-based agent loading...');
  
  // Test 1: List agents to see if it's discovered
  try {
    console.log('\n--- Listing Agents ---');
    const listResult = await createIsolatedClaude(
      '/agents', 
      { model: 'sonnet' }
    );
    console.log('Agents List Output:', listResult.stdout);
  } catch (e) {
    console.error('List Error:', e);
  }

  // Test 2: Invoke explicitly
  try {
    console.log('\n--- Invoking Agent ---');
    const result = await createIsolatedClaude(
      'Use the "test-agent" to answer: Who are you?',
      { model: 'sonnet' }
    );
    
    console.log('Invocation Output:', result.stdout);
    
    if (result.stdout.includes('I am the file-based test agent')) {
      console.log('✅ File-based agent loaded successfully');
    } else {
      console.log('⚠️  Did not get exact phrase, checking context...');
    }
  } catch (e) {
    console.error('Invocation Error:', e);
  }
}

testFileBasedAgent();
