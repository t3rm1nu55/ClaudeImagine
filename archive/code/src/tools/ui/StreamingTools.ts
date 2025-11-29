import DOMPurify from 'dompurify';
import { Tool, ToolResult } from '../../types.js';
import { WindowManager } from './WindowTools.js';

export class StreamingState {
  private streamBuffers: Map<string, string> = new Map();

  startStream(id: string, initialHtml: string = ''): void {
    this.streamBuffers.set(id, initialHtml);
  }

  appendChunk(id: string, chunk: string): void {
    const current = this.streamBuffers.get(id) || '';
    this.streamBuffers.set(id, current + chunk);
  }

  endStream(id: string): string {
    const html = this.streamBuffers.get(id) || '';
    this.streamBuffers.delete(id);
    return html;
  }

  hasStream(id: string): boolean {
    return this.streamBuffers.has(id);
  }

  getCurrentBuffer(id: string): string {
    return this.streamBuffers.get(id) || '';
  }
}

export function createStreamingTools(windowManager: WindowManager, streamingState: StreamingState): Array<{ tool: Tool; handler: (params: any) => ToolResult }> {
  return [
    {
      tool: {
        name: 'private_streamable_start',
        description: 'Start streaming HTML content to an element',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector or window ID' },
            initialHtml: { type: 'string', description: 'Initial HTML content', default: '' },
          },
          required: ['selector'],
        },
      },
      handler: (params) => {
        streamingState.startStream(params.selector, params.initialHtml || '');
        return { success: true };
      },
    },
    {
      tool: {
        name: 'private_streamable_append',
        description: 'Append a chunk of HTML to a streaming element',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector or window ID' },
            chunk: { type: 'string', description: 'HTML chunk to append' },
          },
          required: ['selector', 'chunk'],
        },
      },
      handler: (params) => {
        if (!streamingState.hasStream(params.selector)) {
          return { success: false, error: `No active stream for selector: ${params.selector}` };
        }

        streamingState.appendChunk(params.selector, params.chunk);
        
        // Update the DOM in real-time
        try {
          let targetElement: HTMLElement | null = null;
          const windowContent = windowManager.getWindowContentElement(params.selector);
          if (windowContent) {
            targetElement = windowContent;
          } else {
            targetElement = document.querySelector(params.selector);
          }
          
          if (targetElement) {
            const sanitizedHtml = DOMPurify.sanitize(streamingState.getCurrentBuffer(params.selector), {
              ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'button', 'input', 'form', 'label', 'select', 'option', 'textarea', 'canvas', 'video', 'audio', 'svg', 'path', 'circle', 'rect', 'line', 'text', 'g'],
              ALLOWED_ATTR: ['class', 'id', 'href', 'src', 'alt', 'width', 'height', 'style', 'type', 'value', 'name', 'placeholder', 'for', 'role', 'aria-label', 'data-*'],
            });
            targetElement.innerHTML = sanitizedHtml;
          }
        } catch (error) {
          // Continue streaming even if DOM update fails
        }

        return { success: true };
      },
    },
    {
      tool: {
        name: 'private_streamable_end',
        description: 'End streaming and finalize HTML content',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector or window ID' },
          },
          required: ['selector'],
        },
      },
      handler: (params) => {
        if (!streamingState.hasStream(params.selector)) {
          return { success: false, error: `No active stream for selector: ${params.selector}` };
        }

        const finalHtml = streamingState.endStream(params.selector);
        
        // Final DOM update
        try {
          let targetElement: HTMLElement | null = null;
          const windowContent = windowManager.getWindowContentElement(params.selector);
          if (windowContent) {
            targetElement = windowContent;
          } else {
            targetElement = document.querySelector(params.selector);
          }
          
          if (targetElement) {
            const sanitizedHtml = DOMPurify.sanitize(finalHtml, {
              ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'button', 'input', 'form', 'label', 'select', 'option', 'textarea', 'canvas', 'video', 'audio', 'svg', 'path', 'circle', 'rect', 'line', 'text', 'g'],
              ALLOWED_ATTR: ['class', 'id', 'href', 'src', 'alt', 'width', 'height', 'style', 'type', 'value', 'name', 'placeholder', 'for', 'role', 'aria-label', 'data-*'],
            });
            targetElement.innerHTML = sanitizedHtml;
          }
        } catch (error) {
          return { success: false, error: String(error) };
        }

        return { success: true };
      },
    },
  ];
}

