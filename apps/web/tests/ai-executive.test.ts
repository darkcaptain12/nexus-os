import { describe, it, expect } from 'vitest';
import { analyzeRisks, calculateOverallRiskScore } from '../src/lib/ai/risk-engine';
import { calculateProductivity } from '../src/lib/ai/productivity';
import { generateDailyPlan, generateWeeklyReview } from '../src/lib/ai/planner';
import { buildAIContext } from '../src/lib/ai/context-builder';
import type { TaskRecord, ProjectRecord, ProjectProgress } from '../src/lib/repositories';

function makeTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: crypto.randomUUID(),
    title: 'Test Task',
    description: null,
    status: 'pending',
    priority: 'normal',
    project_id: null,
    goal_id: null,
    assignee_id: null,
    parent_id: null,
    due_date: null,
    completed_at: null,
    labels: [],
    order_index: 0,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    created_by: null,
    ...overrides,
  };
}

function makeProject(overrides: Partial<ProjectRecord> = {}): ProjectRecord {
  return {
    id: crypto.randomUUID(),
    name: 'Test Project',
    description: null,
    status: 'active',
    priority: 'normal',
    goal_id: null,
    owner_id: 'user-1',
    color: null,
    icon: null,
    start_date: null,
    end_date: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    created_by: null,
    ...overrides,
  };
}

function makeProgress(overrides: Partial<ProjectProgress> = {}): ProjectProgress {
  return {
    totalTasks: 10,
    completedTasks: 5,
    pendingTasks: 3,
    inProgressTasks: 2,
    overdueTasks: 0,
    percent: 50,
    ...overrides,
  };
}

describe('Risk Engine', () => {
  it('detects overdue tasks', () => {
    const tasks = [
      makeTask({ due_date: new Date(Date.now() - 5 * 86400000).toISOString(), status: 'pending' }),
    ];
    const risks = analyzeRisks(tasks, [], {
      total: 1,
      pending: 1,
      inProgress: 0,
      completed: 0,
      overdue: 1,
      dueToday: 0,
      highPriority: 0,
    });
    expect(risks.some((r) => r.category === 'deadline')).toBe(true);
  });

  it('detects stale tasks', () => {
    const tasks = [makeTask({ updated_at: new Date(Date.now() - 10 * 86400000).toISOString() })];
    const risks = analyzeRisks(tasks, [], {
      total: 1,
      pending: 1,
      inProgress: 0,
      completed: 0,
      overdue: 0,
      dueToday: 0,
      highPriority: 0,
    });
    expect(risks.some((r) => r.category === 'stale')).toBe(true);
  });

  it('detects overload', () => {
    const risks = analyzeRisks([], [], {
      total: 25,
      pending: 15,
      inProgress: 10,
      completed: 0,
      overdue: 0,
      dueToday: 0,
      highPriority: 0,
    });
    expect(risks.some((r) => r.category === 'overload')).toBe(true);
  });

  it('detects project risk', () => {
    const projects = [
      { project: makeProject(), progress: makeProgress({ overdueTasks: 5, totalTasks: 10 }) },
    ];
    const risks = analyzeRisks([], projects, {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
      dueToday: 0,
      highPriority: 0,
    });
    expect(risks.some((r) => r.category === 'project')).toBe(true);
  });

  it('sorts by score descending', () => {
    const tasks = [
      makeTask({ due_date: new Date(Date.now() - 2 * 86400000).toISOString(), status: 'pending' }),
      makeTask({ due_date: new Date(Date.now() - 10 * 86400000).toISOString(), status: 'pending' }),
    ];
    const risks = analyzeRisks(tasks, [], {
      total: 2,
      pending: 2,
      inProgress: 0,
      completed: 0,
      overdue: 2,
      dueToday: 0,
      highPriority: 0,
    });
    if (risks.length >= 2) {
      expect(risks[0]!.score).toBeGreaterThanOrEqual(risks[1]!.score);
    }
  });

  it('calculates overall risk score', () => {
    expect(calculateOverallRiskScore([])).toBe(0);
    expect(
      calculateOverallRiskScore([
        {
          id: '1',
          title: '',
          description: '',
          level: 'high',
          category: 'deadline',
          score: 80,
          reasoning: '',
        },
      ]),
    ).toBe(80);
  });
});

