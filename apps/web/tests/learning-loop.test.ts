import { describe, it, expect } from 'vitest';
import {
  recordCycleDecisions,
  generateCycleLearning,
} from '../src/lib/ai/orchestrator/learning-loop';
import type { ExplainableDecision } from '../src/lib/ai/types';

function makeDecision(overrides: Partial<ExplainableDecision> = {}): ExplainableDecision {
  return {
    id: crypto.randomUUID(),
    decision: 'Test decision',
    reasoning: 'Test reasoning',
    confidence: 75,
    evidence: ['evidence 1'],
    alternatives: [],
    tradeoffs: ['tradeoff'],
    risk: 'medium',
    impact: 'medium',
    estimatedBenefit: 'benefit',
    estimatedCost: 'cost',
    category: 'task',
    requiresApproval: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Learning Loop', () => {
  it('recordCycleDecisions adds to history', () => {
    const cycleId = crypto.randomUUID();
    const decisions = [makeDecision(), makeDecision({ confidence: 90 })];
    expect(() => recordCycleDecisions(cycleId, decisions)).not.toThrow();
  });

  it('generateCycleLearning returns valid structure', () => {
    const cycleId = crypto.randomUUID();
    const decisions = [makeDecision({ requiresApproval: true }), makeDecision()];
    recordCycleDecisions(cycleId, decisions);
    const learning = generateCycleLearning(cycleId, decisions);
    expect(learning.cycleId).toBe(cycleId);
    expect(learning.decisionsAdded).toBe(2);
    expect(['improving', 'declining', 'stable']).toContain(learning.acceptanceRateTrend);
    expect(learning.topInsight).toBeTruthy();
    expect(learning.generatedAt).toBeTruthy();
  });

  it('empty decisions returns empty insight', () => {
    const cycleId = crypto.randomUUID();
    const learning = generateCycleLearning(cycleId, []);
    expect(learning.decisionsAdded).toBe(0);
    expect(learning.topInsight).toContain('Karar üretilmedi');
  });

  it('decisions with requiresApproval get approval-mention in insight', () => {
    const cycleId = crypto.randomUUID();
    const decisions = [
      makeDecision({ requiresApproval: true }),
      makeDecision({ requiresApproval: true }),
    ];
    const learning = generateCycleLearning(cycleId, decisions);
    expect(learning.topInsight).toContain('onay');
  });

  it('decisions without requiresApproval get auto-mention in insight', () => {
    const cycleId = crypto.randomUUID();
    const decisions = [
      makeDecision({ requiresApproval: false }),
      makeDecision({ requiresApproval: false }),
    ];
    const learning = generateCycleLearning(cycleId, decisions);
    expect(learning.topInsight).toContain('otomatik');
  });
});
