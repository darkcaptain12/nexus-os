export type NodeType = 'action' | 'decision' | 'parallel' | 'delay' | 'wait-event' | 'loop' | 'notification';
export type WorkflowStatus = 'draft' | 'enabled' | 'disabled' | 'archived';
export type ExecutionPhase = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
export type TriggerType = 'manual' | 'schedule' | 'desktop' | 'browser' | 'file' | 'calendar' | 'webhook' | 'email' | 'ai' | 'api' | 'integration' | 'startup';

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  entryNodeId: string;
  variables: Record<string, unknown>;
  timeout: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  tags: string[];
}

export interface WorkflowTrigger {
  type: TriggerType;
  config: Record<string, unknown>;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  handler: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
  timeout: number;
  retries: number;
}

export interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
  condition?: string;
  label?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  phase: ExecutionPhase;
  trigger: TriggerType;
  variables: Record<string, unknown>;
  nodeResults: NodeExecutionResult[];
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
  actor: string;
}

export interface NodeExecutionResult {
  nodeId: string;
  nodeName: string;
  nodeType: NodeType;
  status: 'completed' | 'failed' | 'skipped' | 'running';
  output?: unknown;
  error?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  attempt: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>;
}

export interface NodeHandler {
  execute(config: Record<string, unknown>, context: ExecutionContext): Promise<unknown>;
}

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  variables: Record<string, unknown>;
  nodeResults: Map<string, unknown>;
  abortSignal: AbortSignal;
}

export interface ScheduleConfig {
  cron?: string;
  timezone: string;
  businessHoursOnly: boolean;
  excludeWeekends: boolean;
  jitterMs: number;
}
