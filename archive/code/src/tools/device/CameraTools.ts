import { Tool, ToolResult } from '../../types.js';

const cameraStreams: Map<string, MediaStream> = new Map();

export function createCameraTools(): Array<{ tool: Tool; handler: (params: any) => Promise<ToolResult> }> {
  return [
    {
      tool: {
        name: 'camera:init',
        description: 'Request camera access and initialize camera',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      handler: async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          cameraStreams.set('default', stream);
          return { success: true, data: { message: 'Camera initialized' } };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
    {
      tool: {
        name: 'camera:show_feed',
        description: 'Display camera feed in a video element',
        inputSchema: {
          type: 'object',
          properties: {
            videoId: { type: 'string', description: 'ID of the video element' },
            streamId: { type: 'string', default: 'default' },
          },
          required: ['videoId'],
        },
      },
      handler: async (params) => {
        try {
          let stream = cameraStreams.get(params.streamId || 'default');
          
          if (!stream) {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            cameraStreams.set(params.streamId || 'default', stream);
          }

          const video = document.getElementById(params.videoId) as HTMLVideoElement;
          if (!video) {
            return { success: false, error: `Video element not found: ${params.videoId}` };
          }

          video.srcObject = stream;
          video.play();

          return { success: true };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
    {
      tool: {
        name: 'camera:take_photo',
        description: 'Capture a photo from the camera feed',
        inputSchema: {
          type: 'object',
          properties: {
            videoId: { type: 'string', description: 'ID of the video element with camera feed' },
            canvasId: { type: 'string', description: 'ID of the canvas element to draw photo' },
          },
          required: ['videoId'],
        },
      },
      handler: async (params) => {
        try {
          const video = document.getElementById(params.videoId) as HTMLVideoElement;
          if (!video || !video.srcObject) {
            return { success: false, error: `Video element not found or no stream: ${params.videoId}` };
          }

          const canvas = params.canvasId 
            ? (document.getElementById(params.canvasId) as HTMLCanvasElement)
            : document.createElement('canvas');
          
          if (!canvas) {
            return { success: false, error: `Canvas element not found: ${params.canvasId}` };
          }

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return { success: false, error: 'Could not get canvas context' };
          }

          ctx.drawImage(video, 0, 0);
          const base64 = canvas.toDataURL('image/png');

          return { success: true, data: { image: base64 } };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
    {
      tool: {
        name: 'camera:stop',
        description: 'Stop camera stream',
        inputSchema: {
          type: 'object',
          properties: {
            streamId: { type: 'string', default: 'default' },
          },
        },
      },
      handler: async (params) => {
        try {
          const stream = cameraStreams.get(params.streamId || 'default');
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
            cameraStreams.delete(params.streamId || 'default');
          }
          return { success: true };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
  ];
}

