import { Tool, ToolResult } from '../../types.js';
import { WindowState } from '../../types.js';

export class WindowManager {
  private windows: Map<string, WindowState> = new Map();
  private zIndexCounter = 1000;

  createWindow(id: string, title: string, x: number, y: number, width: number, height: number): ToolResult {
    if (this.windows.has(id)) {
      return { success: false, error: `Window with id "${id}" already exists` };
    }

    const app = document.getElementById('app');
    if (!app) {
      return { success: false, error: 'App container not found' };
    }

    const windowElement = document.createElement('div');
    windowElement.className = 'window';
    windowElement.style.left = `${x}px`;
    windowElement.style.top = `${y}px`;
    windowElement.style.width = `${width}px`;
    windowElement.style.height = `${height}px`;
    windowElement.style.zIndex = String(this.zIndexCounter++);

    const header = document.createElement('div');
    header.className = 'window-header';
    
    const titleElement = document.createElement('div');
    titleElement.className = 'window-title';
    titleElement.textContent = title;
    
    const closeButton = document.createElement('button');
    closeButton.className = 'window-close';
    closeButton.textContent = '×';
    closeButton.onclick = () => this.closeWindow(id);
    
    header.appendChild(titleElement);
    header.appendChild(closeButton);
    
    const content = document.createElement('div');
    content.className = 'window-content';
    content.id = `window-content-${id}`;
    
    windowElement.appendChild(header);
    windowElement.appendChild(content);
    app.appendChild(windowElement);

    // Make window draggable
    this.makeDraggable(windowElement, header);

    const windowState: WindowState = {
      id,
      title,
      x,
      y,
      width,
      height,
      element: windowElement,
    };

    this.windows.set(id, windowState);

    return { success: true, data: { windowId: id } };
  }

  closeWindow(id: string): ToolResult {
    const windowState = this.windows.get(id);
    if (!windowState) {
      return { success: false, error: `Window with id "${id}" not found` };
    }

    windowState.element.remove();
    this.windows.delete(id);

    return { success: true };
  }

  changeTitle(id: string, title: string): ToolResult {
    const windowState = this.windows.get(id);
    if (!windowState) {
      return { success: false, error: `Window with id "${id}" not found` };
    }

    const titleElement = windowState.element.querySelector('.window-title');
    if (titleElement) {
      titleElement.textContent = title;
      windowState.title = title;
    }

    return { success: true };
  }

  getWindowContentElement(id: string): HTMLElement | null {
    const windowState = this.windows.get(id);
    if (!windowState) {
      return null;
    }
    return windowState.element.querySelector(`#window-content-${id}`);
  }

  private makeDraggable(element: HTMLElement, handle: HTMLElement): void {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialX = 0;
    let initialY = 0;

    handle.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = element.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      element.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      element.style.left = `${initialX + deltaX}px`;
      element.style.top = `${initialY + deltaY}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        element.style.cursor = '';
      }
    });
  }
}

export function createWindowTools(windowManager: WindowManager): Array<{ tool: Tool; handler: (params: any) => ToolResult }> {
  return [
    {
      tool: {
        name: 'window_new',
        description: 'Create a new floating window',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique window identifier' },
            title: { type: 'string', description: 'Window title' },
            x: { type: 'number', description: 'X position in pixels', default: 100 },
            y: { type: 'number', description: 'Y position in pixels', default: 100 },
            width: { type: 'number', description: 'Window width in pixels', default: 600 },
            height: { type: 'number', description: 'Window height in pixels', default: 400 },
          },
          required: ['id', 'title'],
        },
      },
      handler: (params) => windowManager.createWindow(
        params.id,
        params.title,
        params.x || 100,
        params.y || 100,
        params.width || 600,
        params.height || 400
      ),
    },
    {
      tool: {
        name: 'window_close',
        description: 'Close a window',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Window identifier' },
          },
          required: ['id'],
        },
      },
      handler: (params) => windowManager.closeWindow(params.id),
    },
    {
      tool: {
        name: 'window_change_title',
        description: 'Change the title of a window',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Window identifier' },
            title: { type: 'string', description: 'New title' },
          },
          required: ['id', 'title'],
        },
      },
      handler: (params) => windowManager.changeTitle(params.id, params.title),
    },
  ];
}

