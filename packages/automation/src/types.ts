export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'completed' | 'failed';

export type TriggerType =
  | 'schedule'
  | 'event'
  | 'webhook'
  | 'manual'
  | 'condition';

export type ActionType =
  | 'api_call'
  | 'notification'
  | 'data_transform'
  | 'ai_task'
  | 'script'
  | 'delay'
  | 'branch';

export interface Trigger {
  id: string;
  type: TriggerType;
  config: Record<string, unknown>;
}

export interface Condition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains';
  value: unknown;
  logic?: 'and' | 'or';
}

export interface Action {
  id: string;
  type: ActionType;
  name: string;
  config: Record<string, unknown>;
  conditions?: Condition[];
  onSuccess?: string;
  onFailure?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  trigger: Trigger;
  actions: Action[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: WorkflowStatus;
  startedAt: string;
  completedAt?: string;
  currentActionId?: string;
  results: Record<string, unknown>;
  error?: string;
}

export interface WorkflowEngine {
  register(workflow: Workflow): Promise<void>;
  execute(workflowId: string, input?: Record<string, unknown>): Promise<WorkflowExecution>;
  pause(executionId: string): Promise<void>;
  resume(executionId: string): Promise<void>;
  cancel(executionId: string): Promise<void>;
  getExecution(executionId: string): Promise<WorkflowExecution | null>;
}
