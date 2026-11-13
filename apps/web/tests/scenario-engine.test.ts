import { describe, it, expect } from 'vitest';
import { simulateScenario } from '../src/lib/ai/scenario-engine';
import type { ScenarioInput } from '../src/lib/ai/types';
import type { ScenarioContext } from '../src/lib/ai/scenario-engine';
import type { ProjectProgress } from '../src/lib/repositories';

const baseProgress: ProjectProgress = {
  totalTasks: 10,
  completedTasks: 5,
  pendingTasks: 3,
  inProgressTasks: 2,
  overdueTasks: 0,
  percent: 50,
};

const baseCtx: ScenarioContext = {
  taskSummary: {
    total: 10,
    pending: 4,
    inProgress: 3,
    completed: 3,
    overdue: 0,
    dueToday: 1,
    highPriority: 2,
  },
  productivityScore: 70,
  projectProgresses: [{ name: 'Alpha', percent: 60, progress: baseProgress }],
  riskScore: 40,
};

describe('Scenario Engine', () => {
  it('simulates task_postponed', () => {
    const input: ScenarioInput = {
      type: 'task_postponed',
      subjectTitle: 'Design review',
      description: 'Postpone design review',
    };
    const result = simulateScenario(input, baseCtx);
    expect(result.scenario).toContain('Design review');
    expect(result.risk).toBeGreaterThanOrEqual(0);
    expect(result.benefit).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.recommendedAction).toBeTruthy();
  });

  it('simulates project_first', () => {
    const input: ScenarioInput = {
      type: 'project_first',
      subjectTitle: 'Alpha',
      description: 'Focus on Alpha project',
    };
    const result = simulateScenario(input, baseCtx);
    expect(result.scenario).toContain('Alpha');
    expect(typeof result.benefit).toBe('number');
  });

  it('simulates delegate', () => {
    const input: ScenarioInput = {
      type: 'delegate',
      subjectTitle: 'QA testing',
      description: 'Delegate QA testing',
    };
    const result = simulateScenario(input, baseCtx);
    expect(result.risk).toBeGreaterThanOrEqual(0);
    expect(result.risk).toBeLessThanOrEqual(100);
  });

  it('simulates change_plan', () => {
    const input: ScenarioInput = { type: 'change_plan', description: 'Switch to weekly sprints' };
    const result = simulateScenario(input, baseCtx);
    expect(result.scenario).toContain('Switch to weekly sprints');
  });

  it('high risk ctx increases postpone risk', () => {
    const highRiskCtx: ScenarioContext = {
      ...baseCtx,
      riskScore: 80,
      taskSummary: { ...baseCtx.taskSummary, overdue: 5 },
    };
    const input: ScenarioInput = { type: 'task_postponed', description: 'Postpone something' };
    const result = simulateScenario(input, highRiskCtx);
    expect(result.risk).toBeGreaterThan(40);
  });

  it('includes simulatedAt timestamp', () => {
    const input: ScenarioInput = { type: 'change_plan', description: 'test' };
    const result = simulateScenario(input, baseCtx);
    expect(() => new Date(result.simulatedAt)).not.toThrow();
  });

  it('returns keyFactors array', () => {
    const input: ScenarioInput = { type: 'delegate', description: 'test' };
    const result = simulateScenario(input, baseCtx);
    expect(Array.isArray(result.keyFactors)).toBe(true);
    expect(result.keyFactors.length).toBeGreaterThan(0);
  });
});
