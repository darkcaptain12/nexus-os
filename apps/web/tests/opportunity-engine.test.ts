import { describe, it, expect } from 'vitest';
import { findOpportunities } from '../src/lib/ai/opportunity-engine';
import type { TaskRecord, ProjectRecord, ProjectProgress } from '../src/lib/repositories';
import type { TaskSummary } from '../src/lib/ai/types';

function makeTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: crypto.randomUUID(),
    title: 'Task',
    description: null,
    status: 'todo',
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
    name: 'Project',
    description: null,
    status: 'active',
    priority: 'normal',
    goal_id: null,
    owner_id: 'u1',
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

const baseSummary: TaskSummary = {
  total: 10,
  pending: 5,
  inProgress: 2,
  completed: 3,
  overdue: 0,
  dueToday: 1,
  highPriority: 1,
};

describe('Opportunity Engine', () => {
  it('detects near-completion project', () => {
    const project = makeProject({ name: 'Alpha' });
    const progress: ProjectProgress = {
      totalTasks: 10,
      completedTasks: 9,
      pendingTasks: 0,
      inProgressTasks: 1,
      overdueTasks: 0,
      percent: 90,
    };
    const opps = findOpportunities({
      tasks: [],
      projects: [{ project, progress }],
      taskSummary: baseSummary,
      productivityScore: 70,
    });
    expect(opps.some((o) => o.category === 'completion')).toBe(true);
  });

  it('detects quick wins when 3+ low-priority deadline-free tasks exist', () => {
    const tasks = Array.from({ length: 4 }, () => makeTask({ priority: 'low', due_date: null }));
    const opps = findOpportunities({
      tasks,
      projects: [],
      taskSummary: baseSummary,
      productivityScore: 60,
    });
    expect(opps.some((o) => o.category === 'quick_win')).toBe(true);
  });

  it('detects automation opportunity for stale tasks', () => {
    const staleDate = new Date(Date.now() - 20 * 86400000).toISOString();
    const tasks = [makeTask({ updated_at: staleDate }), makeTask({ updated_at: staleDate })];
    const opps = findOpportunities({
      tasks,
      projects: [],
      taskSummary: baseSummary,
      productivityScore: 60,
    });
    expect(opps.some((o) => o.category === 'automation')).toBe(true);
  });

  it('detects delegation opportunity for high workload', () => {
    const summary: TaskSummary = { ...baseSummary, pending: 12, inProgress: 6, highPriority: 8 };
    const opps = findOpportunities({
      tasks: [],
      projects: [],
      taskSummary: summary,
      productivityScore: 60,
    });
    expect(opps.some((o) => o.category === 'delegation')).toBe(true);
  });

  it('detects acceleration when productivity >= 75 and few active tasks', () => {
    const summary: TaskSummary = { ...baseSummary, inProgress: 2 };
    const opps = findOpportunities({
      tasks: [],
      projects: [],
      taskSummary: summary,
      productivityScore: 80,
    });
    expect(opps.some((o) => o.category === 'acceleration')).toBe(true);
  });

  it('returns sorted by opportunityScore descending', () => {
    const project = makeProject({ name: 'X' });
    const progress: ProjectProgress = {
      totalTasks: 10,
      completedTasks: 9,
      pendingTasks: 0,
      inProgressTasks: 1,
      overdueTasks: 0,
      percent: 95,
    };
    const tasks = Array.from({ length: 4 }, () => makeTask({ priority: 'low', due_date: null }));
    const opps = findOpportunities({
      tasks,
      projects: [{ project, progress }],
      taskSummary: baseSummary,
      productivityScore: 80,
    });
    for (let i = 1; i < opps.length; i++) {
      expect(opps[i - 1]!.opportunityScore).toBeGreaterThanOrEqual(opps[i]!.opportunityScore);
    }
  });
});
