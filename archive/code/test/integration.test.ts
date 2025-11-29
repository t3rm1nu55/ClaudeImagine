/**
 * Integration tests for Imagine with Claude
 * 
 * These tests verify that the MCP server, tools, and WebSocket transport
 * work together correctly.
 */

import { WebSocketTransport } from '../src/transport/WebSocketTransport.js';
import { McpServer } from '../src/core/McpServer.js';
import { PermissionManager } from '../src/permissions/PermissionManager.js';
import { WindowManager, createWindowTools } from '../src/tools/ui/WindowTools.js';
import { createDomTools } from '../src/tools/ui/DomTools.js';
import { createSystemTools } from '../src/tools/ui/SystemTools.js';

// Mock WebSocket for testing
class MockWebSocket {
  private listeners: Map<string, Set<Function>> = new Map();
  public readyState: number = WebSocket.OPEN;
  public sentMessages: any[] = [];

  addEventListener(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  send(data: string) {
    this.sentMessages.push(JSON.parse(data));
  }

  simulateMessage(message: any) {
    const handlers = this.listeners.get('message');
    if (handlers) {
      handlers.forEach((handler: Function) => {
        handler({ data: JSON.stringify(message) });
      });
    }
  }
}

describe('MCP Server Integration', () => {
  let transport: WebSocketTransport;
  let server: McpServer;
  let permissionManager: PermissionManager;
  let windowManager: WindowManager;

  beforeEach(() => {
    permissionManager = new PermissionManager();
    windowManager = new WindowManager();
    
    // Create a mock transport
    const mockWs = new MockWebSocket() as any;
    transport = new WebSocketTransport('ws://test');
    (transport as any).ws = mockWs;
    (transport as any).isConnected = () => true;
    
    server = new McpServer(transport, permissionManager);
    
    // Register tools
    const windowTools = createWindowTools(windowManager);
    windowTools.forEach(({ tool, handler }) => {
      server.registerTool(tool, handler);
    });
    
    const domTools = createDomTools(windowManager);
    domTools.forEach(({ tool, handler }) => {
      server.registerTool(tool, handler);
    });
    
    const systemTools = createSystemTools();
    systemTools.forEach(({ tool, handler }) => {
      server.registerTool(tool, handler);
    });
  });

  test('should list available tools', async () => {
    const tools = await server.listTools();
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.some((t) => t.name === 'window_new')).toBe(true);
  });

  test('should handle tool call request', async () => {
    const request = {
      jsonrpc: '2.0' as const,
      id: 'test-1',
      method: 'tools/call',
      params: {
        name: 'window_new',
        arguments: {
          id: 'test-window',
          title: 'Test Window',
          x: 100,
          y: 100,
          width: 400,
          height: 300,
        },
      },
    };

    // Simulate receiving the request
    (transport as any).ws.simulateMessage(request);

    // Wait a bit for async processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check that a response was sent
    const sentMessages = (transport as any).ws.sentMessages;
    expect(sentMessages.length).toBeGreaterThan(0);
    
    const response = sentMessages.find((m: any) => m.id === 'test-1');
    expect(response).toBeDefined();
    expect(response.result.success).toBe(true);
  });

  test('should handle system tool calls', async () => {
    const request = {
      jsonrpc: '2.0' as const,
      id: 'test-2',
      method: 'tools/call',
      params: {
        name: 'private_loading_start',
        arguments: {},
      },
    };

    (transport as any).ws.simulateMessage(request);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const loadingBar = document.getElementById('loading-bar');
    expect(loadingBar?.classList.contains('active')).toBe(true);
  });
});

// Simple test runner (since we don't have a test framework set up)
if (typeof window === 'undefined') {
  console.log('Integration tests require a browser environment');
  console.log('Run: npm run dev and open the browser console');
}

