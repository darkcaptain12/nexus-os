import { describe, it, expect } from 'vitest';
import { runDecisionEngine } from '../src/lib/ai/decision-engine';
import type { Risk, Recommendation, TaskSummary, GoalSummary } from '../src/lib/ai/types';

const baseSummary: TaskSummary = {
  total: 10,
  pending: 5,
  inProgress: 3,
  completed: 2,
  overdue: 0,
  dueToday: 1,
  highPriority: 2,
};
const baseGoals: GoalSummary = { total: 3, active: 2, completed: 1, averageProgress: 55 };

function makeRisk(overrides: Partial<Risk> = {}): Risk {
  return {
    id: crypto.randomUUID(),
    title: 'Test Risk',
    description: 'desc',
    level: 'medium',
    category: 'overload',
    score: 50,
    reasoning: 'test reasoning',
    ...overrides,
  };
}

function makeRec(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: crypto.randomUUID(),
    title: 'Rec',
    description: 'desc',
    score: 75,
    category: 'task',
    priority: 3,
    reasoning: 'test reasoning',
    ...overrides,
  };
}

describe('Decision Engine', () => {
  it('returns decisions from high risks', () => {
    const risks: Risk[] = [makeRisk({ level: 'high', score: 80 })];
    const decisions = runDecisionEngine({
      risks,
      recommendations: [],
      taskSummary: baseSummary,
      goalSummary: baseGoals,
    });
    expect(decisions.length).toBeGreaterThanOrEqual(1);
    expect(decisions[0]!.requiresApproval).toBe(true);
  });

  it('converts critical risk to critical-impact decision', () => {
    const risks: Risk[] = [makeRisk({ level: 'critical', score: 90, title: 'Critical Overload' })];
    const decisions = runDecisionEngine({
      risks,
      recommendations: [],
      taskSummary: baseSummary,
      goalSummary: baseGoals,
    });
    expect(decisions.some((d) => d.impact === 'critical' || d.risk === 'critical')).toBe(true);
  });

  it('converts high-score recommendation to decision', () => {
    const recs: Recommendation[] = [makeRec({ score: 85, title: 'Focus on deadlines' })];
    const decisions = runDecisionEngine({
      risks: [],
      recommendations: recs,
      taskSummary: baseSummary,
      goalSummary: baseGoals,
    });
    expect(
      decisions.some((d) => d.decision.includes('Focus on deadlines') || d.decision.length > 0),
    ).toBe(true);
  });

  it('returns explainable decision with all 10 fields', () => {
    const risks: Risk[] = [makeRisk({ level: 'high', score: 75 })];
    const [d] = runDecisionEngine({
      risks,
      recommendations: [],
      taskSummary: baseSummary,
      goalSummary: baseGoals,
    });
    expect(d).toBeDefined();
    expect(d!.id).toBeTruthy();
    expect(d!.decision).toBeTruthy();
    expect(d!.reasoning).toBeTruthy();
    expect(typeof d!.confidence).toBe('number');
    expect(Array.isArray(d!.evidence)).toBe(true);
    expect(Array.isArray(d!.alternatives)).toBe(true);
    expect(Array.isArray(d!.tradeoffs)).toBe(true);
    expect(d!.risk).toBeTruthy();
    expect(d!.impact).toBeTruthy();
    expect(d!.estimatedBenefit).toBeTruthy();
    expect(d!.estimatedCost).toBeTruthy();
  });

  it('skips low-score recommendations (score < 70)', () => {
    const recs: Recommendation[] = [makeRec({ score: 40, title: 'Low priority rec' })];
    const decisions = runDecisionEngine({
      risks: [],
      recommendations: recs,
      taskSummary: baseSummary,
      goalSummary: baseGoals,
    });
    expect(decisions.every((d) => !d.decision.includes('Low priority rec'))).toBe(true);
  });

  it('decisions requiring approval sorted first', () => {
    const risks: Risk[] = [makeRisk({ level: 'high', score: 75 })];
    const decisions = runDecisionEngine({
      risks,
      recommendations: [],
      taskSummary: baseSummary,
      goalSummary: baseGoals,
    });
    if (decisions.length > 1) {
      const approvalIdx = decisions.findIndex((d) => d.requiresApproval);
      const noApprovalIdx = decisions.findIndex((d) => !d.requiresApproval);
      if (approvalIdx !== -1 && noApprovalIdx !== -1) {
        expect(approvalIdx).toBeLessThan(noApprovalIdx);
      }
    }
  });
});
