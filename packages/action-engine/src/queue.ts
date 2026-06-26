import type { ActionExecution, ExecutionQueueStats } from './types';

export class ExecutionQueue {
  private queue: ActionExecution[] = [];
  private running = new Map<string, ActionExecution>();
  private completed: ActionExecution[] = [];
  private deadLetter: ActionExecution[] = [];
  private maxConcurrency: number;

  constructor(maxConcurrency = 5) {
    this.maxConcurrency = maxConcurrency;
  }

  enqueue(execution: ActionExecution): void {
    if (execution.status !== 'pending-approval') {
      execution.status = 'queued';
    }
    this.queue.push(execution);
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  dequeue(): ActionExecution | undefined {
    if (this.running.size >= this.maxConcurrency) return undefined;
    const idx = this.queue.findIndex((e) => e.status === 'queued');
    if (idx === -1) return undefined;
    const next = this.queue.splice(idx, 1)[0];
    if (next) {
      next.status = 'running';
      next.startedAt = new Date().toISOString();
      this.running.set(next.id, next);
    }
    return next;
  }

  complete(executionId: string, result: unknown): void {
    const execution = this.running.get(executionId);
    if (!execution) return;
    execution.status = 'completed';
    execution.result = result;
    execution.completedAt = new Date().toISOString();
    execution.durationMs = new Date(execution.completedAt).getTime() - new Date(execution.startedAt!).getTime();
    this.running.delete(executionId);
    this.completed.push(execution);
  }

  fail(executionId: string, error: string): void {
    const execution = this.running.get(executionId);
    if (!execution) return;
    execution.status = 'failed';
    execution.error = error;
    execution.completedAt = new Date().toISOString();
    execution.durationMs = new Date(execution.completedAt).getTime() - new Date(execution.startedAt!).getTime();
    this.running.delete(executionId);

    if (execution.attempt < execution.maxAttempts) {
      execution.attempt++;
      execution.status = 'queued';
      execution.error = undefined;
      execution.startedAt = undefined;
      execution.completedAt = undefined;
      this.queue.push(execution);
    } else {
      this.deadLetter.push(execution);
    }
  }

  cancel(executionId: string): boolean {
    const queueIdx = this.queue.findIndex((e) => e.id === executionId);
    if (queueIdx !== -1) {
      const execution = this.queue.splice(queueIdx, 1)[0]!;
      execution.status = 'cancelled';
      execution.completedAt = new Date().toISOString();
      this.completed.push(execution);
      return true;
    }
    return false;
  }

  getExecution(executionId: string): ActionExecution | undefined {
    return (
      this.running.get(executionId) ??
      this.queue.find((e) => e.id === executionId) ??
      this.completed.find((e) => e.id === executionId) ??
      this.deadLetter.find((e) => e.id === executionId)
    );
  }

  getHistory(limit = 50): ActionExecution[] {
    return [...this.completed, ...this.deadLetter]
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
      .slice(0, limit);
  }

  getDeadLetterQueue(): ActionExecution[] {
    return [...this.deadLetter];
  }

  getStats(): ExecutionQueueStats {
    return {
      queued: this.queue.length,
      running: this.running.size,
      pendingApproval: this.queue.filter((e) => e.status === 'pending-approval').length,
      completed: this.completed.filter((e) => e.status === 'completed').length,
      failed: this.deadLetter.length,
      cancelled: this.completed.filter((e) => e.status === 'cancelled').length,
    };
  }
}
