import { describe, it, expect } from 'vitest';
import { createAgent, cancelAgent } from '../src/lib/agents/agent-runtime';
import { runNextStep } from '../src/lib/agents/agent-runner';
import { getMemoryStore } from '../src/lib/memory/store';

const mockExecutor = async () => ({ ok: true });

describe('Agent Memory Integration', () => {
  it('createAgent adds timeline entry to MemoryStore', () => {
    const store = getMemoryStore();
    const before = store.getTimeline(undefined, undefined, 1000).length;
    createAgent({ name: 'MemoryTest', goal: 'Bildirim gönder' });
    const after = store.getTimeline(undefined, undefined, 1000).length;
    expect(after).toBeGreaterThan(before);
  });

  it('timeline entry includes agent name', () => {
    const store = getMemoryStore();
    createAgent({ name: 'UniqueAgentXYZ', goal: 'Test' });
    const entries = store.getTimeline(undefined, undefined, 1000);
    const found = entries.find((e) => e.title.includes('UniqueAgentXYZ'));
    expect(found).toBeDefined();
  });

  it('cancelAgent adds timeline entry', () => {
    const store = getMemoryStore();
    const agent = createAgent({ name: 'CancelMem', goal: 'Test' });
    const before = store.getTimeline(undefined, undefined, 1000).length;
    cancelAgent(agent.id);
    const after = store.getTimeline(undefined, undefined, 1000).length;
    expect(after).toBeGreaterThan(before);
  });

  it('completed step adds timeline entry', async () => {
    const store = getMemoryStore();
    const agent = createAgent({ name: 'StepMem', goal: 'Bildirim gönder' });
    const before = store.getTimeline(undefined, undefined, 1000).length;
    await runNextStep(agent.id, mockExecutor);
    const after = store.getTimeline(undefined, undefined, 1000).length;
    expect(after).toBeGreaterThan(before);
  });

  it('step timeline entry contains agentId in metadata', async () => {
    const store = getMemoryStore();
    const agent = createAgent({ name: 'MetaMem', goal: 'Bildirim gönder' });
    await runNextStep(agent.id, mockExecutor);
    const entries = store.getTimeline(undefined, undefined, 1000);
    const found = entries.find((e) => e.metadata?.['agentId'] === agent.id);
    expect(found).toBeDefined();
  });

  it('step result is stored in step.result', async () => {
    const agent = createAgent({ name: 'ResultStore', goal: 'Bildirim gönder' });
    await runNextStep(agent.id, mockExecutor);
    const step = agent.plan!.steps[0]!;
    expect(step.result).toEqual({ ok: true });
  });
});
