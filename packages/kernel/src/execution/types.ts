export interface ExecutionContext {
  id: string;
  parentId?: string;
  correlationId: string;
  userId?: string;
  startedAt: string;
  timeout: number;
  abortController: AbortController;
  metadata: Record<string, unknown>;
}

export interface PipelineStage<TInput = unknown, TOutput = unknown> {
  name: string;
  execute(input: TInput, context: ExecutionContext): Promise<TOutput>;
  compensate?(input: TInput, context: ExecutionContext): Promise<void>;
}

export interface PipelineResult<T = unknown> {
  success: boolean;
  output?: T;
  error?: string;
  stagesCompleted: number;
  stagesTotal: number;
  durationMs: number;
  compensated: boolean;
}

export interface CheckpointData {
  executionId: string;
  stageIndex: number;
  state: unknown;
  createdAt: string;
}

export interface CompensationRecord {
  stageIndex: number;
  stageName: string;
  compensated: boolean;
  error?: string;
}
