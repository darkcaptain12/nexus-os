import { describe, it, expect } from 'vitest';
import { prioritizeGoals } from '../src/lib/ai/goal-prioritizer';
import type { GoalRecord } from '../src/lib/ai/types';

function makeGoal(overrides: Partial<GoalRecord> = {}): GoalRecord {
  return {
    id: crypto.randomUUID(),
    title: 'Goal',
    description: null,
    status: 'active',
    target_date: null,
    progress: 50,
    owner_id: 'u1',
    priority: 'normal',
    tags: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  };
}

describe('Goal Prioritizer', () => {
  it('returns empty array for empty input', () => {
    expect(prioritizeGoals([])).toEqual([]);
  });

  it('filters out non-active/planning goals', () => {
    const goals = [makeGoal({ status: 'completed' }), makeGoal({ status: 'active' })];
    const result = prioritizeGoals(goals);
    expect(result).toHaveLength(1);
  });

  it('goal with overdue deadline ranks higher', () => {
    const overdue = makeGoal({
      target_date: new Date(Date.now() - 86400000).toISOString(),
      priority: 'normal',
    });
    const future = makeGoal({
      target_date: new Date(Date.now() + 30 * 86400000).toISOString(),
      priority: 'normal',
    });
    const [first] = prioritizeGoals([future, overdue]);
    expect(first!.goalId).toBe(overdue.id);
  });

  it('critical priority scores higher than low priority (same deadline)', () => {
    const critical = makeGoal({ priority: 'critical', target_date: null });
    const low = makeGoal({ priority: 'low', target_date: null });
    const [first] = prioritizeGoals([low, critical]);
    expect(first!.goalId).toBe(critical.id);
  });

  it('returns PrioritizedGoal with all required fields', () => {
    const [result] = prioritizeGoals([makeGoal()]);
    expect(result).toBeDefined();
    expect(result!.goalId).toBeTruthy();
    expect(result!.title).toBeTruthy();
    expect(typeof result!.priorityScore).toBe('number');
    expect(Array.isArray(result!.scoreBreakdown)).toBe(true);
    expect(result!.scoreBreakdown).toHaveLength(5);
    expect(result!.actionRecommendation).toBeTruthy();
  });

  it('priorityScore is capped at 100', () => {
    const goal = makeGoal({
      priority: 'critical',
      target_date: new Date(Date.now() - 1).toISOString(),
      progress: 0,
    });
    const [result] = prioritizeGoals([goal]);
    expect(result!.priorityScore).toBeLessThanOrEqual(100);
  });

  it('sorted descending by priorityScore', () => {
    const goals = [
      makeGoal({ priority: 'low' }),
      makeGoal({ priority: 'critical' }),
      makeGoal({ priority: 'high' }),
    ];
    const result = prioritizeGoals(goals);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1]!.priorityScore).toBeGreaterThanOrEqual(result[i]!.priorityScore);
    }
  });
});
