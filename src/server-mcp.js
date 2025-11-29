// server-mcp.js - MCP Server with HTTP Transport
// 
// This server runs independently and Claude CLI connects to it via HTTP.
// No spawning - just connect to http://localhost:3000/mcp
//
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { WebSocketServer } from 'ws';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

// State
let activeBrowserSocket = null;
const transports = {}; // sessionId -> transport

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

// WebSocket Server for Browser
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  console.log("Browser connected via WebSocket");
  activeBrowserSocket = ws;
  
  ws.on('close', () => {
    console.log("Browser disconnected");
    activeBrowserSocket = null;
  });
  
  ws.on('error', (err) => {
    console.error("WebSocket error:", err.message);
  });
});

// Broadcast to browser
function broadcastToBrowser(message) {
  if (activeBrowserSocket && activeBrowserSocket.readyState === 1) {
    activeBrowserSocket.send(JSON.stringify(message));
    return true;
  }
  return false;
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
      html: { type: "string", description: "The raw HTML string to inject." },
      selector: { type: "string", description: "CSS selector to update (default: #app)" }
    },
    async ({ html, selector }) => {
      const message = {
        type: "UPDATE_DOM",
        html: html,
        selector: selector || "#app"
      };
      
      const sent = broadcastToBrowser(message);
      if (!sent) {
        return {
          content: [{ type: "text", text: "Warning: No browser connected. Open http://localhost:3000 first." }],
          isError: true
        };
      }
      
      return {
        content: [{ type: "text", text: "UI updated successfully" }]
      };
    }
  );

  server.tool(
    "log_thought",
    "Display a thinking process or status message to the user.",
    {
      message: { type: "string", description: "The message to display" }
    },
    async ({ message }) => {
      const msg = {
        type: "LOG",
        message: message
      };
      
      const sent = broadcastToBrowser(msg);
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

  return server;
}

// MCP HTTP Endpoint - POST handler
app.post('/mcp', async (req, res) => {
  console.log(`MCP POST from ${req.ip}`);
  
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
    browser: activeBrowserSocket ? 'connected' : 'disconnected',
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
