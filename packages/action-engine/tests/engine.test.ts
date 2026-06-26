import { describe, it, expect, beforeEach } from 'vitest';
import { ActionEngine } from '../src/engine';
import type { ActionDefinition, ActionHandler } from '../src/types';

function makeDef(overrides: Partial<ActionDefinition> = {}): ActionDefinition {
  return {
    id: overrides.id ?? 'test-action',
    name: overrides.name ?? 'Test Action',
    description: 'A test action',
    category: 'notification',
    riskLevel: overrides.riskLevel ?? 'low',
    permissions: [],
    timeout: 5000,
    rollbackCapable: overrides.rollbackCapable ?? false,
    parameters: overrides.parameters ?? [],
    metadata: {},
    ...overrides,
  };
}

function makeHandler(
  result: unknown = 'ok',
  opts?: { shouldFail?: boolean; rollback?: boolean },
): ActionHandler {
  return {
    execute: async () => {
      if (opts?.shouldFail) throw new Error('Handler error');
      return result;
    },
    rollback: opts?.rollback
      ? async () => {}
      : undefined,
  };
}

describe('ActionEngine', () => {
  let engine: ActionEngine;

  beforeEach(() => {
    engine = new ActionEngine(3);
  });

  it('registers and lists actions', () => {
    engine.registerAction(makeDef(), makeHandler());
    expect(engine.registry.count()).toBe(1);
    expect(engine.registry.list()).toHaveLength(1);
  });

  it('executes low-risk action immediately', async () => {
    engine.registerAction(makeDef({ riskLevel: 'low' }), makeHandler('done'));
    const execution = await engine.submit({
      actionId: 'test-action',
      params: {},
      requestedBy: 'user1',
      source: 'user',
      priority: 5,
    });

    expect(execution.status).toBe('queued');
    const result = await engine.processNext();
    expect(result?.status).toBe('completed');
    expect(result?.result).toBe('done');
  });

  it('requires approval for high-risk actions', async () => {
    engine.registerAction(makeDef({ id: 'risky', riskLevel: 'high' }), makeHandler());
    const execution = await engine.submit({
      actionId: 'risky',
      params: {},
      requestedBy: 'user1',
      source: 'user',
      priority: 5,
    });

    expect(execution.status).toBe('pending-approval');
    expect(execution.approvalId).toBeDefined();
  });

  it('AI never auto-executes critical actions', async () => {
    engine.registerAction(makeDef({ id: 'critical', riskLevel: 'critical' }), makeHandler());
    const execution = await engine.submit({
      actionId: 'critical',
      params: {},
      requestedBy: 'ai-agent',
      source: 'ai',
      priority: 5,
    });

    expect(execution.status).toBe('pending-approval');
  });

  it('AI never auto-executes high actions', async () => {
    engine.registerAction(makeDef({ id: 'high-ai', riskLevel: 'high' }), makeHandler());
    const execution = await engine.submit({
      actionId: 'high-ai',
      params: {},
      requestedBy: 'ai',
      source: 'ai',
      priority: 5,
    });

    expect(execution.status).toBe('pending-approval');
  });

  it('approve and execute workflow', async () => {
    engine.registerAction(makeDef({ id: 'approvable', riskLevel: 'high' }), makeHandler('approved-result'));

    const execution = await engine.submit({
      actionId: 'approvable',
      params: {},
      requestedBy: 'user1',
      source: 'user',
      priority: 5,
    });

    const approved = await engine.approveExecution(execution.approvalId!, 'admin');
    expect(approved?.status).toBe('queued');

    const result = await engine.processNext();
    expect(result?.status).toBe('completed');
  });

  it('reject cancels execution', () => {
    engine.registerAction(makeDef({ id: 'rejectable', riskLevel: 'high' }), makeHandler());

    engine.submit({
      actionId: 'rejectable',
      params: {},
      requestedBy: 'user1',
      source: 'user',
      priority: 5,
    }).then((execution) => {
      const approval = engine.rejectExecution(execution.approvalId!, 'admin', 'Too risky');
      expect(approval?.status).toBe('rejected');
    });
  });

  it('retries failed actions', async () => {
    let attempts = 0;
    engine.registerAction(makeDef({ id: 'flaky' }), {
      execute: async () => {
        attempts++;
        if (attempts < 3) throw new Error('retry');
        return 'finally';
      },
    });

    await engine.submit({ actionId: 'flaky', params: {}, requestedBy: 'u', source: 'user', priority: 5 });
    await engine.processNext();
    await engine.processNext();
    const result = await engine.processNext();

    expect(result?.status).toBe('completed');
    expect(attempts).toBe(3);
  });

  it('dead-letters after max retries', async () => {
    engine.registerAction(makeDef({ id: 'always-fail' }), makeHandler(null, { shouldFail: true }));

    await engine.submit({ actionId: 'always-fail', params: {}, requestedBy: 'u', source: 'user', priority: 5 });

    for (let i = 0; i < 4; i++) {
      await engine.processNext();
    }

    const dlq = engine.queue.getDeadLetterQueue();
    expect(dlq.length).toBeGreaterThan(0);
  });

  it('rollback completed action', async () => {
    engine.registerAction(
      makeDef({ id: 'rollbackable', rollbackCapable: true }),
      makeHandler('created', { rollback: true }),
    );

    await engine.submit({ actionId: 'rollbackable', params: {}, requestedBy: 'u', source: 'user', priority: 5 });
    await engine.processNext();

    const execution = engine.queue.getHistory(1)[0]!;
    const record = await engine.rollbackExecution(execution.id);
    expect(record?.status).toBe('completed');
  });

  it('cancel queued action', async () => {
    engine.registerAction(makeDef({ id: 'cancel-me' }), makeHandler());

    const execution = await engine.submit({ actionId: 'cancel-me', params: {}, requestedBy: 'u', source: 'user', priority: 5 });
    const cancelled = engine.cancelExecution(execution.id);
    expect(cancelled).toBe(true);
  });

  it('validates parameters', async () => {
    engine.registerAction(
      makeDef({ id: 'validated', parameters: [{ name: 'url', type: 'string', required: true, description: 'URL' }] }),
      makeHandler(),
    );

    await expect(
      engine.submit({ actionId: 'validated', params: {}, requestedBy: 'u', source: 'user', priority: 5 }),
    ).rejects.toThrow('Validation failed');
  });

  it('throws for unknown action', async () => {
    await expect(
      engine.submit({ actionId: 'nonexistent', params: {}, requestedBy: 'u', source: 'user', priority: 5 }),
    ).rejects.toThrow('Action not found');
  });

  it('reports stats', () => {
    engine.registerAction(makeDef(), makeHandler());
    const stats = engine.getStats();
    expect(stats.registeredActions).toBe(1);
    expect(stats.queued).toBe(0);
  });

  it('start and stop lifecycle', () => {
    engine.start(60000);
    engine.stop();
    expect(engine.getStats().running).toBe(0);
  });
});
