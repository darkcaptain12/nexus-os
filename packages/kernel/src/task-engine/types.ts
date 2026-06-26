import type { Priority } from '../core/types';

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying' | 'dead-letter';

export interface TaskDefinition<TPayload = unknown> {
  id: string;
  type: string;
  payload: TPayload;
  priority: Priority;
  dependencies: string[];
  timeout: number;
  maxRetries: number;
  retryDelayMs: number;
  scheduledAt?: string;
  deadlineAt?: string;
  metadata: Record<string, unknown>;
}

export interface TaskExecution {
  id: string;
  taskId: string;
  status: TaskStatus;
  workerId?: string;
  attempt: number;
  result?: unknown;
  error?: TaskError;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
}

export interface TaskError {
  code: string;
  message: string;
  stack?: string;
  retryable: boolean;
}

export interface TaskQueue {
  name: string;
  size: number;
  running: number;
  maxConcurrency: number;
  paused: boolean;
}

export interface WorkerInfo {
  id: string;
  queue: string;
  status: 'idle' | 'busy' | 'draining' | 'stopped';
  currentTaskId?: string;
  processedCount: number;
  failedCount: number;
  startedAt: string;
  lastActivityAt: string;
}

export interface TaskDependencyResult {
  taskId: string;
  resolved: boolean;
  pendingDependencies: string[];
  completedDependencies: string[];
  failedDependencies: string[];
}
