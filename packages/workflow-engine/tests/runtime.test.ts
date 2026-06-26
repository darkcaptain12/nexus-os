import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowRuntime } from '../src/runtime/engine';
import type { Workflow, NodeHandler } from '../src/types';

function makeWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: overrides.id ?? 'wf-1',
    name: 'Test Workflow',
    description: 'Test',
    status: 'enabled',
    trigger: { type: 'manual', config: {} },
    nodes: overrides.nodes ?? [
      { id: 'n1', type: 'action', name: 'Step 1', handler: 'test.handler', config: {}, position: { x: 0, y: 0 }, timeout: 5000, retries: 1 },
    ],
    edges: overrides.edges ?? [],
    entryNodeId: overrides.entryNodeId ?? 'n1',
    variables: overrides.variables ?? {},
    timeout: 30000,
    maxRetries: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'test',
    tags: [],
    ...overrides,
  };
}

describe('WorkflowRuntime', () => {
  let runtime: WorkflowRuntime;

  beforeEach(() => {
    runtime = new WorkflowRuntime();
    runtime.registerHandler('test.handler', { execute: async () => 'ok' });
    runtime.registerHandler('fail.handler', { execute: async () => { throw new Error('fail'); } });
  });

  it('adds and lists workflows', () => {
    runtime.addWorkflow(makeWorkflow());
    expect(runtime.listWorkflows()).toHaveLength(1);
  });

  it('runs simple sequential workflow', async () => {
    runtime.addWorkflow(makeWorkflow());
    const exec = await runtime.run('wf-1', 'user');
    expect(exec.phase).toBe('completed');
    expect(exec.nodeResults).toHaveLength(1);
    expect(exec.nodeResults[0]!.status).toBe('completed');
  });

  it('runs multi-step sequential workflow', async () => {
    runtime.addWorkflow(makeWorkflow({
      nodes: [
        { id: 'n1', type: 'action', name: 'Step 1', handler: 'test.handler', config: {}, position: { x: 0, y: 0 }, timeout: 5000, retries: 1 },
        { id: 'n2', type: 'action', name: 'Step 2', handler: 'test.handler', config: {}, position: { x: 0, y: 100 }, timeout: 5000, retries: 1 },
      ],
      edges: [{ id: 'e1', from: 'n1', to: 'n2' }],
    }));

    const exec = await runtime.run('wf-1', 'user');
    expect(exec.phase).toBe('completed');
    expect(exec.nodeResults).toHaveLength(2);
  });

  it('handles failure', async () => {
    runtime.addWorkflow(makeWorkflow({
      nodes: [{ id: 'n1', type: 'action', name: 'Fail', handler: 'fail.handler', config: {}, position: { x: 0, y: 0 }, timeout: 5000, retries: 1 }],
    }));

    const exec = await runtime.run('wf-1', 'user');
    expect(exec.phase).toBe('failed');
    expect(exec.error).toContain('fail');
  });

  it('retries failed nodes', async () => {
    let attempts = 0;
    runtime.registerHandler('flaky', {
      execute: async () => {
        attempts++;
        if (attempts < 3) throw new Error('retry');
        return 'recovered';
      },
    });

    runtime.addWorkflow(makeWorkflow({
      nodes: [{ id: 'n1', type: 'action', name: 'Flaky', handler: 'flaky', config: {}, position: { x: 0, y: 0 }, timeout: 5000, retries: 3 }],
    }));

    const exec = await runtime.run('wf-1', 'user');
    expect(exec.phase).toBe('completed');
    expect(attempts).toBe(3);
  });

  it('executes delay node', async () => {
    runtime.addWorkflow(makeWorkflow({
      nodes: [{ id: 'n1', type: 'delay', name: 'Wait', handler: '', config: { delayMs: 50 }, position: { x: 0, y: 0 }, timeout: 5000, retries: 1 }],
    }));

    const start = Date.now();
    const exec = await runtime.run('wf-1', 'user');
    expect(exec.phase).toBe('completed');
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
  });

  it('executes decision node', async () => {
    runtime.addWorkflow(makeWorkflow({
      variables: { mode: 'fast' },
      nodes: [
        { id: 'n1', type: 'decision', name: 'Check Mode', handler: '', config: { field: 'mode', value: 'fast' }, position: { x: 0, y: 0 }, timeout: 5000, retries: 1 },
        { id: 'n2', type: 'action', name: 'Fast Path', handler: 'test.handler', config: {}, position: { x: 100, y: 100 }, timeout: 5000, retries: 1 },
        { id: 'n3', type: 'action', name: 'Slow Path', handler: 'test.handler', config: {}, position: { x: -100, y: 100 }, timeout: 5000, retries: 1 },
      ],
      edges: [
        { id: 'e1', from: 'n1', to: 'n2', condition: 'true' },
        { id: 'e2', from: 'n1', to: 'n3', condition: 'false' },
      ],
    }));

    const exec = await runtime.run('wf-1', 'user');
    expect(exec.phase).toBe('completed');
    const fastNode = exec.nodeResults.find((n) => n.nodeName === 'Fast Path');
    expect(fastNode).toBeDefined();
  });

  it('passes variables between nodes', async () => {
    runtime.registerHandler('set.var', {
      execute: async (_config, ctx) => {
        ctx.variables['output'] = 42;
        return 42;
      },
    });
    runtime.registerHandler('read.var', {
      execute: async (_config, ctx) => {
        return ctx.variables['output'];
      },
    });

    runtime.addWorkflow(makeWorkflow({
      nodes: [
        { id: 'n1', type: 'action', name: 'Set', handler: 'set.var', config: {}, position: { x: 0, y: 0 }, timeout: 5000, retries: 1 },
        { id: 'n2', type: 'action', name: 'Read', handler: 'read.var', config: {}, position: { x: 0, y: 100 }, timeout: 5000, retries: 1 },
      ],
      edges: [{ id: 'e1', from: 'n1', to: 'n2' }],
    }));

    const exec = await runtime.run('wf-1', 'user');
    expect(exec.phase).toBe('completed');
    expect(exec.nodeResults[1]!.output).toBe(42);
  });

  it('cancels running workflow', async () => {
    runtime.registerHandler('slow', {
      execute: async (_config, ctx) => {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 10000);
          ctx.abortSignal.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('aborted')); });
        });
      },
    });

    runtime.addWorkflow(makeWorkflow({
      nodes: [{ id: 'n1', type: 'action', name: 'Slow', handler: 'slow', config: {}, position: { x: 0, y: 0 }, timeout: 60000, retries: 1 }],
    }));

    const execPromise = runtime.run('wf-1', 'user');
    setTimeout(() => runtime.cancel(runtime.getRunning()[0]!.id), 50);
    const exec = await execPromise;
    expect(['cancelled', 'failed']).toContain(exec.phase);
  });

  it('throws for disabled workflow', async () => {
    runtime.addWorkflow(makeWorkflow({ status: 'disabled' }));
    await expect(runtime.run('wf-1', 'user')).rejects.toThrow('disabled');
  });

  it('throws for unknown workflow', async () => {
    await expect(runtime.run('nonexistent', 'user')).rejects.toThrow('not found');
  });

  it('tracks execution history', async () => {
    runtime.addWorkflow(makeWorkflow());
    await runtime.run('wf-1', 'user');
    await runtime.run('wf-1', 'user');
    expect(runtime.getHistory('wf-1')).toHaveLength(2);
  });

  it('reports stats', () => {
    runtime.addWorkflow(makeWorkflow());
    const stats = runtime.getStats();
    expect(stats.totalWorkflows).toBe(1);
    expect(stats.registeredHandlers).toBeGreaterThan(0);
  });
});
