import { describe, it, expect } from 'vitest';

import { getDecisionHistory } from '../src/lib/ai/decision-history';

describe('Decision History', () => {
  it('adds an entry and retrieves it', () => {
    const store = getDecisionHistory();
    store.add({
      decision: 'Focus on high priority tasks',
      category: 'task',
      confidence: 85,
      outcome: 'pending',
      reasoning: 'Risk engine flagged overload',
    });
    const history = store.getHistory(10);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0]!.decision).toBe('Focus on high priority tasks');
  });

  it('assigns id and createdAt on add', () => {
    const store = getDecisionHistory();
    const entry = store.add({
      decision: 'Test',
      category: 'system',
      confidence: 70,
      outcome: 'pending',
      reasoning: 'test',
    });
    expect(entry.id).toBeTruthy();
    expect(entry.createdAt).toBeTruthy();
    expect(new Date(entry.createdAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('resolves outcome accepted', () => {
    const store = getDecisionHistory();
    const entry = store.add({
      decision: 'Archive stale tasks',
      category: 'task',
      confidence: 72,
      outcome: 'pending',
      reasoning: 'r',
    });
    const resolved = store.resolveOutcome(entry.id, 'accepted');
    expect(resolved).toBe(true);
    const found = store.getHistory(50).find((e) => e.id === entry.id);
    expect(found!.outcome).toBe('accepted');
  });

  it('resolves outcome rejected', () => {
    const store = getDecisionHistory();
    const entry = store.add({
      decision: 'Delegate X',
      category: 'task',
      confidence: 60,
      outcome: 'pending',
      reasoning: 'r',
    });
    store.resolveOutcome(entry.id, 'rejected');
    const found = store.getHistory(50).find((e) => e.id === entry.id);
    expect(found!.outcome).toBe('rejected');
  });

  it('returns false for resolveOutcome on non-pending entry', () => {
    const store = getDecisionHistory();
    const entry = store.add({
      decision: 'Test',
      category: 'task',
      confidence: 50,
      outcome: 'accepted',
      reasoning: 'r',
    });
    const result = store.resolveOutcome(entry.id, 'rejected');
    expect(result).toBe(false);
  });

  it('records actual outcome', () => {
    const store = getDecisionHistory();
    const entry = store.add({
      decision: 'Test',
      category: 'goal',
      confidence: 80,
      outcome: 'accepted',
      reasoning: 'r',
    });
    const ok = store.recordOutcome(entry.id, 'successful');
    expect(ok).toBe(true);
    const found = store.getHistory(50).find((e) => e.id === entry.id);
    expect(found!.actualResult).toBe('successful');
  });

  it('getLearningReport returns valid structure', () => {
    const store = getDecisionHistory();
    const report = store.getLearningReport();
    expect(typeof report.totalDecisions).toBe('number');
    expect(typeof report.accepted).toBe('number');
    expect(typeof report.rejected).toBe('number');
    expect(typeof report.acceptanceRate).toBe('number');
    expect(report.acceptanceRate).toBeGreaterThanOrEqual(0);
    expect(report.acceptanceRate).toBeLessThanOrEqual(100);
    expect(report.insight).toBeTruthy();
    expect(Array.isArray(report.topCategories)).toBe(true);
  });
});
