import type { ExecutionStatus } from '../core/types';

export interface ExecutionPipeline {
  id: string;
  stages: ExecutionStage[];
  currentStage: number;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
}

export interface ExecutionStage {
  id: string;
  name: string;
  type: 'agent' | 'tool' | 'transform' | 'condition' | 'approval';
  config: Record<string, unknown>;
  status: ExecutionStatus;
  input?: unknown;
  output?: unknown;
  error?: string;
  durationMs?: number;
}

export interface ExecutionQueue {
  pending: QueuedExecution[];
  running: QueuedExecution[];
  completed: QueuedExecution[];
  maxConcurrency: number;
}

export interface QueuedExecution {
  id: string;
  priority: number;
  agentId: string;
  input: string;
  queuedAt: string;
  startedAt?: string;
  estimatedDurationMs: number;
}

export interface RetryContext {
  attempt: number;
  maxAttempts: number;
  lastError: string;
  nextRetryAt: string;
  backoffMs: number;
}

export interface CancellationToken {
  cancelled: boolean;
  reason?: string;
  cancelledAt?: string;
  cancel(reason: string): void;
  onCancel(callback: () => void): void;
}
