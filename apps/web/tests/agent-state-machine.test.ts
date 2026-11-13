import { describe, it, expect } from 'vitest';
import {
  AgentLifecycle,
  VALID_AGENT_TRANSITIONS,
  TERMINAL_STATES,
} from '../src/lib/agents/agent-state-machine';
import type { AgentRecord } from '../src/lib/agents/types';

function makeAgent(overrides: Partial<AgentRecord> = {}): AgentRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: 'Test Agent',
    goal: 'Test goal',
    state: 'CREATED',
    memoryRef: 'mem:test',
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

describe('AgentLifecycle', () => {
  it('CREATED → READY is valid', () => {
    expect(AgentLifecycle.canTransition('CREATED', 'READY')).toBe(true);
  });

  it('CREATED → RUNNING is invalid', () => {
    expect(AgentLifecycle.canTransition('CREATED', 'RUNNING')).toBe(false);
  });

  it('READY → RUNNING is valid', () => {
    expect(AgentLifecycle.canTransition('READY', 'RUNNING')).toBe(true);
  });

  it('RUNNING → COMPLETED is valid', () => {
    expect(AgentLifecycle.canTransition('RUNNING', 'COMPLETED')).toBe(true);
  });

  it('RUNNING → WAITING_APPROVAL is valid', () => {
    expect(AgentLifecycle.canTransition('RUNNING', 'WAITING_APPROVAL')).toBe(true);
  });

  it('WAITING_APPROVAL → RUNNING is valid (approved)', () => {
    expect(AgentLifecycle.canTransition('WAITING_APPROVAL', 'RUNNING')).toBe(true);
  });

  it('PAUSED → READY is valid (resume)', () => {
    expect(AgentLifecycle.canTransition('PAUSED', 'READY')).toBe(true);
  });

  it('FAILED → READY is valid (recovery)', () => {
    expect(AgentLifecycle.canTransition('FAILED', 'READY')).toBe(true);
  });

  it('COMPLETED is terminal', () => {
    expect(AgentLifecycle.isTerminal('COMPLETED')).toBe(true);
  });

  it('CANCELLED is terminal', () => {
    expect(AgentLifecycle.isTerminal('CANCELLED')).toBe(true);
  });

  it('RUNNING is not terminal', () => {
    expect(AgentLifecycle.isTerminal('RUNNING')).toBe(false);
  });

  it('transition updates agent.state and updatedAt', () => {
    const agent = makeAgent();
    AgentLifecycle.transition(agent, 'READY');
    expect(agent.state).toBe('READY');
    expect(agent.updatedAt).toBeTruthy();
  });

  it('transition to RUNNING sets startedAt', () => {
    const agent = makeAgent({ state: 'READY' });
    AgentLifecycle.transition(agent, 'RUNNING');
    expect(agent.startedAt).toBeTruthy();
  });

  it('transition to COMPLETED sets completedAt', () => {
    const agent = makeAgent({ state: 'RUNNING' });
    AgentLifecycle.transition(agent, 'COMPLETED');
    expect(agent.completedAt).toBeTruthy();
  });

  it('transition to FAILED sets failedAt and errorMessage', () => {
    const agent = makeAgent({ state: 'RUNNING' });
    AgentLifecycle.transition(agent, 'FAILED', 'DB error');
    expect(agent.failedAt).toBeTruthy();
    expect(agent.errorMessage).toBe('DB error');
  });

  it('transition to CANCELLED sets cancelledAt', () => {
    const agent = makeAgent({ state: 'RUNNING' });
    AgentLifecycle.transition(agent, 'CANCELLED');
    expect(agent.cancelledAt).toBeTruthy();
  });

  it('invalid transition throws', () => {
    const agent = makeAgent();
    expect(() => AgentLifecycle.transition(agent, 'COMPLETED')).toThrow();
    expect(agent.state).toBe('CREATED');
  });

  it('tryTransition returns false on invalid', () => {
    const agent = makeAgent();
    const result = AgentLifecycle.tryTransition(agent, 'COMPLETED');
    expect(result).toBe(false);
    expect(agent.state).toBe('CREATED');
  });

  it('tryTransition returns true on valid', () => {
    const agent = makeAgent();
    expect(AgentLifecycle.tryTransition(agent, 'READY')).toBe(true);
  });

  it('COMPLETED → anything is invalid (terminal)', () => {
    expect(VALID_AGENT_TRANSITIONS.COMPLETED).toHaveLength(0);
  });

  it('CANCELLED → anything is invalid (terminal)', () => {
    expect(VALID_AGENT_TRANSITIONS.CANCELLED).toHaveLength(0);
  });

  it('TERMINAL_STATES contains COMPLETED and CANCELLED', () => {
    expect(TERMINAL_STATES).toContain('COMPLETED');
    expect(TERMINAL_STATES).toContain('CANCELLED');
  });
});
