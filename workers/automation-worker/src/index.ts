export interface AutomationWorkerConfig {
  maxConcurrentWorkflows: number;
  stepTimeout: number;
  retryPolicy: { maxAttempts: number; backoffMs: number };
}

export interface AutomationJob {
  id: string;
  workflowId: string;
  triggerId: string;
  input: Record<string, unknown>;
  priority: number;
  createdAt: string;
}
