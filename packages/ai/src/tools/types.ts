export type ToolCategory =
  | 'filesystem'
  | 'github'
  | 'supabase'
  | 'browser'
  | 'desktop'
  | 'email'
  | 'calendar'
  | 'trading'
  | 'shopify'
  | 'http'
  | 'mcp'
  | 'custom';

export type ToolExecutionMode = 'sync' | 'async' | 'stream';

export interface ToolDefinition {
  name: string;
  category: ToolCategory;
  description: string;
  version: string;
  parameters: ToolParameter[];
  permissions: string[];
  executionMode: ToolExecutionMode;
  timeout: number;
  retryable: boolean;
  owner: string;
  health: ToolHealth;
  rateLimit?: { maxPerMinute: number; maxConcurrent: number };
  metadata: Record<string, unknown>;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  defaultValue?: unknown;
  enum?: unknown[];
  validation?: string;
}

export type ToolHealth = 'healthy' | 'degraded' | 'unavailable' | 'unknown';

export interface ToolExecutionRequest {
  toolName: string;
  arguments: Record<string, unknown>;
  executionId?: string;
  timeout?: number;
  userId?: string;
}

export interface ToolExecutionResponse {
  toolName: string;
  success: boolean;
  output: unknown;
  error?: { code: string; message: string };
  durationMs: number;
  timestamp: string;
}

export interface ToolUsageStats {
  toolName: string;
  totalCalls: number;
  successRate: number;
  averageLatencyMs: number;
  lastUsedAt: string;
  errorRate: number;
}
