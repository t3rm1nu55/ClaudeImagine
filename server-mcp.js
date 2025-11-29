// server.js - MCP Server Relay
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { WebSocketServer } from 'ws';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Setup Express to serve the Frontend (The "Body")
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(__dirname)); // Serve index.html from here

const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer });

let activeBrowserSocket = null;

// 2. Setup WebSocket (The Bridge to the Browser)
wss.on('connection', (ws) => {
  console.error("Browser connected!"); // Log to stderr so it doesn't break MCP Stdio
  activeBrowserSocket = ws;
  
  ws.on('close', () => {
    console.error("Browser disconnected");
    activeBrowserSocket = null;
  });
});

// 3. Setup MCP Server (The Interface for Claude CLI)
const server = new Server(
  { name: "local-imagine", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Define the Tools Claude can use
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "update_ui",
        description: "Replaces the HTML inside the #app container. Use this to build the UI.",
        inputSchema: {
          type: "object",
          properties: {
            html: { type: "string", description: "The raw HTML string to inject." },
            selector: { type: "string", description: "CSS selector to update (default: #app)" }
          },
          required: ["html"]
        }
      },
      {
        name: "log_thought",
        description: "Display a thinking process or status to the user.",
        inputSchema: {
          type: "object",
          properties: {
            message: { type: "string" }
          },
          required: ["message"]
        }
      }
    ]
  };
});

// Handle Tool Execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (!activeBrowserSocket) {
    throw new Error("No browser connected. Please open http://localhost:3000 first.");
  }

  const { name, arguments: args } = request.params;

  if (name === "update_ui") {
    // Send payload to Browser via WebSocket
    activeBrowserSocket.send(JSON.stringify({
      type: "UPDATE_DOM",
      html: args.html,
      selector: args.selector || "#app"
    }));
    return { content: [{ type: "text", text: "UI Updated Successfully" }] };
  }
  
  if (name === "log_thought") {
    activeBrowserSocket.send(JSON.stringify({
      type: "LOG",
      message: args.message
    }));
    return { content: [{ type: "text", text: "Thought logged to user." }] };
  }

  throw new Error("Tool not found");
});

// Start the Engines
const PORT = 3000;
// Security: Bind only to localhost (127.0.0.1), not 0.0.0.0 (all interfaces)
// This ensures the server is only accessible from the local machine
const HOST = process.env.HOST || '127.0.0.1'; // Default to localhost for security
httpServer.listen(PORT, HOST, () => {
  console.error(`Local Imagine Server running at http://${HOST}:${PORT}`);
});

// Connect MCP server (only if running via stdio - for CLI usage)
// If stdin is a TTY, skip MCP connection (standalone mode for testing)
if (!process.stdin.isTTY) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
} else {
  console.error('Running in standalone mode (HTTP/WebSocket only). For MCP, run via CLI.');
}

