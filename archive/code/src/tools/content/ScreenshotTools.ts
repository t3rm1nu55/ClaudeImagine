import html2canvas from 'html2canvas';
import { Tool, ToolResult } from '../../types.js';

export function createScreenshotTools(): Array<{ tool: Tool; handler: (params: any) => Promise<ToolResult> }> {
  return [
    {
      tool: {
        name: 'screenshot',
        description: 'Capture a screenshot of a DOM element and return as base64 image',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector of the element to capture' },
            options: {
              type: 'object',
              properties: {
                width: { type: 'number' },
                height: { type: 'number' },
                scale: { type: 'number', default: 1 },
              },
            },
          },
          required: ['selector'],
        },
      },
      handler: async (params) => {
        try {
          const element = document.querySelector(params.selector);
          if (!element) {
            return { success: false, error: `Element not found: ${params.selector}` };
          }

          const canvas = await html2canvas(element as HTMLElement, {
            width: params.options?.width,
            height: params.options?.height,
            scale: params.options?.scale || 1,
            useCORS: true,
            allowTaint: true,
          });

          const base64 = canvas.toDataURL('image/png');

          return { success: true, data: { image: base64 } };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
  ];
}

