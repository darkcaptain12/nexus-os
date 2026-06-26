import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base';
import type { ListResult } from './types';

interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  project_id: string | null;
  goal_id: string | null;
  assignee_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  labels: string[];
  order_index: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
}

interface GoalRecord {
  id: string;
  title: string;
  description: string | null;
  status: string;
  target_date: string | null;
  progress: number;
  owner_id: string;
  priority: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class TaskRepository extends BaseRepository<TaskRecord> {
  constructor(db: SupabaseClient) {
    super(db, 'tasks');
  }

  async findByStatus(status: string, limit = 20): Promise<ListResult<TaskRecord>> {
    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .eq('status', status)
      .is('deleted_at', null)
      .order('order_index', { ascending: true })
      .limit(limit);

    return { data: (data as TaskRecord[]) ?? [], error: error?.message ?? null };
  }

  async findOverdue(): Promise<ListResult<TaskRecord>> {
    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .is('deleted_at', null)
      .lt('due_date', new Date().toISOString())
      .not('status', 'in', '("completed","cancelled")')
      .order('due_date', { ascending: true });

    return { data: (data as TaskRecord[]) ?? [], error: error?.message ?? null };
  }

  async findDueToday(): Promise<ListResult<TaskRecord>> {
    const today = new Date().toISOString().split('T')[0]!;
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]!;

    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .is('deleted_at', null)
      .gte('due_date', today)
      .lt('due_date', tomorrow)
      .not('status', 'in', '("completed","cancelled")');

    return { data: (data as TaskRecord[]) ?? [], error: error?.message ?? null };
  }

  async getSummary() {
    const statuses = ['pending', 'in_progress', 'completed', 'cancelled', 'failed', 'blocked'];
    const counts: Record<string, number> = {};

    for (const status of statuses) {
      counts[status] = await this.count({ status });
    }

    const overdue = await this.findOverdue();
    const dueToday = await this.findDueToday();
    const highPriority = await this.count({ priority: 'high' });

    return {
      total: Object.values(counts).reduce((s, c) => s + c, 0),
      pending: counts['pending'] ?? 0,
      inProgress: counts['in_progress'] ?? 0,
      completed: counts['completed'] ?? 0,
      overdue: overdue.data.length,
      dueToday: dueToday.data.length,
      highPriority,
    };
  }
}

export class GoalRepository extends BaseRepository<GoalRecord> {
  constructor(db: SupabaseClient) {
    super(db, 'goals');
  }

  async getSummary() {
    const active = await this.count({ status: 'active' });
    const completed = await this.count({ status: 'completed' });
    const total = active + completed;

    const { data } = await this.db
      .from(this.tableName)
      .select('progress')
      .eq('status', 'active')
      .is('deleted_at', null);

    const avgProgress = data?.length
      ? data.reduce((s: number, g: { progress: number }) => s + g.progress, 0) / data.length
      : 0;

    return { total, active, completed, averageProgress: avgProgress };
  }
}
