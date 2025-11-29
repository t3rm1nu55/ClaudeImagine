// server-mcp.js - MCP Server with HTTP Transport
// 
// This server runs independently and Claude CLI connects to it via HTTP.
// No spawning - just connect to http://localhost:3000/mcp
//
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { WebSocketServer } from 'ws';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const API_KEY = process.env.MCP_API_KEY || null;

// State
const browserSockets = new Map(); // sessionId -> ws
const transports = {}; // sessionId -> transport
const interactionQueue = []; // Queue of user interactions
let interactionListeners = []; // Listeners waiting for interactions
const pendingUpdates = new Map(); // requestId -> resolve function

// Setup Express
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Create HTTP Server
const httpServer = http.createServer(app);
httpServer.timeout = 600000; // 10 minutes
httpServer.keepAliveTimeout = 600000; // 10 minutes

// WebSocket Server for Browser
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const sessionId = url.searchParams.get('sessionId') || randomUUID();

  console.log(`Browser connected: ${sessionId}`);
  browserSockets.set(sessionId, ws);

  // Send session ID back to browser
  ws.send(JSON.stringify({ type: 'SESSION_INIT', sessionId }));

  ws.on('close', () => {
    console.log(`Browser disconnected: ${sessionId}`);
    browserSockets.delete(sessionId);
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      // Inject sessionId if missing
      if (!msg.sessionId) msg.sessionId = sessionId;

      if (msg.type === 'USER_INTERACTION') {
        console.log('Received user interaction:', msg);
        interactionQueue.push(msg);

        // Notify listeners
        while (interactionListeners.length > 0 && interactionQueue.length > 0) {
          const listener = interactionListeners.shift();
          const interaction = interactionQueue.shift();
          listener(interaction);
        }
      } else if (msg.type === 'DOM_UPDATED') {
        console.log('Received DOM update ack:', msg.requestId);
        if (pendingUpdates.has(msg.requestId)) {
          const resolve = pendingUpdates.get(msg.requestId);
          pendingUpdates.delete(msg.requestId);
          resolve(msg);
        }
      }
    } catch (e) {
      console.error('Error parsing WebSocket message:', e);
    }
  });

  ws.on('error', (err) => {
    console.error("WebSocket error:", err.message);
  });
});

// Broadcast to browser
function broadcastToBrowser(message, targetSessionId = null) {
  if (targetSessionId) {
    const ws = browserSockets.get(targetSessionId);
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  // Broadcast to all if no target
  let sentCount = 0;
  for (const ws of browserSockets.values()) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(message));
      sentCount++;
    }
  }
  return sentCount > 0;
}

