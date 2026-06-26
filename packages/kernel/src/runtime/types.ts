import type { LifecyclePhase } from '../core/types';

export interface RuntimeInfo {
  version: string;
  environment: string;
  phase: LifecyclePhase;
  startedAt: string;
  uptime: number;
  pid: number;
  hostname: string;
  nodeVersion: string;
}

export interface RuntimeConfig {
  maxConcurrency: number;
  defaultTimeout: number;
  gracefulShutdownTimeout: number;
  enableMetrics: boolean;
  enableTracing: boolean;
  logLevel: string;
}

export interface KernelRuntimeEvent {
  type: 'boot' | 'shutdown' | 'error' | 'warning' | 'phase-change';
  message: string;
  phase: LifecyclePhase;
  timestamp: string;
  details?: Record<string, unknown>;
}
