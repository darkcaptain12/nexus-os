import { describe, it, expect } from 'vitest';
import { getCycleEngine } from '../src/lib/ai/orchestrator/cycle-engine';

describe('CycleEngine', () => {
  it('starts a cycle with correct initial values', () => {
    const ce = getCycleEngine();
    const id = crypto.randomUUID();
    const cycle = ce.startCycle(id);
    expect(cycle.id).toBe(id);
    expect(cycle.state).toBe('COLLECTING_CONTEXT');
    expect(cycle.decisionCount).toBe(0);
    expect(cycle.startAt).toBeTruthy();
  });

  it('getCurrent returns active cycle', () => {
    const ce = getCycleEngine();
    const id = crypto.randomUUID();
    ce.startCycle(id);
    const current = ce.getCurrent();
    expect(current?.id).toBe(id);
  });

  it('completeCycle sets finishAt and durationMs', () => {
    const ce = getCycleEngine();
    const id = crypto.randomUUID();
    ce.startCycle(id);
    const completed = ce.completeCycle(id, {
      decisionCount: 3,
      approvalCount: 1,
      executionCount: 0,
      failureCount: 0,
      confidenceAverage: 78,
      contextBuildMs: 120,
      pipelineMs: 45,
      stages: [],
      insight: 'test insight',
      state: 'IDLE',
    });
    expect(completed?.finishAt).toBeTruthy();
    expect(completed?.durationMs).toBeGreaterThanOrEqual(0);
    expect(completed?.decisionCount).toBe(3);
    expect(completed?.confidenceAverage).toBe(78);
  });

  it('completeCycle clears current', () => {
    const ce = getCycleEngine();
    const id = crypto.randomUUID();
    ce.startCycle(id);
    ce.completeCycle(id, {
      decisionCount: 0,
      approvalCount: 0,
      executionCount: 0,
      failureCount: 0,
      confidenceAverage: 0,
      contextBuildMs: 0,
      pipelineMs: 0,
      stages: [],
      state: 'IDLE',
    });
    // getCurrent now returns null unless another cycle was started
    const current = ce.getCurrent();
    expect(current?.id).not.toBe(id);
  });

  it('failCycle marks state as FAILED', () => {
    const ce = getCycleEngine();
    const id = crypto.randomUUID();
    ce.startCycle(id);
    ce.failCycle(id, 'DB timeout');
    const all = ce.getAll(5);
    const failed = all.find((c) => c.id === id);
    expect(failed?.state).toBe('FAILED');
    expect(failed?.insight).toContain('DB timeout');
  });

  it('getAll returns cycles newest-first', () => {
    const ce = getCycleEngine();
    const id1 = crypto.randomUUID();
    const id2 = crypto.randomUUID();
    ce.startCycle(id1);
    ce.startCycle(id2);
    const all = ce.getAll(2);
    expect(all[0]!.id).toBe(id2);
    expect(all[1]!.id).toBe(id1);
  });

  it('getAverageMetrics returns numeric values', () => {
    const ce = getCycleEngine();
    const id = crypto.randomUUID();
    ce.startCycle(id);
    ce.completeCycle(id, {
      decisionCount: 4,
      approvalCount: 1,
      executionCount: 0,
      failureCount: 0,
      confidenceAverage: 80,
      contextBuildMs: 100,
      pipelineMs: 50,
      stages: [],
      state: 'IDLE',
    });
    const avgs = ce.getAverageMetrics();
    expect(typeof avgs.avgDurationMs).toBe('number');
    expect(typeof avgs.avgConfidence).toBe('number');
    expect(avgs.totalCycles).toBeGreaterThanOrEqual(1);
  });
});
