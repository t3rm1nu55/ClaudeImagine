/**
 * Claude API Adapter
 * 
 * This server bridges the browser-based MCP server with Claude's API.
 * It handles WebSocket connections from the browser and forwards tool calls
 * to Claude, then sends Claude's responses back to the browser.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { JsonRpcRequest, JsonRpcResponse } from '../src/types.js';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeTool {
  name: string;
  description: string;
  input_schema: any;
}

interface ClaudeToolUse {
  id: string;
  name: string;
  input: any;
}

interface ClaudeContentBlock {
  type: 'text' | 'tool_use';
  text?: string;
  id?: string;
  name?: string;
  input?: any;
}

class ClaudeAdapter {
  private wss: WebSocketServer;
  private apiKey: string;
  private apiUrl: string = 'https://api.anthropic.com/v1/messages';
  private conversations: Map<string, ClaudeMessage[]> = new Map();
  private tools: ClaudeTool[] = [];

  constructor(port: number = 8080, apiKey?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Warning: ANTHROPIC_API_KEY not set. Set it as an environment variable.');
    }

    this.wss = new WebSocketServer({ port });
    console.log(`Claude API Adapter running on ws://localhost:${port}`);
    
    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });
  }

  private handleConnection(ws: WebSocket): void {
    const conversationId = `conv-${Date.now()}`;
    this.conversations.set(conversationId, []);

    console.log(`Client connected (${conversationId})`);

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as JsonRpcRequest | JsonRpcResponse;
        await this.handleMessage(ws, conversationId, message);
      } catch (error) {
        console.error('Error handling message:', error);
        this.sendError(ws, null, -32700, 'Parse error', { error: String(error) });
      }
    });

    ws.on('close', () => {
      console.log(`Client disconnected (${conversationId})`);
      this.conversations.delete(conversationId);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  private async handleMessage(
    ws: WebSocket,
    conversationId: string,
    message: JsonRpcRequest | JsonRpcResponse
  ): Promise<void> {
    if ('method' in message) {
      // It's a request
      const request = message as JsonRpcRequest;

      if (request.method === 'tools/list' || request.method === 'tools/available') {
        // Return available tools
        this.sendResponse(ws, request.id, { tools: this.tools });
      } else if (request.method === 'chat/message') {
        // Handle user message and forward to Claude
        await this.handleChatMessage(ws, conversationId, request);
      } else if (request.method === 'tools/call') {
        // Tool result from browser - forward to Claude
        await this.handleToolResult(ws, conversationId, request);
      } else if (request.method === 'ping') {
        this.sendResponse(ws, request.id, { pong: true });
      } else {
        this.sendError(ws, request.id, -32601, `Method not found: ${request.method}`);
      }
    } else {
      // It's a response (tool call result from browser)
      const response = message as JsonRpcResponse;
      if (response.id && typeof response.id === 'string' && response.id.startsWith('tool-')) {
        // This is a tool result, forward to Claude
        await this.forwardToolResultToClaude(ws, conversationId, response);
      }
    }
  }

  private async handleChatMessage(
    ws: WebSocket,
    conversationId: string,
    request: JsonRpcRequest
  ): Promise<void> {
    const userMessage = request.params?.message || '';
    const userInteractions = request.params?.userInteractions || [];

    // Add user message to conversation history
    const conversation = this.conversations.get(conversationId) || [];
    conversation.push({ role: 'user', content: userMessage });

    // Build context with user interactions if any
    let contextMessage = userMessage;
    if (userInteractions.length > 0) {
      contextMessage += '\n\nRecent user interactions:\n';
      userInteractions.forEach((interaction: any) => {
        contextMessage += `- ${interaction.type} on ${interaction.target}\n`;
      });
    }

    try {
      // Call Claude API
      const claudeResponse = await this.callClaudeAPI(conversation, contextMessage);
      
      // Process Claude's response
      await this.processClaudeResponse(ws, conversationId, claudeResponse);
    } catch (error) {
      console.error('Error calling Claude API:', error);
      this.sendError(ws, request.id, -32603, 'Claude API error', { error: String(error) });
    }
  }

  private async callClaudeAPI(
    conversation: ClaudeMessage[],
    currentMessage: string
  ): Promise<any> {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY not set');
    }

    const messages = [...conversation, { role: 'user' as const, content: currentMessage }];

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages,
        tools: this.tools.length > 0 ? this.tools : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async processClaudeResponse(
    ws: WebSocket,
    conversationId: string,
    claudeResponse: any
  ): Promise<void> {
    const conversation = this.conversations.get(conversationId) || [];
    let assistantContent = '';

    // Process content blocks
    for (const block of claudeResponse.content || []) {
      if (block.type === 'text') {
        assistantContent += block.text;
      } else if (block.type === 'tool_use') {
        // Forward tool call to browser
        await this.forwardToolCallToBrowser(ws, block);
      }
    }

    // Add assistant response to conversation
    if (assistantContent) {
      conversation.push({ role: 'assistant', content: assistantContent });
    }

    this.conversations.set(conversationId, conversation);
  }

  private async forwardToolCallToBrowser(ws: WebSocket, toolUse: ClaudeToolUse): Promise<void> {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: `tool-${toolUse.id}`,
      method: 'tools/call',
      params: {
        name: toolUse.name,
        arguments: toolUse.input,
      },
    };

    ws.send(JSON.stringify(request));
  }

  private async forwardToolResultToClaude(
    ws: WebSocket,
    conversationId: string,
    response: JsonRpcResponse
  ): Promise<void> {
    // In a full implementation, we'd need to track pending tool calls
    // and send the result back to Claude. For now, we'll log it.
    console.log('Tool result received:', response);
  }

  private async handleToolResult(
    ws: WebSocket,
    conversationId: string,
    request: JsonRpcRequest
  ): Promise<void> {
    // Tool execution result - in a full implementation, we'd send this back to Claude
    // For now, just acknowledge
    this.sendResponse(ws, request.id, { success: true });
  }

  registerTools(tools: ClaudeTool[]): void {
    this.tools = tools;
  }

  private sendResponse(ws: WebSocket, id: any, result: any): void {
    const response: JsonRpcResponse = {
      jsonrpc: '2.0',
      id,
      result,
    };
    ws.send(JSON.stringify(response));
  }

  private sendError(ws: WebSocket, id: any, code: number, message: string, data?: any): void {
    const response: JsonRpcResponse = {
      jsonrpc: '2.0',
      id,
      error: { code, message, data },
    };
    ws.send(JSON.stringify(response));
  }
}

// CLI interface - run if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('claude-adapter.ts') ||
                     process.argv[1]?.endsWith('claude-adapter.js');

if (isMainModule) {
  const port = parseInt(process.env.PORT || '8080', 10);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  const adapter = new ClaudeAdapter(port, apiKey);
  
  // Register tools (in a real implementation, these would come from the browser)
  adapter.registerTools([
    {
      name: 'window_new',
      description: 'Create a new floating window',
      input_schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
          width: { type: 'number' },
          height: { type: 'number' },
        },
        required: ['id', 'title'],
      },
    },
    // Add more tools as needed
  ]);
  
  console.log('Claude API Adapter started. Set ANTHROPIC_API_KEY environment variable to use Claude API.');
}

export { ClaudeAdapter };

