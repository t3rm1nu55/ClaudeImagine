import { JsonRpcRequest, JsonRpcResponse, Tool, ToolResult } from '../types.js';
import { WebSocketTransport } from '../transport/WebSocketTransport.js';
import { PermissionManager } from '../permissions/PermissionManager.js';

export type ToolHandler = (params: any) => Promise<ToolResult> | ToolResult;

export class McpServer {
  private transport: WebSocketTransport;
  private permissionManager: PermissionManager;
  private tools: Map<string, Tool> = new Map();
  private toolHandlers: Map<string, ToolHandler> = new Map();
  private requestIdCounter = 0;

  constructor(transport: WebSocketTransport, permissionManager: PermissionManager) {
    this.transport = transport;
    this.permissionManager = permissionManager;
    
    // Listen for incoming messages
    this.transport.onMessage((message) => {
      if ('method' in message) {
        this.handleRequest(message);
      } else {
        this.handleResponse(message);
      }
    });
  }

  registerTool(tool: Tool, handler: ToolHandler): void {
    this.tools.set(tool.name, tool);
    this.toolHandlers.set(tool.name, handler);
  }

  async listTools(): Promise<Tool[]> {
    return Array.from(this.tools.values());
  }

  private async handleRequest(request: JsonRpcRequest): Promise<void> {
    try {
      if (request.method === 'tools/list') {
        const tools = await this.listTools();
        this.sendResponse(request.id, { tools });
      } else if (request.method === 'tools/call') {
        await this.handleToolCall(request);
      } else if (request.method === 'ping') {
        this.sendResponse(request.id, { pong: true });
      } else {
        this.sendError(request.id, -32601, `Method not found: ${request.method}`);
      }
    } catch (error) {
      console.error('Error handling request:', error);
      this.sendError(request.id, -32603, 'Internal error', { error: String(error) });
    }
  }

  private async handleToolCall(request: JsonRpcRequest): Promise<void> {
    const { name, arguments: args } = request.params || {};
    
    if (!name || !this.toolHandlers.has(name)) {
      this.sendError(request.id, -32602, `Tool not found: ${name}`);
      return;
    }

    // Check if tool requires permission
    const requiresPermission = this.checkPermissionRequirement(name);
    if (requiresPermission) {
      const hasPermission = await this.permissionManager.requestPermission(
        requiresPermission,
        `The tool "${name}" requires access to your ${requiresPermission}.`
      );
      
      if (!hasPermission) {
        this.sendError(request.id, -32000, `Permission denied for ${name}`);
        return;
      }
    }

    try {
      const handler = this.toolHandlers.get(name)!;
      const result = await handler(args || {});
      
      if (result.success) {
        this.sendResponse(request.id, result.data || {});
      } else {
        this.sendError(request.id, -32000, result.error || 'Tool execution failed');
      }
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      this.sendError(request.id, -32603, 'Tool execution error', { error: String(error) });
    }
  }

  private checkPermissionRequirement(toolName: string): 'camera' | 'microphone' | 'geolocation' | null {
    if (toolName.startsWith('camera:')) return 'camera';
    if (toolName.startsWith('speech_recognition:')) return 'microphone';
    if (toolName === 'init_geolocation') return 'geolocation';
    return null;
  }

  private handleResponse(response: JsonRpcResponse): void {
    // Handle responses from the model if needed
    console.log('Received response:', response);
  }

  private sendResponse(id: JsonRpcRequest['id'], result: any): void {
    const response: JsonRpcResponse = {
      jsonrpc: '2.0',
      id,
      result,
    };
    this.transport.send(response);
  }

  private sendError(id: JsonRpcRequest['id'], code: number, message: string, data?: any): void {
    const response: JsonRpcResponse = {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data,
      },
    };
    this.transport.send(response);
  }

  sendRequest(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestIdCounter;
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 30000);

      const unsubscribe = this.transport.onMessage((message) => {
        if ('id' in message && message.id === id && !('method' in message)) {
          clearTimeout(timeout);
          unsubscribe();
          
          const response = message as JsonRpcResponse;
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
        }
      });

      this.transport.send(request);
    });
  }
}

