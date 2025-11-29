import { Tool, ToolResult } from '../../types.js';

export function createGeolocationTools(): Array<{ tool: Tool; handler: (params: any) => Promise<ToolResult> }> {
  return [
    {
      tool: {
        name: 'init_geolocation',
        description: 'Initialize geolocation and request permission',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      handler: async () => {
        try {
          if (!navigator.geolocation) {
            return { success: false, error: 'Geolocation not supported in this browser' };
          }

          return { success: true, data: { message: 'Geolocation initialized' } };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
    {
      tool: {
        name: 'geolocation:get_position',
        description: 'Get current geographical position',
        inputSchema: {
          type: 'object',
          properties: {
            options: {
              type: 'object',
              properties: {
                enableHighAccuracy: { type: 'boolean', default: false },
                timeout: { type: 'number', default: 5000 },
                maximumAge: { type: 'number', default: 0 },
              },
            },
          },
        },
      },
      handler: (params) => {
        return new Promise((resolve) => {
          if (!navigator.geolocation) {
            resolve({ success: false, error: 'Geolocation not supported' });
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                success: true,
                data: {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  altitude: position.coords.altitude,
                  altitudeAccuracy: position.coords.altitudeAccuracy,
                  heading: position.coords.heading,
                  speed: position.coords.speed,
                },
              });
            },
            (error) => {
              resolve({ success: false, error: error.message });
            },
            params.options || {}
          );
        });
      },
    },
    {
      tool: {
        name: 'geolocation:watch_position',
        description: 'Watch position changes',
        inputSchema: {
          type: 'object',
          properties: {
            callbackId: { type: 'string', description: 'Unique ID for this watch' },
            options: {
              type: 'object',
              properties: {
                enableHighAccuracy: { type: 'boolean', default: false },
                timeout: { type: 'number', default: 5000 },
                maximumAge: { type: 'number', default: 0 },
              },
            },
          },
          required: ['callbackId'],
        },
      },
      handler: (params) => {
        if (!navigator.geolocation) {
          return Promise.resolve({ success: false, error: 'Geolocation not supported' });
        }

        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            // In a real implementation, this would send the position to the model
            console.log('Position update:', {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            console.error('Geolocation error:', error);
          },
          params.options || {}
        );

        return Promise.resolve({
          success: true,
          data: { watchId, callbackId: params.callbackId },
        });
      },
    },
  ];
}

