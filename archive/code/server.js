/**
 * Unified Imagine Server
 * 
 * Serves static assets and handles WebSocket connections for the browser.
 * This matches the test plan expectations.
 */

import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 3000;
const WS_PORT = 3001;

// Create Express app
const app = express();

// Serve static files - Vite dev server handles this separately
app.use(express.static(join(__dirname, '.')));
app.use('/src', express.static(join(__dirname, 'src')));
app.use('/node_modules', express.static(join(__dirname, 'node_modules')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket Server
const wss = new WebSocketServer({ port: WS_PORT, path: '/ws' });

const browserConnections = new Set();
const conversations = new Map();

wss.on('connection', (ws: WebSocket, req) => {
  const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  conversations.set(conversationId, []);
  browserConnections.add(ws);

  console.log('Browser connected!');
  console.log(`Conversation ID: ${conversationId}`);

  // Send connection confirmation
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    id: 'connection',
    method: 'connected',
    params: { conversationId }
  }));

  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      await handleMessage(ws, conversationId, message);
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: message?.id || null,
        error: {
          code: -32700,
          message: 'Parse error',
          data: String(error)
        }
      }));
    }
  });

  ws.on('close', () => {
    console.log('Browser disconnected');
    browserConnections.delete(ws);
    conversations.delete(conversationId);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

async function handleMessage(ws: WebSocket, conversationId: string, message: any) {
  if (message.method === 'tools/list') {
    // Return available tools
    const tools = [
      {
        name: 'update_ui',
        description: 'Update the main UI container with new HTML content',
        inputSchema: {
          type: 'object',
          properties: {
            html: { type: 'string', description: 'HTML content to render' }
          },
          required: ['html']
        }
      },
      {
        name: 'log_thought',
        description: 'Log a thought or system message to the sidebar',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Message to log' }
          },
          required: ['message']
        }
      }
    ];

    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: message.id,
      result: { tools }
    }));
  } else if (message.method === 'tools/call') {
    // Handle tool calls from Claude
    const { name, arguments: args } = message.params || {};
    
    if (name === 'update_ui') {
      if (!args || !args.html) {
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32602,
            message: 'Missing required argument: html'
          }
        }));
        return;
      }

      // Broadcast UI update to all browser connections
      browserConnections.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            jsonrpc: '2.0',
            id: `ui-update-${Date.now()}`,
            method: 'ui/update',
            params: { html: args.html }
          }));
        }
      });

      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: message.id,
        result: { success: true }
      }));
    } else if (name === 'log_thought') {
      if (!args || !args.message) {
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32602,
            message: 'Missing required argument: message'
          }
        }));
        return;
      }

      // Broadcast log to all browser connections
      browserConnections.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            jsonrpc: '2.0',
            id: `log-${Date.now()}`,
            method: 'log/thought',
            params: { message: args.message }
          }));
        }
      });

      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: message.id,
        result: { success: true }
      }));
    } else {
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32601,
          message: `Tool not found: ${name}`
        }
      }));
    }
  } else if (message.method === 'ping') {
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: message.id,
      result: { pong: true }
    }));
  }
}

// Start HTTP server
app.listen(PORT, () => {
  console.log(`Local Imagine Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${WS_PORT}/ws`);
});

