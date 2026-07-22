import { describe, it, expect } from 'vitest';
import { runNextStep } from '../src/lib/agents/agent-runner';
import { createAgent } from '../src/lib/agents/agent-runtime';

const mockExecutor = async () => ({ ok: true });
const failExecutor = async () => {
  throw new Error('Step failed');
};

describe('Agent Runner', () => {
  it('runs a non-approval step and advances index', async () => {
    const agent = createAgent({ name: 'Test', goal: 'Hafıza kaydet', maxRetries: 1 });
    const result = await runNextStep(agent.id, mockExecutor);
    expect(result.plan!.currentStepIndex).toBeGreaterThan(0);
  });

  it('sets step status to done on success', async () => {
    const agent = createAgent({ name: 'Test', goal: 'Hafıza kaydet', maxRetries: 1 });
    await runNextStep(agent.id, mockExecutor);
    const step = agent.plan!.steps[0]!;
    expect(step.status).toBe('done');
  });

  it('transitions to WAITING_APPROVAL when step requires approval', async () => {
    const agent = createAgent({ name: 'Test', goal: 'Görev sil', maxRetries: 1 });
    const result = await runNextStep(agent.id, mockExecutor);
    expect(result.state).toBe('WAITING_APPROVAL');
    expect(result.approvalId).toBeTruthy();
  });

  it('sets step status to waiting_approval', async () => {
    const agent = createAgent({ name: 'Test', goal: 'Proje arşivle', maxRetries: 1 });
    await runNextStep(agent.id, mockExecutor);
    const step = agent.plan!.steps[0]!;
    expect(step.status).toBe('waiting_approval');
  });

  it('on step failure → transitions to RETRYING when retries remain', async () => {
    const agent = createAgent({ name: 'Fail Test', goal: 'Hafıza kaydet', maxRetries: 2 });
    agent.plan!.steps[0]!.requiresApproval = false;
    const result = await runNextStep(agent.id, failExecutor);
    expect(result.state).toBe('RETRYING');
    expect(result.retries).toBe(1);
  });

  it('on step failure → transitions to FAILED when maxRetries=0', async () => {
    const agent = createAgent({ name: 'Fail Max', goal: 'Hafıza kaydet', maxRetries: 0 });
    agent.plan!.steps[0]!.requiresApproval = false;
    const result = await runNextStep(agent.id, failExecutor);
    expect(result.state).toBe('FAILED');
  });

  it('returns COMPLETED when all non-approval steps done', async () => {
    const agent = createAgent({ name: 'Done', goal: 'Hafıza kaydet', maxRetries: 1 });
    let result = agent;
    for (let i = 0; i < agent.plan!.totalSteps + 1; i++) {
      if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(result.state)) break;
      result = await runNextStep(agent.id, mockExecutor);
    }
    expect(result.state).toBe('COMPLETED');
  });

  it('throws for unknown agent id', async () => {
    await expect(runNextStep('nonexistent', mockExecutor)).rejects.toThrow();
  });

  it('returns agent immediately if terminal', async () => {
    const agent = createAgent({ name: 'Done', goal: 'Test', maxRetries: 1 });
    agent.state = 'COMPLETED';
    const result = await runNextStep(agent.id, mockExecutor);
    expect(result.state).toBe('COMPLETED');
  });

  it('metrics stepsCompleted increments on success', async () => {
    const agent = createAgent({ name: 'Metrics', goal: 'Bildirim gönder', maxRetries: 1 });
    await runNextStep(agent.id, mockExecutor);
    expect(agent.metrics.stepsCompleted).toBe(1);
  });
});
