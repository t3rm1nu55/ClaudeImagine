import { z } from 'zod';

// JSON-RPC message types
export const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.any().optional(),
});

export const JsonRpcResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  result: z.any().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional(),
  }).optional(),
});

export type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;
export type JsonRpcResponse = z.infer<typeof JsonRpcResponseSchema>;

// Tool definition schema
export const ToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.any(),
});

export type Tool = z.infer<typeof ToolSchema>;
export type ToolResult = {
  success: boolean;
  data?: any;
  error?: string;
};

// Permission types
export type PermissionType = 'camera' | 'microphone' | 'geolocation';
export type PermissionDecision = 'allow-once' | 'always-allow' | 'deny';

// Window state
export interface WindowState {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  element: HTMLElement;
}

