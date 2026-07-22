import { describe, it, expect } from 'vitest';
import type {
  ProjectRecord,
  ProjectFilters,
  ProjectProgress,
  ProjectActivityRecord,
} from '../src/lib/repositories';

describe('ProjectFilters type', () => {
  it('accepts empty filters', () => {
    const filters: ProjectFilters = {};
    expect(filters).toEqual({});
  });

  it('accepts status filter', () => {
    const filters: ProjectFilters = { status: 'active' };
    expect(filters.status).toBe('active');
  });

  it('accepts priority filter', () => {
    const filters: ProjectFilters = { priority: 'high' };
    expect(filters.priority).toBe('high');
  });

  it('accepts search filter', () => {
    const filters: ProjectFilters = { search: 'nexus' };
    expect(filters.search).toBe('nexus');
  });

  it('accepts preset filters', () => {
    const presets: ProjectFilters['preset'][] = [
      'active',
      'completed',
      'archived',
      'recent',
      'high_priority',
    ];
    for (const preset of presets) {
      const filters: ProjectFilters = { preset };
      expect(filters.preset).toBe(preset);
    }
  });
});

describe('ProjectRecord type', () => {
  it('has required fields including new ones', () => {
    const project: ProjectRecord = {
      id: '1',
      name: 'Test',
      description: null,
      status: 'active',
      priority: 'normal',
      goal_id: null,
      owner_id: 'user-1',
      color: '#3b82f6',
      icon: null,
      start_date: '2026-01-01',
      end_date: '2026-06-30',
      metadata: {},
      created_at: '',
      updated_at: '',
      deleted_at: null,
      created_by: 'user-1',
    };
    expect(project.priority).toBe('normal');
    expect(project.start_date).toBe('2026-01-01');
    expect(project.end_date).toBe('2026-06-30');
    expect(project.color).toBe('#3b82f6');
  });
});

describe('ProjectProgress type', () => {
  it('calculates progress correctly', () => {
    const progress: ProjectProgress = {
      totalTasks: 10,
      completedTasks: 7,
      pendingTasks: 2,
      inProgressTasks: 1,
      overdueTasks: 0,
      percent: Math.round((7 / 10) * 100),
    };
    expect(progress.percent).toBe(70);
  });

  it('handles zero tasks', () => {
    const progress: ProjectProgress = {
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      inProgressTasks: 0,
      overdueTasks: 0,
      percent: 0,
    };
    expect(progress.percent).toBe(0);
  });
});

describe('ProjectActivityRecord type', () => {
  it('has required fields', () => {
    const activity: ProjectActivityRecord = {
      id: '1',
      project_id: 'proj-1',
      user_id: 'user-1',
      action: 'created',
      detail: 'Proje oluşturuldu',
      created_at: '',
    };
    expect(activity.action).toBe('created');
  });
});
