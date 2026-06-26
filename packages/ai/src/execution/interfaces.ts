import type { ExecutionPipeline, ExecutionQueue, CancellationToken } from './types';
import type { AgentExecution } from '../agents/types';
import type { ExecutionContext } from '../agents/interfaces';

export interface ExecutionEngine {
  submit(agentId: string, input: string, context?: ExecutionContext): Promise<string>;
  execute(executionId: string, token?: CancellationToken): Promise<AgentExecution>;
  cancel(executionId: string, reason: string): Promise<void>;
  retry(executionId: string): Promise<AgentExecution>;
  getStatus(executionId: string): Promise<AgentExecution | null>;
  getQueue(): Promise<ExecutionQueue>;
}

export interface PipelineExecutor {
  create(stages: ExecutionPipeline['stages']): Promise<ExecutionPipeline>;
  execute(pipelineId: string): Promise<ExecutionPipeline>;
  pause(pipelineId: string): Promise<void>;
  resume(pipelineId: string): Promise<void>;
  cancel(pipelineId: string): Promise<void>;
}

export interface ExecutionScheduler {
  schedule(executionId: string, priority: number): void;
  dequeue(): string | undefined;
  reprioritize(executionId: string, newPriority: number): void;
  getPosition(executionId: string): number;
}
