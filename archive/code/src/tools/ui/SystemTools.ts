import { Tool, ToolResult } from '../../types.js';

export function createSystemTools(): Array<{ tool: Tool; handler: (params: any) => ToolResult }> {
  return [
    {
      tool: {
        name: 'private_loading_start',
        description: 'Show the global loading bar',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      handler: () => {
        const loadingBar = document.getElementById('loading-bar');
        if (loadingBar) {
          loadingBar.classList.add('active');
        }
        return { success: true };
      },
    },
    {
      tool: {
        name: 'private_loading_end',
        description: 'Hide the global loading bar',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      handler: () => {
        const loadingBar = document.getElementById('loading-bar');
        if (loadingBar) {
          loadingBar.classList.remove('active');
        }
        return { success: true };
      },
    },
    {
      tool: {
        name: 'private_thinking_start',
        description: 'Show the thinking bubble',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Initial thinking message', default: 'Thinking...' },
          },
        },
      },
      handler: (params) => {
        const bubble = document.getElementById('thinking-bubble');
        if (bubble) {
          bubble.textContent = params.message || 'Thinking...';
          bubble.classList.add('visible');
        }
        return { success: true };
      },
    },
    {
      tool: {
        name: 'private_thinking_delta',
        description: 'Update the thinking bubble message',
        inputSchema: {
          type: 'object',
          properties: {
            delta: { type: 'string', description: 'Text to append to thinking message' },
          },
          required: ['delta'],
        },
      },
      handler: (params) => {
        const bubble = document.getElementById('thinking-bubble');
        if (bubble) {
          bubble.textContent = (bubble.textContent || '') + params.delta;
        }
        return { success: true };
      },
    },
    {
      tool: {
        name: 'private_thinking_end',
        description: 'Hide the thinking bubble',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      handler: () => {
        const bubble = document.getElementById('thinking-bubble');
        if (bubble) {
          bubble.classList.remove('visible');
          bubble.textContent = '';
        }
        return { success: true };
      },
    },
    {
      tool: {
        name: 'private_error',
        description: 'Show an error modal dialog',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Error message' },
            title: { type: 'string', description: 'Error title', default: 'Error' },
          },
          required: ['message'],
        },
      },
      handler: (params) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        const title = document.createElement('div');
        title.className = 'modal-title';
        title.textContent = params.title || 'Error';
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.textContent = params.message;
        
        const buttons = document.createElement('div');
        buttons.className = 'modal-buttons';
        
        const okButton = document.createElement('button');
        okButton.className = 'modal-button primary';
        okButton.textContent = 'OK';
        okButton.onclick = () => {
          document.body.removeChild(overlay);
        };
        
        buttons.appendChild(okButton);
        modal.appendChild(title);
        modal.appendChild(content);
        modal.appendChild(buttons);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        return { success: true };
      },
    },
    {
      tool: {
        name: 'private_context_limit_reached',
        description: 'Show a modal when context limit is reached',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      handler: () => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        const title = document.createElement('div');
        title.className = 'modal-title';
        title.textContent = 'Context Limit Reached';
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.textContent = 'The conversation has reached its context limit. Please start a new conversation.';
        
        const buttons = document.createElement('div');
        buttons.className = 'modal-buttons';
        
        const okButton = document.createElement('button');
        okButton.className = 'modal-button primary';
        okButton.textContent = 'OK';
        okButton.onclick = () => {
          document.body.removeChild(overlay);
        };
        
        buttons.appendChild(okButton);
        modal.appendChild(title);
        modal.appendChild(content);
        modal.appendChild(buttons);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        return { success: true };
      },
    },
  ];
}

