/**
 * Example WebSocket server for testing Imagine with Claude
 * 
 * This is a minimal example server that demonstrates how to connect
 * the browser client to a WebSocket server. In production, you would
 * connect this to the Claude API.
 * 
 * To run: node example-server.js
 * Requires: npm install ws
 */

const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

console.log('WebSocket server running on ws://localhost:8080');

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received:', data);

      // Handle different message types
      if (data.method === 'tools/list' || data.method === 'tools/available') {
        // Respond with available tools
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: data.id,
          result: {
            tools: [
              { name: 'window_new', description: 'Create a new window' },
              { name: 'dom_replace_html', description: 'Replace HTML content' },
              // Add more tools as needed
            ]
          }
        }));
      } else if (data.method === 'chat/message') {
        // Simulate model response - in production, call Claude API here
        console.log('User message:', data.params.message);
        
        // Example: Echo back a tool call
        setTimeout(() => {
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'tools/call',
            params: {
              name: 'window_new',
              arguments: {
                id: 'window-1',
                title: 'Hello from Server',
                x: 100,
                y: 100,
                width: 600,
                height: 400
              }
            }
          }));
        }, 1000);
      } else if (data.method === 'tools/call') {
        // Tool call response - in production, forward to browser
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: data.id,
          result: { success: true }
        }));
      } else if (data.method === 'ping') {
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: data.id,
          result: { pong: true }
        }));
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: data?.id || null,
        error: {
          code: -32700,
          message: 'Parse error',
          data: String(error)
        }
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

