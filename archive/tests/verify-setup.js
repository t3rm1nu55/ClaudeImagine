/**
 * Verification Script
 * 
 * Checks that all required files exist and dependencies are installed
 */

import { existsSync } from 'fs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const checks = {
  'server-mcp.js exists': existsSync(join(__dirname, 'server-mcp.js')),
  'index.html exists': existsSync(join(__dirname, 'index.html')),
  'claude_config.json exists': existsSync(join(__dirname, 'claude_config.json')),
  'package.json exists': existsSync(join(__dirname, 'package.json')),
};

// Check dependencies
let packageJson;
try {
  packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'));
  checks['@modelcontextprotocol/sdk in dependencies'] = 
    packageJson.dependencies?.['@modelcontextprotocol/sdk'] !== undefined ||
    Object.keys(packageJson.dependencies || {}).some(dep => dep.includes('modelcontextprotocol'));
  checks['ws in dependencies'] = packageJson.dependencies?.ws !== undefined;
  checks['express in dependencies'] = packageJson.dependencies?.express !== undefined;
} catch (error) {
  console.error('Error reading package.json:', error);
}

// Check claude_config.json structure
try {
  const config = JSON.parse(readFileSync(join(__dirname, 'claude_config.json'), 'utf-8'));
  checks['claude_config.json has mcpServers'] = config.mcpServers !== undefined;
  checks['claude_config.json has imagine server'] = config.mcpServers?.imagine !== undefined;
  checks['claude_config.json has correct command'] = config.mcpServers?.imagine?.command === 'node';
  checks['claude_config.json has server-mcp.js in args'] = 
    config.mcpServers?.imagine?.args?.[0]?.includes('server-mcp.js');
} catch (error) {
  console.error('Error reading claude_config.json:', error);
}

// Check index.html content
try {
  const html = readFileSync(join(__dirname, 'index.html'), 'utf-8');
  checks['index.html has #app element'] = html.includes('id="app"');
  checks['index.html has WebSocket connection'] = html.includes('WebSocket');
  checks['index.html has morphdom'] = html.includes('morphdom');
} catch (error) {
  console.error('Error reading index.html:', error);
}

// Print results
console.log('\n=== Setup Verification ===\n');
let allPassed = true;

Object.entries(checks).forEach(([check, passed]) => {
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${check}`);
  if (!passed) allPassed = false;
});

console.log('\n=== Summary ===');
if (allPassed) {
  console.log('✅ All checks passed! Setup is complete.');
  console.log('\nNext steps:');
  console.log('1. Run: npm run server:mcp');
  console.log('2. Open: http://localhost:3000');
  console.log('3. Connect Claude CLI with: claude --config ./claude_config.json');
} else {
  console.log('❌ Some checks failed. Please review the errors above.');
  process.exit(1);
}

