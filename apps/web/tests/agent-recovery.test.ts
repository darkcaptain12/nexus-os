import { describe, it, expect } from 'vitest';
import {
  createAgent,
  cancelAgent,
  recoverAgent,
  pauseAgent,
  resumeAgent,
} from '../src/lib/agents/agent-runtime';
import { AgentLifecycle } from '../src/lib/agents/agent-state-machine';
import { runNextStep } from '../src/lib/agents/agent-runner';

const failExecutor = async () => {
  throw new Error('Simulated failure');
};
const mockExecutor = async () => ({ ok: true });

describe('Agent Recovery', () => {
  it('failed agent can be recovered and re-run', async () => {
    const agent = createAgent({ name: 'Recover', goal: 'Hafıza kaydet', maxRetries: 0 });
    agent.plan!.steps[0]!.requiresApproval = false;
    await runNextStep(agent.id, failExecutor);
    expect(agent.state).toBe('FAILED');

    recoverAgent(agent.id);
    expect(agent.state).toBe('READY');
    expect(agent.retries).toBe(0);
    expect(agent.errorMessage).toBeUndefined();
  });

  it('recovery resets failed step to pending', async () => {
    const agent = createAgent({ name: 'StepRecover', goal: 'Hafıza kaydet', maxRetries: 0 });
    agent.plan!.steps[0]!.requiresApproval = false;
    await runNextStep(agent.id, failExecutor);
    recoverAgent(agent.id);
    expect(agent.plan!.steps[0]!.status).toBe('pending');
    expect(agent.plan!.steps[0]!.error).toBeUndefined();
  });

  it('paused agent resumes to READY', () => {
    const agent = createAgent({ name: 'PauseResume', goal: 'Test' });
    agent.state = 'RUNNING';
    pauseAgent(agent.id);
    expect(agent.state).toBe('PAUSED');
    resumeAgent(agent.id);
    expect(agent.state).toBe('READY');
  });

  it('RETRYING state reached on first failure with retries', async () => {
    const agent = createAgent({ name: 'Retry', goal: 'Hafıza kaydet', maxRetries: 2 });
    agent.plan!.steps[0]!.requiresApproval = false;
    const result = await runNextStep(agent.id, failExecutor);
    expect(result.state).toBe('RETRYING');
    expect(result.retries).toBe(1);
    expect(result.metrics.retryCount).toBe(1);
  });

  it('FAILED after maxRetries exceeded', async () => {
    const agent = createAgent({ name: 'MaxFail', goal: 'Hafıza kaydet', maxRetries: 1 });
    agent.plan!.steps[0]!.requiresApproval = false;
    // First failure → RETRYING
    await runNextStep(agent.id, failExecutor);
    // Manually set to RUNNING for retry
    AgentLifecycle.transition(agent, 'RUNNING', 'retry');
    // Second failure → FAILED
    const result = await runNextStep(agent.id, failExecutor);
    expect(result.state).toBe('FAILED');
  });

  it('cancel from WAITING_APPROVAL works', async () => {
    const agent = createAgent({ name: 'ApprovalCancel', goal: 'Proje arşivle', maxRetries: 1 });
    await runNextStep(agent.id, mockExecutor);
    expect(agent.state).toBe('WAITING_APPROVAL');
    const cancelled = cancelAgent(agent.id);
    expect(cancelled.state).toBe('CANCELLED');
  });

  it('cancelled agent cannot be recovered', () => {
    const agent = createAgent({ name: 'CancelledRecover', goal: 'Test' });
    cancelAgent(agent.id);
    expect(() => recoverAgent(agent.id)).toThrow();
  });
});
