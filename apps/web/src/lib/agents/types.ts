export type AgentState =
  | 'CREATED'
  | 'READY'
  | 'RUNNING'
  | 'WAITING_APPROVAL'
  | 'WAITING_EVENT'
  | 'RETRYING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface AgentStep {
  id: string;
  name: string;
  description: string;
  actionId?: string;
  params: Record<string, unknown>;
  requiresApproval: boolean;
  approvalReason?: string;
  status: 'pending' | 'running' | 'done' | 'failed' | 'waiting_approval' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  result?: unknown;
  error?: string;
}

export interface AgentPlan {
  goal: string;
  steps: AgentStep[];
  currentStepIndex: number;
  generatedAt: string;
  totalSteps: number;
}

export interface AgentMetrics {
  runtimeMs: number;
  retryCount: number;
  approvalWaitMs: number;
  workflowDurationMs: number;
  stepCount: number;
  stepsCompleted: number;
  stepsFailed: number;
}

export interface AgentRecord {
  id: string;
  name: string;
  goal: string;
  state: AgentState;
  memoryRef: string;
  workflowRef?: string;
  currentTask?: string;
  retries: number;
  maxRetries: number;
  priority: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  cancelledAt?: string;
  errorMessage?: string;
  plan?: AgentPlan;
  approvalId?: string;
  metrics: AgentMetrics;
}

export interface CreateAgentInput {
  name: string;
  goal: string;
  priority?: 1 | 2 | 3 | 4 | 5;
  maxRetries?: number;
}

export interface AgentSchedulerMetrics {
  queueLength: number;
  runningCount: number;
  maxConcurrent: number;
  totalProcessed: number;
  totalFailed: number;
  totalRetried: number;
  averageRuntimeMs: number;
  generatedAt: string;
}
