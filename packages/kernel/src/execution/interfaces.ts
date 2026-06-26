import type { ExecutionContext, PipelineStage, PipelineResult, CheckpointData } from './types';

export interface ExecutionPipeline {
  addStage<TIn, TOut>(stage: PipelineStage<TIn, TOut>): void;
  execute<TInput, TOutput>(input: TInput, context?: Partial<ExecutionContext>): Promise<PipelineResult<TOutput>>;
  cancel(executionId: string): void;
}

export interface ExecutionContextFactory {
  create(overrides?: Partial<ExecutionContext>): ExecutionContext;
  child(parent: ExecutionContext): ExecutionContext;
}

export interface CheckpointStore {
  save(checkpoint: CheckpointData): Promise<void>;
  load(executionId: string): Promise<CheckpointData | null>;
  delete(executionId: string): Promise<void>;
}

export interface CompensationEngine {
  compensate(stages: PipelineStage[], fromIndex: number, context: ExecutionContext): Promise<import('./types').CompensationRecord[]>;
}
