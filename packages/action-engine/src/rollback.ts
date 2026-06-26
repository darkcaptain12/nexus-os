import type { RollbackRecord, ActionHandler, ExecutionContext } from './types';

export class RollbackManager {
  private records: RollbackRecord[] = [];

  async rollback(
    executionId: string,
    handler: ActionHandler,
    params: Record<string, unknown>,
    result: unknown,
    context: ExecutionContext,
  ): Promise<RollbackRecord> {
    const record: RollbackRecord = {
      id: crypto.randomUUID(),
      executionId,
      status: 'pending',
      description: '',
      createdAt: new Date().toISOString(),
    };

    if (!handler.rollback) {
      record.status = 'impossible';
      record.description = 'Action does not support rollback';
      this.records.push(record);
      return record;
    }

    try {
      await handler.rollback(params, result, context);
      record.status = 'completed';
      record.description = 'Rollback executed successfully';
      record.completedAt = new Date().toISOString();
    } catch (err) {
      record.status = 'failed';
      record.error = err instanceof Error ? err.message : String(err);
      record.description = 'Rollback failed';
    }

    this.records.push(record);
    return record;
  }

  getRecords(executionId?: string): RollbackRecord[] {
    if (executionId) {
      return this.records.filter((r) => r.executionId === executionId);
    }
    return [...this.records];
  }
}
