import { describe, it, expect } from 'vitest';
import { AgentStore } from '../src/lib/agents/agent-store';
import type { AgentRecord } from '../src/lib/agents/types';

function makeAgent(overrides: Partial<AgentRecord> = {}): AgentRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: 'Test Agent',
    goal: 'Test goal',
    state: 'READY',
    memoryRef: `mem:${crypto.randomUUID()}`,
    retries: 0,
    maxRetries: 3,
    priority: 3,
    createdAt: now,
    updatedAt: now,
    metrics: {
      runtimeMs: 0,
      retryCount: 0,
      approvalWaitMs: 0,
      workflowDurationMs: 0,
      stepCount: 0,
      stepsCompleted: 0,
      stepsFailed: 0,
    },
    ...overrides,
  };
}

describe('AgentStore', () => {
  it('add and get agent', () => {
    const store = new AgentStore();
    const agent = makeAgent();
    store.add(agent);
    expect(store.get(agent.id)).toBe(agent);
  });

  it('get returns null for missing id', () => {
    const store = new AgentStore();
    expect(store.get('nonexistent')).toBeNull();
  });

  it('update modifies agent', () => {
    const store = new AgentStore();
    const agent = makeAgent();
    store.add(agent);
    const updated = store.update(agent.id, { name: 'Updated Name' });
    expect(updated?.name).toBe('Updated Name');
    expect(store.get(agent.id)?.name).toBe('Updated Name');
  });

  it('update returns null for missing id', () => {
    const store = new AgentStore();
    expect(store.update('nonexistent', { name: 'x' })).toBeNull();
  });

  it('getAll returns newest-first', () => {
    const store = new AgentStore();
    const a1 = makeAgent();
    const a2 = makeAgent();
    store.add(a1);
    store.add(a2);
    const all = store.getAll(2);
    expect(all[0]!.id).toBe(a2.id);
    expect(all[1]!.id).toBe(a1.id);
  });

  it('getByState filters correctly', () => {
    const store = new AgentStore();
    store.add(makeAgent({ state: 'RUNNING' }));
    store.add(makeAgent({ state: 'PAUSED' }));
    store.add(makeAgent({ state: 'RUNNING' }));
    expect(store.getByState('RUNNING')).toHaveLength(2);
    expect(store.getByState('PAUSED')).toHaveLength(1);
  });

  it('remove deletes agent', () => {
    const store = new AgentStore();
    const agent = makeAgent();
    store.add(agent);
    expect(store.remove(agent.id)).toBe(true);
    expect(store.get(agent.id)).toBeNull();
  });

  it('getMetrics counts by state', () => {
    const store = new AgentStore();
    store.add(makeAgent({ state: 'RUNNING' }));
    store.add(makeAgent({ state: 'COMPLETED' }));
    store.add(makeAgent({ state: 'FAILED' }));
    const m = store.getMetrics();
    expect(m.total).toBe(3);
    expect(m.byState.RUNNING).toBe(1);
    expect(m.byState.COMPLETED).toBe(1);
    expect(m.byState.FAILED).toBe(1);
  });

  it('getMetrics successRate = 0 when no terminal agents', () => {
    const store = new AgentStore();
    store.add(makeAgent({ state: 'RUNNING' }));
    const m = store.getMetrics();
    expect(m.successRate).toBe(100);
  });

  it('getMetrics successRate = 50% when half completed', () => {
    const store = new AgentStore();
    store.add(makeAgent({ state: 'COMPLETED' }));
    store.add(makeAgent({ state: 'FAILED' }));
    const m = store.getMetrics();
    expect(m.successRate).toBe(50);
  });
});
