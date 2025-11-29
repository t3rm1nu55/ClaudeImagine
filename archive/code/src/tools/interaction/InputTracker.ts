import { Tool, ToolResult } from '../../types.js';

export class InputTracker {
  private events: Array<{ type: string; target: string; data: any; timestamp: number }> = [];
  private listeners: Map<string, () => void> = new Map();

  startTracking(): void {
    // Track clicks
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target && !target.closest('#chat-container')) {
        this.events.push({
          type: 'click',
          target: this.getElementSelector(target),
          data: { text: target.textContent?.trim() || '' },
          timestamp: Date.now(),
        });
      }
    }, true);

    // Track form submissions
    document.addEventListener('submit', (e) => {
      const form = e.target as HTMLFormElement;
      if (form) {
        const formData = new FormData(form);
        const data: Record<string, string> = {};
        formData.forEach((value, key) => {
          data[key] = String(value);
        });
        this.events.push({
          type: 'submit',
          target: this.getElementSelector(form),
          data,
          timestamp: Date.now(),
        });
      }
    }, true);

    // Track input changes
    document.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (target && target.type !== 'password' && !target.closest('#chat-container')) {
        this.events.push({
          type: 'input',
          target: this.getElementSelector(target),
          data: { value: target.value },
          timestamp: Date.now(),
        });
      }
    }, true);
  }

  getRecentEvents(count: number = 10): Array<{ type: string; target: string; data: any; timestamp: number }> {
    return this.events.slice(-count);
  }

  clearEvents(): void {
    this.events = [];
  }

  private getElementSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c).join('.');
      if (classes) {
        return `.${classes}`;
      }
    }
    return element.tagName.toLowerCase();
  }
}

export function createInteractionTools(inputTracker: InputTracker): Array<{ tool: Tool; handler: (params: any) => ToolResult }> {
  return [
    {
      tool: {
        name: 'get_user_interactions',
        description: 'Get recent user interactions (clicks, form submissions, input changes)',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Number of recent events to return', default: 10 },
          },
        },
      },
      handler: (params) => {
        const events = inputTracker.getRecentEvents(params.count || 10);
        return { success: true, data: { events } };
      },
    },
  ];
}

