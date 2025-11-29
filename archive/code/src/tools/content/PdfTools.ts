import { jsPDF } from 'jspdf';
import { Tool, ToolResult } from '../../types.js';

export function createPdfTools(): Array<{ tool: Tool; handler: (params: any) => Promise<ToolResult> }> {
  return [
    {
      tool: {
        name: 'init_pdf_builder',
        description: 'Initialize PDF builder tools',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      handler: async () => {
        return { success: true, data: { message: 'PDF builder initialized' } };
      },
    },
    {
      tool: {
        name: 'pdf:generate',
        description: 'Generate a PDF from HTML content',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector of the element to convert' },
            filename: { type: 'string', default: 'document.pdf' },
            options: {
              type: 'object',
              properties: {
                format: { type: 'string', default: 'a4' },
                orientation: { type: 'string', enum: ['portrait', 'landscape'], default: 'portrait' },
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

          const doc = new jsPDF({
            orientation: params.options?.orientation || 'portrait',
            unit: 'px',
            format: params.options?.format || 'a4',
          });

          // Simple text extraction (for a full implementation, you'd want html2canvas + jsPDF)
          const text = element.textContent || '';
          doc.text(text, 10, 10);

          doc.save(params.filename || 'document.pdf');

          return { success: true };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
  ];
}

