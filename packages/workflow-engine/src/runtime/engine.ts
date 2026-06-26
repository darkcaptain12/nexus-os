import type {
  Workflow,
  WorkflowExecution,
  NodeExecutionResult,
  WorkflowEdge,
  ExecutionContext,
  NodeHandler,
} from '../types';

export class WorkflowRuntime {
  private workflows = new Map<string, Workflow>();
  private executions: WorkflowExecution[] = [];
  private handlers = new Map<string, NodeHandler>();
  private activeControllers = new Map<string, AbortController>();

  registerHandler(name: string, handler: NodeHandler): void {
    this.handlers.set(name, handler);
  }

  addWorkflow(workflow: Workflow): void {
    this.workflows.set(workflow.id, workflow);
  }

  removeWorkflow(workflowId: string): void {
    this.workflows.delete(workflowId);
  }

  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  listWorkflows(): Workflow[] {
    return [...this.workflows.values()];
  }

  async run(workflowId: string, actor: string, inputVars?: Record<string, unknown>): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);
    if (workflow.status !== 'enabled' && workflow.status !== 'draft') {
      throw new Error(`Workflow is ${workflow.status}`);
    }

    const controller = new AbortController();
    const execution: WorkflowExecution = {
      id: crypto.randomUUID(),
      workflowId,
      workflowName: workflow.name,
      phase: 'running',
      trigger: workflow.trigger.type,
      variables: { ...workflow.variables, ...inputVars },
      nodeResults: [],
      startedAt: new Date().toISOString(),
      actor,
    };

    this.activeControllers.set(execution.id, controller);
    this.executions.push(execution);

    const context: ExecutionContext = {
      workflowId,
      executionId: execution.id,
      variables: execution.variables,
      nodeResults: new Map(),
      abortSignal: controller.signal,
    };

    const timeoutId = setTimeout(() => controller.abort(), workflow.timeout);

    try {
      await this.executeNode(workflow.entryNodeId, workflow, context, execution);
      execution.phase = 'completed';
    } catch (err) {
      execution.phase = controller.signal.aborted ? 'cancelled' : 'failed';
      execution.error = err instanceof Error ? err.message : String(err);
    } finally {
      clearTimeout(timeoutId);
      execution.completedAt = new Date().toISOString();
      execution.durationMs = new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime();
      this.activeControllers.delete(execution.id);
    }

    return execution;
  }

  cancel(executionId: string): boolean {
    const controller = this.activeControllers.get(executionId);
    if (!controller) return false;
    controller.abort();
    return true;
  }

  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.find((e) => e.id === executionId);
  }

  getHistory(workflowId?: string, limit = 50): WorkflowExecution[] {
    let execs = [...this.executions];
    if (workflowId) execs = execs.filter((e) => e.workflowId === workflowId);
    return execs.sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, limit);
  }

  getRunning(): WorkflowExecution[] {
    return this.executions.filter((e) => e.phase === 'running');
  }

  getStats() {
    const today = new Date().toISOString().split('T')[0]!;
    const todayExecs = this.executions.filter((e) => e.startedAt.startsWith(today));
    return {
      totalWorkflows: this.workflows.size,
      enabledWorkflows: [...this.workflows.values()].filter((w) => w.status === 'enabled').length,
      running: this.getRunning().length,
      todayExecutions: todayExecs.length,
      todayFailures: todayExecs.filter((e) => e.phase === 'failed').length,
      totalExecutions: this.executions.length,
      registeredHandlers: this.handlers.size,
    };
  }

  private async executeNode(
    nodeId: string,
    workflow: Workflow,
    context: ExecutionContext,
    execution: WorkflowExecution,
  ): Promise<void> {
    if (context.abortSignal.aborted) throw new Error('Execution cancelled');

    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (!node) throw new Error(`Node not found: ${nodeId}`);

    const result: NodeExecutionResult = {
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      status: 'running',
      startedAt: new Date().toISOString(),
      attempt: 1,
    };
    execution.nodeResults.push(result);

    if (node.type === 'delay') {
      const delayMs = (node.config['delayMs'] as number) ?? 1000;
      await new Promise((r) => setTimeout(r, Math.min(delayMs, 30000)));
      result.status = 'completed';
      result.completedAt = new Date().toISOString();
      result.durationMs = delayMs;
    } else if (node.type === 'parallel') {
      const nextNodes = this.getNextNodes(nodeId, workflow.edges);
      await Promise.all(nextNodes.map((nId) => this.executeNode(nId, workflow, context, execution)));
      result.status = 'completed';
      result.completedAt = new Date().toISOString();
      return;
    } else if (node.type === 'decision') {
      const conditionField = node.config['field'] as string;
      const conditionValue = node.config['value'];
      const actual = context.variables[conditionField];
      const edges = workflow.edges.filter((e) => e.from === nodeId);
      const matchedEdge = edges.find((e) => e.condition === String(actual === conditionValue));
      const fallbackEdge = edges.find((e) => !e.condition || e.condition === 'default');
      const nextEdge = matchedEdge ?? fallbackEdge;

      result.status = 'completed';
      result.output = { matched: nextEdge?.to };
      result.completedAt = new Date().toISOString();

      if (nextEdge) {
        await this.executeNode(nextEdge.to, workflow, context, execution);
      }
      return;
    } else {
      const handler = this.handlers.get(node.handler);
      if (!handler) {
        result.status = 'failed';
        result.error = `Handler not found: ${node.handler}`;
        result.completedAt = new Date().toISOString();
        throw new Error(result.error);
      }

      let lastError: string | undefined;
      for (let attempt = 1; attempt <= Math.max(node.retries, 1); attempt++) {
        result.attempt = attempt;
        try {
          const output = await handler.execute(node.config, context);
          result.status = 'completed';
          result.output = output;
          context.nodeResults.set(nodeId, output);
          context.variables[`node_${nodeId}_result`] = output;
          lastError = undefined;
          break;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          if (attempt >= node.retries) {
            result.status = 'failed';
            result.error = lastError;
          }
        }
      }

      result.completedAt = new Date().toISOString();
      result.durationMs = new Date(result.completedAt).getTime() - new Date(result.startedAt).getTime();

      if (result.status === 'failed') throw new Error(lastError);
    }

    const nextNodes = this.getNextNodes(nodeId, workflow.edges);
    for (const nextId of nextNodes) {
      await this.executeNode(nextId, workflow, context, execution);
    }
  }

  private getNextNodes(nodeId: string, edges: WorkflowEdge[]): string[] {
    return edges.filter((e) => e.from === nodeId && !e.condition).map((e) => e.to);
  }
}
