import type {
  ActionDefinition,
  ActionRequest,
  ActionExecution,
  ActionHandler,
  ExecutionContext,
  ExecutionQueueStats,
  ApprovalRequest,
  RollbackRecord,
} from './types';
import { ActionRegistry } from './registry';
import { ActionValidator } from './validator';
import { ApprovalManager } from './approval';
import { ExecutionQueue } from './queue';
import { RollbackManager } from './rollback';

export class ActionEngine {
  readonly registry: ActionRegistry;
  readonly validator: ActionValidator;
  readonly approvals: ApprovalManager;
  readonly queue: ExecutionQueue;
  readonly rollbacks: RollbackManager;

  private abortControllers = new Map<string, AbortController>();
  private processingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(maxConcurrency = 5) {
    this.registry = new ActionRegistry();
    this.validator = new ActionValidator();
    this.approvals = new ApprovalManager();
    this.queue = new ExecutionQueue(maxConcurrency);
    this.rollbacks = new RollbackManager();
  }

  registerAction(definition: ActionDefinition, handler: ActionHandler): void {
    this.registry.register(definition, handler);
  }

  async submit(request: ActionRequest): Promise<ActionExecution> {
    const registered = this.registry.get(request.actionId);
    if (!registered) {
      throw new Error(`Action not found: ${request.actionId}`);
    }

    const { definition, handler } = registered;

    const validation = this.validator.validate(definition, handler, request.params);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map((e) => e.message).join(', ')}`);
    }

    const execution: ActionExecution = {
      id: crypto.randomUUID(),
      actionId: definition.id,
      actionName: definition.name,
      category: definition.category,
      riskLevel: definition.riskLevel,
      status: 'queued',
      params: request.params,
      requestedBy: request.requestedBy,
      source: request.source,
      priority: request.priority,
      attempt: 1,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
    };

    if (request.source === 'ai' && (definition.riskLevel === 'high' || definition.riskLevel === 'critical')) {
      const approval = this.approvals.createRequest(
        execution.id,
        definition.id,
        definition.name,
        definition.riskLevel,
        `AI requested: ${definition.description}`,
        request.params,
        request.requestedBy,
      );
      execution.status = 'pending-approval';
      execution.approvalId = approval.id;
      this.queue.enqueue(execution);
      return execution;
    }

    if (this.approvals.needsApproval(definition.riskLevel)) {
      const approval = this.approvals.createRequest(
        execution.id,
        definition.id,
        definition.name,
        definition.riskLevel,
        definition.description,
        request.params,
        request.requestedBy,
      );
      execution.status = 'pending-approval';
      execution.approvalId = approval.id;
      this.queue.enqueue(execution);
      return execution;
    }

    this.queue.enqueue(execution);
    return execution;
  }

  async approveExecution(approvalId: string, decidedBy: string): Promise<ActionExecution | null> {
    const approval = this.approvals.approve(approvalId, decidedBy);
    if (!approval) return null;

    const execution = this.queue.getExecution(approval.executionId);
    if (execution && execution.status === 'pending-approval') {
      execution.status = 'queued';
    }
    return execution ?? null;
  }

  rejectExecution(approvalId: string, decidedBy: string, reason?: string): ApprovalRequest | null {
    const approval = this.approvals.reject(approvalId, decidedBy, reason);
    if (!approval) return null;

    const execution = this.queue.getExecution(approval.executionId);
    if (execution) {
      this.queue.cancel(execution.id);
    }
    return approval;
  }

  async processNext(): Promise<ActionExecution | null> {
    const execution = this.queue.dequeue();
    if (!execution) return null;

    const registered = this.registry.get(execution.actionId);
    if (!registered) {
      this.queue.fail(execution.id, 'Action no longer registered');
      return execution;
    }

    const controller = new AbortController();
    this.abortControllers.set(execution.id, controller);

    const context: ExecutionContext = {
      executionId: execution.id,
      userId: execution.requestedBy,
      abortSignal: controller.signal,
      attempt: execution.attempt,
    };

    const timeoutId = setTimeout(() => controller.abort(), registered.definition.timeout);

    try {
      const result = await registered.handler.execute(execution.params, context);
      clearTimeout(timeoutId);
      this.queue.complete(execution.id, result);
    } catch (err) {
      clearTimeout(timeoutId);
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.queue.fail(execution.id, errorMsg);
    } finally {
      this.abortControllers.delete(execution.id);
    }

    return this.queue.getExecution(execution.id) ?? execution;
  }

  async rollbackExecution(executionId: string): Promise<RollbackRecord | null> {
    const execution = this.queue.getExecution(executionId);
    if (!execution || !execution.result) return null;

    const registered = this.registry.get(execution.actionId);
    if (!registered) return null;

    const context: ExecutionContext = {
      executionId,
      userId: execution.requestedBy,
      abortSignal: new AbortController().signal,
      attempt: 1,
    };

    const record = await this.rollbacks.rollback(
      executionId,
      registered.handler,
      execution.params,
      execution.result,
      context,
    );

    if (record.status === 'completed') {
      execution.status = 'rolled-back';
      execution.rollbackId = record.id;
    }

    return record;
  }

  cancelExecution(executionId: string): boolean {
    const controller = this.abortControllers.get(executionId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(executionId);
    }
    return this.queue.cancel(executionId);
  }

  start(intervalMs = 1000): void {
    if (this.processingInterval) return;
    this.processingInterval = setInterval(async () => {
      await this.processNext();
    }, intervalMs);
  }

  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();
  }

  getStats(): ExecutionQueueStats & { registeredActions: number; pendingApprovals: number } {
    return {
      ...this.queue.getStats(),
      registeredActions: this.registry.count(),
      pendingApprovals: this.approvals.getPending().length,
    };
  }
}
