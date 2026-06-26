export interface ExecutionLog {
  id: string;
  executionId: string;
  agentId?: string;
  provider: string;
  model: string;
  action: 'chat' | 'stream' | 'embed' | 'tool_call' | 'reasoning';
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  latencyMs: number;
  success: boolean;
  error?: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface PerformanceMetrics {
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  averageLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  throughputPerMinute: number;
}

export interface CostMetrics {
  totalCost: number;
  costByProvider: Record<string, number>;
  costByModel: Record<string, number>;
  costByAgent: Record<string, number>;
  dailyAverage: number;
  monthlyProjection: number;
}

export interface TokenMetrics {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  tokensByProvider: Record<string, number>;
  averageTokensPerRequest: number;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorRate: number;
  errorsByType: Record<string, number>;
  errorsByProvider: Record<string, number>;
  recentErrors: ErrorEntry[];
}

export interface ErrorEntry {
  executionId: string;
  provider: string;
  error: string;
  code: string;
  retried: boolean;
  recoveredAfterRetry: boolean;
  timestamp: string;
}

export interface MetricsTimeRange {
  from: string;
  to: string;
  granularity: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

export interface MetricsSnapshot {
  timeRange: MetricsTimeRange;
  performance: PerformanceMetrics;
  cost: CostMetrics;
  tokens: TokenMetrics;
  errors: ErrorMetrics;
  totalExecutions: number;
  successRate: number;
}
