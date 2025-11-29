import { spawn } from 'child_process';
import { resolve } from 'path';

const server = spawn('node', ['src/server-mcp.js'], {
  stdio: ['pipe', 'pipe', 'inherit'], // pipe stdin/out, inherit stderr to see logs
  env: { ...process.env, PORT: '3000' }
});

// Send initialize request
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' }
  }
};

server.stdin.write(JSON.stringify(initRequest) + '\n');

server.stdout.on('data', (data) => {
  console.log('Received:', data.toString());
  
  // If we get a response, send initialized notification and then listTools
  try {
    const msg = JSON.parse(data.toString());
    if (msg.id === 1) {
      console.log('Initialized!');
      server.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized'
      }) + '\n');
      
      server.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list'
      }) + '\n');
    } else if (msg.id === 2) {
      console.log('Tools:', JSON.stringify(msg.result, null, 2));
      server.kill();
    }
  } catch (e) {
    console.error('Parse error:', e);
  }
});

server.on('exit', (code) => {
  console.log('Server exited with code', code);
});

