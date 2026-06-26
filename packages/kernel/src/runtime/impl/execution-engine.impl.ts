import type { ExecutionContext, PipelineStage, PipelineResult, CompensationRecord } from '../../execution/types';
import type { ExecutionPipeline } from '../../execution/interfaces';
import type { Logger } from '@apex-os/logger';

export class KernelExecutionPipeline implements ExecutionPipeline {
  private stages: PipelineStage[] = [];
  private activeExecutions = new Map<string, AbortController>();
  private log: Logger;

  constructor(log: Logger) {
    this.log = log;
  }

  addStage<TIn, TOut>(stage: PipelineStage<TIn, TOut>): void {
    this.stages.push(stage as PipelineStage);
  }

  async execute<TInput, TOutput>(
    input: TInput,
    overrides?: Partial<ExecutionContext>,
  ): Promise<PipelineResult<TOutput>> {
    const controller = new AbortController();
    const context: ExecutionContext = {
      id: crypto.randomUUID(),
      correlationId: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      timeout: 30000,
      abortController: controller,
      metadata: {},
      ...overrides,
    };

    this.activeExecutions.set(context.id, controller);
    const start = performance.now();
    let currentInput: unknown = input;
    let completedStages = 0;

    try {
      const timeoutId = setTimeout(() => controller.abort(), context.timeout);

      for (let i = 0; i < this.stages.length; i++) {
        if (controller.signal.aborted) {
          clearTimeout(timeoutId);
          await this.compensate(i - 1, input, context);
          return {
            success: false,
            error: 'Pipeline cancelled',
            stagesCompleted: completedStages,
            stagesTotal: this.stages.length,
            durationMs: Math.round(performance.now() - start),
            compensated: true,
          };
        }

        const stage = this.stages[i]!;
        try {
          currentInput = await stage.execute(currentInput, context);
          completedStages++;
        } catch (err) {
          clearTimeout(timeoutId);
          const errorMsg = err instanceof Error ? err.message : String(err);
          this.log.error(`Pipeline stage failed: ${stage.name}`, { executionId: context.id, stage: i, error: errorMsg });

          const compensated = await this.compensate(i, input, context);
          return {
            success: false,
            error: errorMsg,
            stagesCompleted: completedStages,
            stagesTotal: this.stages.length,
            durationMs: Math.round(performance.now() - start),
            compensated: compensated.length > 0,
          };
        }
      }

      clearTimeout(timeoutId);
      return {
        success: true,
        output: currentInput as TOutput,
        stagesCompleted: completedStages,
        stagesTotal: this.stages.length,
        durationMs: Math.round(performance.now() - start),
        compensated: false,
      };
    } finally {
      this.activeExecutions.delete(context.id);
    }
  }

  cancel(executionId: string): void {
    const controller = this.activeExecutions.get(executionId);
    if (controller) {
      controller.abort();
      this.log.info(`Pipeline cancelled: ${executionId}`);
    }
  }

  private async compensate(
    fromIndex: number,
    originalInput: unknown,
    context: ExecutionContext,
  ): Promise<CompensationRecord[]> {
    const records: CompensationRecord[] = [];
    for (let i = fromIndex; i >= 0; i--) {
      const stage = this.stages[i]!;
      if (stage.compensate) {
        try {
          await stage.compensate(originalInput, context);
          records.push({ stageIndex: i, stageName: stage.name, compensated: true });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          records.push({ stageIndex: i, stageName: stage.name, compensated: false, error: errorMsg });
          this.log.error(`Compensation failed: ${stage.name}`, { error: errorMsg });
        }
      }
    }
    return records;
  }
}
