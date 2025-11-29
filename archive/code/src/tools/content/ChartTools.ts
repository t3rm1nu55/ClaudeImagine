import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Tool, ToolResult } from '../../types.js';

Chart.register(...registerables);

const charts: Map<string, Chart> = new Map();

export function createChartTools(): Array<{ tool: Tool; handler: (params: any) => ToolResult }> {
  return [
    {
      tool: {
        name: 'chart:render',
        description: 'Render a Chart.js chart in a canvas element',
        inputSchema: {
          type: 'object',
          properties: {
            canvasId: { type: 'string', description: 'ID of the canvas element' },
            type: { type: 'string', enum: ['line', 'bar', 'pie', 'doughnut', 'radar', 'polarArea'], description: 'Chart type' },
            data: {
              type: 'object',
              description: 'Chart data',
              properties: {
                labels: { type: 'array', items: { type: 'string' } },
                datasets: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      label: { type: 'string' },
                      data: { type: 'array', items: { type: 'number' } },
                      backgroundColor: { type: 'array', items: { type: 'string' } },
                      borderColor: { type: 'string' },
                    },
                  },
                },
              },
            },
            options: { type: 'object', description: 'Chart.js options' },
          },
          required: ['canvasId', 'type', 'data'],
        },
      },
      handler: (params) => {
        try {
          const canvas = document.getElementById(params.canvasId) as HTMLCanvasElement;
          if (!canvas) {
            return { success: false, error: `Canvas element not found: ${params.canvasId}` };
          }

          // Destroy existing chart if it exists
          const existingChart = charts.get(params.canvasId);
          if (existingChart) {
            existingChart.destroy();
          }

          const config: ChartConfiguration = {
            type: params.type,
            data: params.data,
            options: params.options || {
              responsive: true,
              maintainAspectRatio: false,
            },
          };

          const chart = new Chart(canvas, config);
          charts.set(params.canvasId, chart);

          return { success: true };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
    {
      tool: {
        name: 'chart:update_data',
        description: 'Update data in an existing chart',
        inputSchema: {
          type: 'object',
          properties: {
            canvasId: { type: 'string', description: 'ID of the canvas element' },
            data: {
              type: 'object',
              description: 'Updated chart data',
              properties: {
                labels: { type: 'array', items: { type: 'string' } },
                datasets: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      label: { type: 'string' },
                      data: { type: 'array', items: { type: 'number' } },
                    },
                  },
                },
              },
            },
          },
          required: ['canvasId', 'data'],
        },
      },
      handler: (params) => {
        try {
          const chart = charts.get(params.canvasId);
          if (!chart) {
            return { success: false, error: `Chart not found: ${params.canvasId}` };
          }

          if (params.data.labels) {
            chart.data.labels = params.data.labels;
          }
          if (params.data.datasets) {
            chart.data.datasets = params.data.datasets;
          }
          chart.update();

          return { success: true };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
  ];
}