describe('Productivity Score', () => {
  it('calculates score from 0-100', () => {
    const result = calculateProductivity(
      {
        total: 10,
        pending: 3,
        inProgress: 2,
        completed: 5,
        overdue: 1,
        dueToday: 1,
        highPriority: 2,
      },
      [makeProgress()],
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('has breakdown factors', () => {
    const result = calculateProductivity(
      {
        total: 10,
        pending: 3,
        inProgress: 2,
        completed: 5,
        overdue: 0,
        dueToday: 0,
        highPriority: 0,
      },
      [],
    );
    expect(result.breakdown.length).toBe(5);
    expect(result.breakdown.every((b) => b.weight > 0)).toBe(true);
  });

  it('detects trend', () => {
    const result = calculateProductivity(
      {
        total: 10,
        pending: 0,
        inProgress: 0,
        completed: 10,
        overdue: 0,
        dueToday: 0,
        highPriority: 0,
      },
      [],
      30,
    );
    expect(result.trend).toBe('improving');
  });

  it('handles empty data', () => {
    const result = calculateProductivity(
      {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
        dueToday: 0,
        highPriority: 0,
      },
      [],
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

describe('Daily Planner', () => {
  it('generates plan for tasks', () => {
    const tasks = [
      makeTask({ title: 'Critical', priority: 'critical', status: 'pending' }),
      makeTask({ title: 'Normal', priority: 'normal', status: 'in_progress' }),
    ];
    const plan = generateDailyPlan(tasks);
    expect(plan.slots.length).toBeGreaterThan(0);
    expect(plan.slots[0]!.taskTitle).toBe('Critical');
  });

  it('handles empty tasks', () => {
    const plan = generateDailyPlan([]);
    expect(plan.slots).toHaveLength(0);
    expect(plan.totalEstimatedMinutes).toBe(0);
  });

  it('limits to working hours', () => {
    const tasks = Array.from({ length: 15 }, (_, i) =>
      makeTask({ title: `Task ${i}`, status: 'pending' }),
    );
    const plan = generateDailyPlan(tasks);
    const lastSlot = plan.slots[plan.slots.length - 1];
    if (lastSlot) {
      expect(lastSlot.endHour).toBeLessThanOrEqual(19);
    }
  });

  it('includes reasoning', () => {
    const tasks = [
      makeTask({ due_date: new Date(Date.now() - 86400000).toISOString(), status: 'pending' }),
    ];
    const plan = generateDailyPlan(tasks);
    expect(plan.slots[0]!.reasoning).toContain('Gecikmiş');
  });
});

describe('Weekly Review', () => {
  it('generates review', () => {
    const review = generateWeeklyReview(
      {
        total: 20,
        pending: 5,
        inProgress: 3,
        completed: 10,
        overdue: 2,
        dueToday: 1,
        highPriority: 3,
      },
      [{ name: 'Project A', percent: 70 }],
      75,
    );
    expect(review.completedTasks).toBe(10);
    expect(review.productivityScore).toBe(75);
    expect(review.nextWeekFocus.length).toBeGreaterThan(0);
  });
});

describe('Context Builder', () => {
  it('builds context from data', () => {
    const tasks = [makeTask({ title: 'Active Task', status: 'in_progress' })];
    const projects = [
      { project: makeProject({ name: 'Active Project' }), progress: makeProgress() },
    ];
    const context = buildAIContext(tasks, projects, {
      total: 1,
      pending: 0,
      inProgress: 1,
      completed: 0,
      overdue: 0,
      dueToday: 0,
      highPriority: 0,
    });

    expect(context.tasks.recent.length).toBe(1);
    expect(context.projects.active.length).toBe(1);
    expect(context.productivityScore).toBeGreaterThanOrEqual(0);
  });
});
