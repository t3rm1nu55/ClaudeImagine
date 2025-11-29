/**
 * Test 1.2: Mock Tool Call Test
 * 
 * This script tests the update_ui tool by sending a mock tool call
 * to the WebSocket server.
 */

import WebSocket from 'ws';

const WS_URL = 'ws://localhost:3001/ws';

console.log('Connecting to WebSocket server...');

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ Connected to server');
  
  // Send mock tool call
  const toolCall = {
    jsonrpc: '2.0',
    id: 'test-mock-1',
    method: 'tools/call',
    params: {
      name: 'update_ui',
      arguments: {
        html: '<div class="p-4 bg-blue-500 text-white rounded">Hello World from Mock Test!</div>'
      }
    }
  };
  
  console.log('Sending tool call:', JSON.stringify(toolCall, null, 2));
  ws.send(JSON.stringify(toolCall));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('Received:', JSON.stringify(message, null, 2));
  
  if (message.id === 'test-mock-1') {
    if (message.result && message.result.success) {
      console.log('✅ Tool call successful!');
      console.log('   Check browser - you should see "Hello World from Mock Test!"');
    } else if (message.error) {
      console.log('❌ Tool call failed:', message.error.message);
    }
    ws.close();
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('Connection closed');
  process.exit(0);
});

// Timeout after 5 seconds
setTimeout(() => {
  console.log('❌ Test timeout');
  ws.close();
  process.exit(1);
}, 5000);

