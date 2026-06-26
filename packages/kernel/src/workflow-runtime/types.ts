export type NodeType = 'action' | 'decision' | 'loop' | 'parallel' | 'sequential' | 'wait' | 'checkpoint' | 'compensation';
export type WorkflowPhase = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'rolling-back';

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  entryNodeId: string;
  timeout: number;
  retryPolicy: WorkflowRetryPolicy;
  metadata: Record<string, unknown>;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  handler: string;
  config: Record<string, unknown>;
  timeout: number;
  retries: number;
  compensationHandler?: string;
}

export interface WorkflowEdge {
  from: string;
  to: string;
  condition?: WorkflowCondition;
}

export interface WorkflowCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'exists' | 'matches';
  value: unknown;
}

export interface WorkflowRetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  phase: WorkflowPhase;
  currentNodeId?: string;
  context: WorkflowContext;
  checkpoints: WorkflowCheckpoint[];
  nodeResults: Map<string, NodeResult>;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface WorkflowContext {
  input: Record<string, unknown>;
  state: Record<string, unknown>;
  output?: Record<string, unknown>;
}

export interface WorkflowCheckpoint {
  id: string;
  nodeId: string;
  context: WorkflowContext;
  createdAt: string;
}

export interface NodeResult {
  nodeId: string;
  status: 'completed' | 'failed' | 'skipped' | 'compensated';
  output: unknown;
  error?: string;
  durationMs: number;
  attempts: number;
}