// Create a new MCP server instance with tools
function createMcpServer() {
  const server = new McpServer({
    name: "imagine",
    version: "1.0.0"
  });

  // Register tools
  server.tool(
    "update_ui",
    "Replaces the HTML inside a container. Use this to build the UI.",
    {
      html: z.string().describe("The raw HTML string to inject."),
      selector: z.string().optional().describe("CSS selector to update (default: #app)"),
      sessionId: z.string().optional().describe("Target browser session ID (optional)")
    },
    async ({ html, selector, sessionId }) => {
      console.log(`[Tool: update_ui] Received args:`, { html, selector, sessionId });
      const requestId = randomUUID();
      const message = {
        type: "UPDATE_DOM",
        html: html,
        selector: selector || "#app",
        requestId: requestId
      };

      const sent = broadcastToBrowser(message, sessionId);
      if (!sent) {
        return {
          content: [{ type: "text", text: "Warning: No browser connected. Open http://localhost:3000 first." }],
          isError: true
        };
      }

      // Wait for acknowledgement
      try {
        const ack = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            pendingUpdates.delete(requestId);
            reject(new Error("Timeout waiting for browser acknowledgement"));
          }, 5000);

          pendingUpdates.set(requestId, (msg) => {
            clearTimeout(timeout);
            resolve(msg);
          });
        });

        return {
          content: [{ type: "text", text: `UI updated successfully. Actual content length: ${ack.htmlLength}` }]
        };
      } catch (e) {
        return {
          content: [{ type: "text", text: `Warning: UI update sent but verification failed: ${e.message}` }],
          isError: true
        };
      }
    }
  );

  server.tool(
    "log_thought",
    "Display a thinking process or status message to the user.",
    {
      message: z.string().describe("The message to display"),
      sessionId: z.string().optional().describe("Target browser session ID (optional)")
    },
    async ({ message, sessionId }) => {
      console.log(`[Tool: log_thought] Received args:`, { message, sessionId });
      const msg = {
        type: "LOG",
        message: message
      };

      const sent = broadcastToBrowser(msg, sessionId);
      if (!sent) {
        return {
          content: [{ type: "text", text: "Warning: No browser connected. Open http://localhost:3000 first." }],
          isError: true
        };
      }

      return {
        content: [{ type: "text", text: "Thought logged successfully" }]
      };
    }
  );

  server.tool(
    "get_next_interaction",
    "Check if the user has interacted with the UI (clicks, inputs, etc). Returns the next interaction event or null if none.",
    {},
    async () => {
      if (interactionQueue.length > 0) {
        const interaction = interactionQueue.shift();
        return {
          content: [{ type: "text", text: JSON.stringify(interaction) }]
        };
      }
      return {
        content: [{ type: "text", text: "null" }]
      };
    }
  );

  server.tool(
    "wait_for_interaction",
    "Wait for the user to interact with the UI. Blocks until an interaction occurs or timeout.",
    {
      timeout: z.number().optional().describe("Timeout in milliseconds (default: 30000)")
    },
    async ({ timeout = 30000 }) => {
      console.log(`[Tool: wait_for_interaction] Waiting for interaction (timeout: ${timeout}ms)`);

      // If already has interaction, return immediately
      if (interactionQueue.length > 0) {
        const interaction = interactionQueue.shift();
        return {
          content: [{ type: "text", text: JSON.stringify(interaction) }]
        };
      }

      // Wait for interaction
      return new Promise((resolve) => {
        let timer;

        const listener = (interaction) => {
          clearTimeout(timer);
          resolve({
            content: [{ type: "text", text: JSON.stringify(interaction) }]
          });
        };

        timer = setTimeout(() => {
          const index = interactionListeners.indexOf(listener);
          if (index !== -1) {
            interactionListeners.splice(index, 1);
          }
          resolve({
            content: [{ type: "text", text: "null" }] // Timeout
          });
        }, timeout);

        interactionListeners.push(listener);
      });
    }
  );

  return server;
}

// MCP HTTP Endpoint - POST handler
app.post('/mcp', async (req, res) => {
  console.log(`MCP POST from ${req.ip}`);

  // Auth Check
  if (API_KEY) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
      console.log('MCP Auth failed');
      res.status(401).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Unauthorized' },
        id: null
      });
      return;
    }
  }

  try {
    const sessionId = req.headers['mcp-session-id'];
    let transport;

    if (sessionId && transports[sessionId]) {
      // Reuse existing transport
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New initialization request
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          transports[id] = transport;
          console.log(`MCP session initialized: ${id}`);
        }
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId];
          console.log(`MCP session closed: ${transport.sessionId}`);
        }
      };

      // Create and connect MCP server
      const server = createMcpServer();
      await server.connect(transport);
    } else {
      // Invalid request
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided'
        },
        id: null
      });
      return;
    }

    // Handle the request
    await transport.handleRequest(req, res, req.body);

  } catch (error) {
    console.error('MCP POST error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: error.message },
        id: null
      });
    }
  }
});

// MCP HTTP Endpoint - GET handler (SSE for server notifications)
app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
});

// MCP HTTP Endpoint - DELETE handler (session termination)
app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    browsers: browserSockets.size,
    sessions: Object.keys(transports).length
  });
});

// Start server
httpServer.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           Claude Imagine - MCP Server (HTTP)               ║
╠════════════════════════════════════════════════════════════╣
║  Server:    http://${HOST}:${PORT}                          
║  MCP:       http://${HOST}:${PORT}/mcp                      
║  Browser:   ws://${HOST}:${PORT}                            
║  Health:    http://${HOST}:${PORT}/health                   
╠════════════════════════════════════════════════════════════╣
║  To connect Claude CLI:                                    ║
║  claude mcp add --transport http imagine http://localhost:${PORT}/mcp
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  Object.values(transports).forEach(t => t.close?.());
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nTerminating...');
  Object.values(transports).forEach(t => t.close?.());
  httpServer.close(() => process.exit(0));
});
