import { describe, it, expect } from 'vitest';
import { AgentScheduler } from '../src/lib/agents/agent-scheduler';

describe('AgentScheduler', () => {
  it('enqueue adds to queue', () => {
    const s = new AgentScheduler();
    s.enqueue('agent-1', 3);
    expect(s.getMetrics().queueLength).toBe(1);
  });

  it('dequeue picks highest priority (lowest number)', () => {
    const s = new AgentScheduler();
    s.enqueue('agent-low', 5);
    s.enqueue('agent-high', 1);
    s.enqueue('agent-mid', 3);
    const next = s.dequeue();
    expect(next).toBe('agent-high');
  });

  it('dequeue returns null if max concurrent reached', () => {
    const s = new AgentScheduler();
    s.enqueue('a1', 1);
    s.enqueue('a2', 1);
    s.enqueue('a3', 1);
    s.enqueue('a4', 1);
    s.markRunning(s.dequeue()!);
    s.markRunning(s.dequeue()!);
    s.markRunning(s.dequeue()!);
    expect(s.canRun()).toBe(false);
    expect(s.dequeue()).toBeNull();
  });

  it('markDone frees slot and increments processed', () => {
    const s = new AgentScheduler();
    s.enqueue('a1', 1);
    s.markRunning(s.dequeue()!);
    s.markDone('a1', 100);
    expect(s.getMetrics().runningCount).toBe(0);
    expect(s.getMetrics().totalProcessed).toBe(1);
  });

  it('markFailed increments failure count', () => {
    const s = new AgentScheduler();
    s.enqueue('a1', 1);
    s.markRunning(s.dequeue()!);
    s.markFailed('a1');
    expect(s.getMetrics().totalFailed).toBe(1);
    expect(s.getMetrics().runningCount).toBe(0);
  });

  it('duplicate enqueue is no-op', () => {
    const s = new AgentScheduler();
    s.enqueue('agent-1', 3);
    s.enqueue('agent-1', 3);
    expect(s.getMetrics().queueLength).toBe(1);
  });

  it('remove dequeues agent', () => {
    const s = new AgentScheduler();
    s.enqueue('agent-1', 3);
    s.remove('agent-1');
    expect(s.getMetrics().queueLength).toBe(0);
  });

  it('getMetrics returns correct structure', () => {
    const s = new AgentScheduler();
    const m = s.getMetrics();
    expect(typeof m.queueLength).toBe('number');
    expect(typeof m.runningCount).toBe('number');
    expect(typeof m.maxConcurrent).toBe('number');
    expect(m.maxConcurrent).toBe(3);
    expect(m.generatedAt).toBeTruthy();
  });

  it('averageRuntimeMs is 0 when no completions', () => {
    const s = new AgentScheduler();
    expect(s.getMetrics().averageRuntimeMs).toBe(0);
  });

  it('averageRuntimeMs computed from completed agents', () => {
    const s = new AgentScheduler();
    s.enqueue('a1', 1);
    s.enqueue('a2', 1);
    s.markRunning(s.dequeue()!);
    s.markDone('a1', 200);
    s.markRunning(s.dequeue()!);
    s.markDone('a2', 400);
    expect(s.getMetrics().averageRuntimeMs).toBe(300);
  });
});
