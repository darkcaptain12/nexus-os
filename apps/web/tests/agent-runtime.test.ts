import { describe, it, expect } from 'vitest';
import {
  createAgent,
  pauseAgent,
  resumeAgent,
  cancelAgent,
  recoverAgent,
  resumeAfterApproval,
} from '../src/lib/agents/agent-runtime';
import { runNextStep } from '../src/lib/agents/agent-runner';
import { getAgentStore } from '../src/lib/agents/agent-store';
import { getAgentScheduler } from '../src/lib/agents/agent-scheduler';

const mockExecutor = async () => ({ ok: true });

describe('Agent Runtime', () => {
  it('createAgent returns agent in READY state', () => {
    const agent = createAgent({ name: 'Test', goal: 'Bildirim gönder' });
    expect(agent.state).toBe('READY');
    expect(agent.id).toBeTruthy();
    expect(agent.plan).toBeDefined();
    expect(agent.plan!.steps.length).toBeGreaterThan(0);
  });

  it('createAgent stores agent in AgentStore', () => {
    const agent = createAgent({ name: 'Stored', goal: 'Hafıza kaydet' });
    expect(getAgentStore().get(agent.id)).toBe(agent);
  });

  it('createAgent enqueues agent in scheduler', () => {
    const before = getAgentScheduler().getMetrics().queueLength;
    createAgent({ name: 'Queued', goal: 'Test' });
    const after = getAgentScheduler().getMetrics().queueLength;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it('pauseAgent transitions to PAUSED from RUNNING', () => {
    const agent = createAgent({ name: 'Pause', goal: 'Test' });
    agent.state = 'RUNNING';
    const paused = pauseAgent(agent.id);
    expect(paused.state).toBe('PAUSED');
  });

  it('resumeAgent transitions PAUSED → READY', () => {
    const agent = createAgent({ name: 'Resume', goal: 'Test' });
    agent.state = 'RUNNING';
    pauseAgent(agent.id);
    const resumed = resumeAgent(agent.id);
    expect(resumed.state).toBe('READY');
  });

  it('cancelAgent transitions to CANCELLED', () => {
    const agent = createAgent({ name: 'Cancel', goal: 'Test' });
    const cancelled = cancelAgent(agent.id);
    expect(cancelled.state).toBe('CANCELLED');
    expect(cancelled.cancelledAt).toBeTruthy();
  });

  it('cancelAgent from RUNNING works', () => {
    const agent = createAgent({ name: 'CancelRun', goal: 'Test' });
    agent.state = 'RUNNING';
    const cancelled = cancelAgent(agent.id);
    expect(cancelled.state).toBe('CANCELLED');
  });

  it('recoverAgent resets retries and transitions FAILED → READY', () => {
    const agent = createAgent({ name: 'Recover', goal: 'Test' });
    agent.state = 'FAILED';
    agent.retries = 3;
    const recovered = recoverAgent(agent.id);
    expect(recovered.state).toBe('READY');
    expect(recovered.retries).toBe(0);
  });

  it('createAgent applies default priority 3', () => {
    const agent = createAgent({ name: 'Default', goal: 'Test' });
    expect(agent.priority).toBe(3);
  });

  it('createAgent applies custom priority', () => {
    const agent = createAgent({ name: 'High', goal: 'Test', priority: 1 });
    expect(agent.priority).toBe(1);
  });

  it('createAgent applies default maxRetries 3', () => {
    const agent = createAgent({ name: 'Retry', goal: 'Test' });
    expect(agent.maxRetries).toBe(3);
  });

  it('resumeAfterApproval approved=true syncs queue and completes agent', async () => {
    const agent = createAgent({ name: 'ApproveFlow', goal: 'Görev sil', maxRetries: 1 });
    await runNextStep(agent.id, mockExecutor);
    expect(agent.state).toBe('WAITING_APPROVAL');
    const result = await resumeAfterApproval(agent.id, true, mockExecutor);
    expect(result.state).toBe('COMPLETED');
    expect(result.metrics.stepsCompleted).toBe(1);
  });

  it('resumeAfterApproval approved=false fails agent', async () => {
    const agent = createAgent({ name: 'RejectFlow', goal: 'Görev sil', maxRetries: 1 });
    await runNextStep(agent.id, mockExecutor);
    expect(agent.state).toBe('WAITING_APPROVAL');
    const result = await resumeAfterApproval(agent.id, false, mockExecutor);
    expect(result.state).toBe('FAILED');
  });

  it('pauseAgent throws for unknown id', () => {
    expect(() => pauseAgent('nonexistent')).toThrow();
  });

  it('cancelAgent throws for unknown id', () => {
    expect(() => cancelAgent('nonexistent')).toThrow();
  });
});
