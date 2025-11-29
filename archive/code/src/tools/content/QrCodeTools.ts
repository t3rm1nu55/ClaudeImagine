import QRCode from 'qrcode';
import { Tool, ToolResult } from '../../types.js';

export function createQrCodeTools(): Array<{ tool: Tool; handler: (params: any) => Promise<ToolResult> }> {
  return [
    {
      tool: {
        name: 'qr_code_render',
        description: 'Generate and display a QR code',
        inputSchema: {
          type: 'object',
          properties: {
            containerId: { type: 'string', description: 'ID of the container element' },
            text: { type: 'string', description: 'Text to encode in QR code' },
            size: { type: 'number', default: 200 },
            options: {
              type: 'object',
              properties: {
                color: {
                  type: 'object',
                  properties: {
                    dark: { type: 'string' },
                    light: { type: 'string' },
                  },
                },
              },
            },
          },
          required: ['containerId', 'text'],
        },
      },
      handler: async (params) => {
        try {
          const container = document.getElementById(params.containerId);
          if (!container) {
            return { success: false, error: `Container not found: ${params.containerId}` };
          }

          const canvas = document.createElement('canvas');
          await QRCode.toCanvas(canvas, params.text, {
            width: params.size || 200,
            color: params.options?.color || {
              dark: '#000000',
              light: '#FFFFFF',
            },
          });

          container.innerHTML = '';
          container.appendChild(canvas);

          return { success: true };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
  ];
}

