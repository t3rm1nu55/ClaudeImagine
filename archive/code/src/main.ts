import { WebSocketTransport } from './transport/WebSocketTransport.js';
import { McpServer } from './core/McpServer.js';
import { PermissionManager } from './permissions/PermissionManager.js';
import { WindowManager, createWindowTools } from './tools/ui/WindowTools.js';
import { createDomTools } from './tools/ui/DomTools.js';
import { StreamingState, createStreamingTools } from './tools/ui/StreamingTools.js';
import { createSystemTools } from './tools/ui/SystemTools.js';
import { InputTracker, createInteractionTools } from './tools/interaction/InputTracker.js';
import { createChartTools } from './tools/content/ChartTools.js';
import { createMapTools } from './tools/content/MapTools.js';
import { createScreenshotTools } from './tools/content/ScreenshotTools.js';
import { createQrCodeTools } from './tools/content/QrCodeTools.js';
import { createPdfTools } from './tools/content/PdfTools.js';
import { createCameraTools } from './tools/device/CameraTools.js';
import { createSpeechTools } from './tools/device/SpeechTools.js';
import { createGeolocationTools } from './tools/device/GeolocationTools.js';

class ImagineApp {
  private transport: WebSocketTransport;
  private server: McpServer;
  private permissionManager: PermissionManager;
  private windowManager: WindowManager;
  private streamingState: StreamingState;
  private inputTracker: InputTracker;
  private wsUrl: string;

  constructor() {
    // Get WebSocket URL from environment or use default
    this.wsUrl = (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:8080/ws';
    
    this.permissionManager = new PermissionManager();
    this.transport = new WebSocketTransport(this.wsUrl);
    this.server = new McpServer(this.transport, this.permissionManager);
    this.windowManager = new WindowManager();
    this.streamingState = new StreamingState();
    this.inputTracker = new InputTracker();
    
    this.setupTools();
    this.setupUI();
  }

  private setupTools(): void {
    // UI Manipulation Tools
    const windowTools = createWindowTools(this.windowManager);
    windowTools.forEach(({ tool, handler }) => {
      this.server.registerTool(tool, handler);
    });

    const domTools = createDomTools(this.windowManager);
    domTools.forEach(({ tool, handler }) => {
      this.server.registerTool(tool, handler);
    });

    const streamingTools = createStreamingTools(this.windowManager, this.streamingState);
    streamingTools.forEach(({ tool, handler }) => {
      this.server.registerTool(tool, handler);
    });

    const systemTools = createSystemTools();
    systemTools.forEach(({ tool, handler }) => {
      this.server.registerTool(tool, handler);
    });

    // User Interaction Tools
    const interactionTools = createInteractionTools(this.inputTracker);
    interactionTools.forEach(({ tool, handler }) => {
      this.server.registerTool(tool, handler);
    });

    // Content Generation Tools
    const chartTools = createChartTools();
    chartTools.forEach(({ tool, handler }) => {
      this.server.registerTool(tool, handler);
    });

    const mapTools = createMapTools();
    mapTools.forEach(({ tool, handler }) => {
      this.server.registerTool(tool, handler);
    });

    const screenshotTools = createScreenshotTools();
    screenshotTools.forEach(({ tool, handler }) => {
      this.server.registerTool(tool, handler);
    });

    const qrCodeTools = createQrCodeTools();
    qrCodeTools.forEach(({ tool, handler }) => {
      this.server.registerTool(tool, handler);
    });

    const pdfTools = createPdfTools();
    pdfTools.forEach(({ tool, handler }) => {
      this.server.registerTool(tool, handler);
    });

    // Device API Tools
    const cameraTools = createCameraTools();
    cameraTools.forEach(({ tool, handler }) => {
      this.server.registerTool(tool, handler);
    });

    const speechTools = createSpeechTools();
    speechTools.forEach(({ tool, handler }) => {
      this.server.registerTool(tool, handler);
    });

    const geolocationTools = createGeolocationTools();
    geolocationTools.forEach(({ tool, handler }) => {
      this.server.registerTool(tool, handler);
    });
  }

  private setupUI(): void {
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    const sendButton = document.getElementById('send-button') as HTMLButtonElement;

    if (!chatInput || !sendButton) {
      console.error('Chat UI elements not found');
      return;
    }

    const sendMessage = async () => {
      const message = chatInput.value.trim();
      if (!message) return;

      chatInput.value = '';
      sendButton.disabled = true;

      try {
        // Show loading indicator
        await this.server.sendRequest('tools/call', {
          name: 'private_loading_start',
          arguments: {},
        });

        // Send user message to model
        await this.transport.send({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'chat/message',
          params: {
            message,
            userInteractions: this.inputTracker.getRecentEvents(5),
          },
        });

        // Clear recent interactions after sending
        this.inputTracker.clearEvents();
      } catch (error) {
        console.error('Error sending message:', error);
        await this.server.sendRequest('tools/call', {
          name: 'private_error',
          arguments: {
            message: `Failed to send message: ${error}`,
            title: 'Error',
          },
        });
      } finally {
        sendButton.disabled = false;
      }
    };

    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });

    // Start tracking user interactions
    this.inputTracker.startTracking();
  }

  async connect(): Promise<void> {
    try {
      await this.transport.connect();
      console.log('Connected to WebSocket server');
      
      // Send tool list to model
      const tools = await this.server.listTools();
      await this.transport.send({
        jsonrpc: '2.0',
        id: 'init',
        method: 'tools/available',
        params: { tools },
      });
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new ImagineApp();
    app.connect().catch(console.error);
  });
} else {
  const app = new ImagineApp();
  app.connect().catch(console.error);
}

