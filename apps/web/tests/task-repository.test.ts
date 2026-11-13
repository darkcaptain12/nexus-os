import { describe, it, expect } from 'vitest';
import type {
  TaskFilters,
  TaskRecord,
  TaskCommentRecord,
  TaskActivityRecord,
} from '../src/lib/repositories';

describe('TaskFilters type', () => {
  it('accepts empty filters', () => {
    const filters: TaskFilters = {};
    expect(filters).toEqual({});
  });

  it('accepts status filter', () => {
    const filters: TaskFilters = { status: 'pending' };
    expect(filters.status).toBe('pending');
  });

  it('accepts priority filter', () => {
    const filters: TaskFilters = { priority: 'high' };
    expect(filters.priority).toBe('high');
  });

  it('accepts search filter', () => {
    const filters: TaskFilters = { search: 'deploy' };
    expect(filters.search).toBe('deploy');
  });

  it('accepts combined filters', () => {
    const filters: TaskFilters = {
      status: 'in_progress',
      priority: 'critical',
      search: 'api',
      projectId: 'proj-123',
      dueBefore: '2026-07-01',
    };
    expect(Object.keys(filters)).toHaveLength(5);
  });

  it('accepts label filter', () => {
    const filters: TaskFilters = { label: 'bug' };
    expect(filters.label).toBe('bug');
  });

  it('accepts parentId filter for subtasks', () => {
    const filters: TaskFilters = { parentId: 'task-123' };
    expect(filters.parentId).toBe('task-123');
  });

  it('accepts null parentId for root tasks only', () => {
    const filters: TaskFilters = { parentId: null };
    expect(filters.parentId).toBeNull();
  });

  it('accepts preset filters', () => {
    const presets: TaskFilters['preset'][] = [
      'today',
      'tomorrow',
      'this_week',
      'overdue',
      'no_deadline',
      'high_priority',
    ];
    for (const preset of presets) {
      const filters: TaskFilters = { preset };
      expect(filters.preset).toBe(preset);
    }
  });
});

describe('TaskRecord type', () => {
  it('has required fields', () => {
    const task: TaskRecord = {
      id: '1',
      title: 'Test',
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
      created_at: '',
      updated_at: '',
      deleted_at: null,
      created_by: null,
    };
    expect(task.id).toBe('1');
    expect(task.parent_id).toBeNull();
  });

  it('supports subtask via parent_id', () => {
    const subtask: TaskRecord = {
      id: '2',
      title: 'Subtask',
      description: null,
      status: 'pending',
      priority: 'normal',
      project_id: null,
      goal_id: null,
      assignee_id: null,
      parent_id: 'parent-1',
      due_date: null,
      completed_at: null,
      labels: ['bug'],
      order_index: 1,
      metadata: {},
      created_at: '',
      updated_at: '',
      deleted_at: null,
      created_by: null,
    };
    expect(subtask.parent_id).toBe('parent-1');
    expect(subtask.labels).toContain('bug');
  });
});

describe('TaskCommentRecord type', () => {
  it('has required fields', () => {
    const comment: TaskCommentRecord = {
      id: '1',
      task_id: 'task-1',
      user_id: 'user-1',
      content: 'Hello',
      edited_at: null,
      created_at: '',
      deleted_at: null,
    };
    expect(comment.task_id).toBe('task-1');
  });
});

describe('TaskActivityRecord type', () => {
  it('has required fields', () => {
    const activity: TaskActivityRecord = {
      id: '1',
      task_id: 'task-1',
      user_id: 'user-1',
      action: 'created',
      field: null,
      old_value: null,
      new_value: null,
      created_at: '',
    };
    expect(activity.action).toBe('created');
  });

  it('tracks field changes', () => {
    const activity: TaskActivityRecord = {
      id: '2',
      task_id: 'task-1',
      user_id: 'user-1',
      action: 'updated',
      field: 'status',
      old_value: 'pending',
      new_value: 'completed',
      created_at: '',
    };
    expect(activity.field).toBe('status');
    expect(activity.old_value).toBe('pending');
    expect(activity.new_value).toBe('completed');
  });
});
