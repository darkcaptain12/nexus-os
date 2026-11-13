import { describe, it, expect } from 'vitest';
import { getExecutiveTimeline } from '../src/lib/ai/orchestrator/executive-timeline';
import type { ExecutiveTimelineEntry } from '../src/lib/ai/types';

function makeEntry(cycleId: string): ExecutiveTimelineEntry {
  return {
    cycleId,
    contextSummary: {
      taskCount: 10,
      projectCount: 3,
      goalCount: 2,
      riskScore: 40,
      productivityScore: 72,
      desktopActive: true,
    },
    decisions: [{ id: 'd1', decision: 'Test decision', confidence: 80, requiresApproval: true }],
    approvals: [{ id: 'a1', title: 'Test approval', status: 'pending' }],
    executions: [],
    learningInsight: 'Test insight',
    stages: [],
    startAt: new Date().toISOString(),
  };
}

describe('ExecutiveTimeline', () => {
  it('adds entry and retrieves it', () => {
    const tl = getExecutiveTimeline();
    const id = crypto.randomUUID();
    tl.add(makeEntry(id));
    const found = tl.getByCycleId(id);
    expect(found?.cycleId).toBe(id);
  });

  it('getLatest returns most recent', () => {
    const tl = getExecutiveTimeline();
    const id = crypto.randomUUID();
    tl.add(makeEntry(id));
    expect(tl.getLatest()?.cycleId).toBe(id);
  });

  it('update modifies existing entry', () => {
    const tl = getExecutiveTimeline();
    const id = crypto.randomUUID();
    tl.add(makeEntry(id));
    tl.update(id, { endAt: '2026-01-01T00:00:00Z', durationMs: 500 });
    const entry = tl.getByCycleId(id);
    expect(entry?.endAt).toBe('2026-01-01T00:00:00Z');
    expect(entry?.durationMs).toBe(500);
  });

  it('getAll returns entries newest-first', () => {
    const tl = getExecutiveTimeline();
    const id1 = crypto.randomUUID();
    const id2 = crypto.randomUUID();
    tl.add(makeEntry(id1));
    tl.add(makeEntry(id2));
    const all = tl.getAll(2);
    expect(all[0]!.cycleId).toBe(id2);
    expect(all[1]!.cycleId).toBe(id1);
  });

  it('getByCycleId returns undefined for missing id', () => {
    const tl = getExecutiveTimeline();
    expect(tl.getByCycleId('nonexistent')).toBeUndefined();
  });

  it('entry has correct structure', () => {
    const tl = getExecutiveTimeline();
    const id = crypto.randomUUID();
    tl.add(makeEntry(id));
    const entry = tl.getByCycleId(id);
    expect(entry?.contextSummary.taskCount).toBe(10);
    expect(entry?.decisions).toHaveLength(1);
    expect(entry?.approvals[0]!.status).toBe('pending');
    expect(entry?.learningInsight).toBe('Test insight');
  });
});
