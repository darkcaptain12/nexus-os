import type { ExecutionLog, MetricsSnapshot, MetricsTimeRange } from './types';

export interface TelemetryService {
  log(entry: Omit<ExecutionLog, 'id' | 'timestamp'>): void;
  getMetrics(timeRange: MetricsTimeRange): Promise<MetricsSnapshot>;
  getExecutionLogs(executionId: string): Promise<ExecutionLog[]>;
  getRecentLogs(limit: number): Promise<ExecutionLog[]>;
}

export interface CostTracker {
  recordCost(provider: string, model: string, cost: number): void;
  getDailyCost(): number;
  getMonthlyCost(): number;
  getCostByProvider(): Record<string, number>;
  isWithinBudget(): boolean;
  getBudgetUtilization(): number;
}

export interface PerformanceMonitor {
  recordLatency(provider: string, model: string, latencyMs: number): void;
  getAverageLatency(provider?: string): number;
  getPercentile(percentile: number, provider?: string): number;
  detectAnomalies(): LatencyAnomaly[];
}

export interface LatencyAnomaly {
  provider: string;
  model: string;
  expectedMs: number;
  actualMs: number;
  deviation: number;
  timestamp: string;
}

export interface AlertManager {
  setThreshold(metric: string, threshold: number): void;
  checkThresholds(): Alert[];
  acknowledge(alertId: string): void;
}

export interface Alert {
  id: string;
  metric: string;
  threshold: number;
  currentValue: number;
  severity: 'warning' | 'critical';
  timestamp: string;
  acknowledged: boolean;
}
