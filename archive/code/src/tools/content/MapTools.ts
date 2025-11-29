import { Tool, ToolResult } from '../../types.js';

// Google Maps types (simplified)
interface GoogleMap {
  fitBounds(bounds: any): void;
}

interface GoogleMapsLatLng {
  lat: number;
  lng: number;
}

const maps: Map<string, GoogleMap> = new Map();

export function createMapTools(): Array<{ tool: Tool; handler: (params: any) => Promise<ToolResult> | ToolResult }> {
  return [
    {
      tool: {
        name: 'google_map:show_map',
        description: 'Show a Google Map in a container element',
        inputSchema: {
          type: 'object',
          properties: {
            containerId: { type: 'string', description: 'ID of the container element' },
            center: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
              },
              required: ['lat', 'lng'],
            },
            zoom: { type: 'number', default: 10 },
            apiKey: { type: 'string', description: 'Google Maps API key' },
          },
          required: ['containerId', 'center'],
        },
      },
      handler: async (params) => {
        try {
          const container = document.getElementById(params.containerId);
          if (!container) {
            return { success: false, error: `Container not found: ${params.containerId}` };
          }

          // Load Google Maps API if not already loaded
          if (!window.google || !window.google.maps) {
            if (!params.apiKey) {
              return { success: false, error: 'Google Maps API key is required' };
            }

            await new Promise<void>((resolve, reject) => {
              const script = document.createElement('script');
              script.src = `https://maps.googleapis.com/maps/api/js?key=${params.apiKey}&callback=initMap`;
              script.async = true;
              script.defer = true;
              
              (window as any).initMap = () => {
                resolve();
                delete (window as any).initMap;
              };
              
              script.onerror = reject;
              document.head.appendChild(script);
            });
          }

          const map = new (window.google!.maps.Map)(container, {
            center: { lat: params.center.lat, lng: params.center.lng },
            zoom: params.zoom || 10,
          }) as any as GoogleMap;

          maps.set(params.containerId, map);

          return { success: true };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
    {
      tool: {
        name: 'google_map:add_marker',
        description: 'Add a marker to a Google Map',
        inputSchema: {
          type: 'object',
          properties: {
            containerId: { type: 'string', description: 'ID of the map container' },
            position: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
              },
              required: ['lat', 'lng'],
            },
            title: { type: 'string' },
            label: { type: 'string' },
          },
          required: ['containerId', 'position'],
        },
      },
      handler: (params) => {
        try {
          const map = maps.get(params.containerId);
          if (!map) {
            return { success: false, error: `Map not found: ${params.containerId}` };
          }

          const marker = new (window.google!.maps.Marker)({
            position: { lat: params.position.lat, lng: params.position.lng },
            map: map as any,
            title: params.title,
            label: params.label,
          });

          return { success: true, data: { markerId: marker.get('id') || 'marker' } };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
    {
      tool: {
        name: 'google_map:fit_bounds',
        description: 'Fit map bounds to show all markers',
        inputSchema: {
          type: 'object',
          properties: {
            containerId: { type: 'string', description: 'ID of the map container' },
            bounds: {
              type: 'object',
              properties: {
                north: { type: 'number' },
                south: { type: 'number' },
                east: { type: 'number' },
                west: { type: 'number' },
              },
              required: ['north', 'south', 'east', 'west'],
            },
          },
          required: ['containerId', 'bounds'],
        },
      },
      handler: (params) => {
        try {
          const map = maps.get(params.containerId);
          if (!map) {
            return { success: false, error: `Map not found: ${params.containerId}` };
          }

          const bounds = new (window.google!.maps.LatLngBounds)(
            { lat: params.bounds.south, lng: params.bounds.west },
            { lat: params.bounds.north, lng: params.bounds.east }
          );

          map.fitBounds(bounds);

          return { success: true };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
  ];
}

