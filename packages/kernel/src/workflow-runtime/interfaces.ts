import type {
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowPhase,
  WorkflowCheckpoint,
} from './types';

export interface WorkflowRuntime {
  register(definition: WorkflowDefinition): void;
  unregister(workflowId: string): void;
  start(workflowId: string, input?: Record<string, unknown>): Promise<WorkflowExecution>;
  pause(executionId: string): Promise<void>;
  resume(executionId: string): Promise<void>;
  cancel(executionId: string): Promise<void>;
  rollback(executionId: string, toCheckpoint?: string): Promise<void>;
  getExecution(executionId: string): Promise<WorkflowExecution | null>;
  listExecutions(workflowId?: string, phase?: WorkflowPhase): Promise<WorkflowExecution[]>;
  getDefinition(workflowId: string): WorkflowDefinition | undefined;
  listDefinitions(): WorkflowDefinition[];
}

export interface WorkflowNodeHandler {
  execute(nodeId: string, context: import('./types').WorkflowContext): Promise<unknown>;
  compensate?(nodeId: string, context: import('./types').WorkflowContext): Promise<void>;
}

export interface CheckpointManager {
  create(executionId: string, nodeId: string, context: import('./types').WorkflowContext): Promise<WorkflowCheckpoint>;
  restore(checkpointId: string): Promise<import('./types').WorkflowContext>;
  list(executionId: string): Promise<WorkflowCheckpoint[]>;
  prune(executionId: string, keepLast: number): Promise<number>;
}

export interface WorkflowValidator {
  validate(definition: WorkflowDefinition): WorkflowValidationResult;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: { nodeId?: string; message: string }[];
  warnings: { nodeId?: string; message: string }[];
  unreachableNodes: string[];
  missingHandlers: string[];
}
