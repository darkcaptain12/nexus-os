import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base';
import type { ListResult, RepositoryResult, PaginatedResult, PaginationParams } from './types';

export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  project_id: string | null;
  goal_id: string | null;
  assignee_id: string | null;
  parent_id: string | null;
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

export interface TaskFilters {
  status?: string;
  priority?: string;
  label?: string;
  projectId?: string;
  search?: string;
  dueBefore?: string;
  parentId?: string | null;
  preset?: 'today' | 'tomorrow' | 'this_week' | 'overdue' | 'no_deadline' | 'high_priority';
}

export interface TaskCommentRecord {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  edited_at: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface TaskActivityRecord {
  id: string;
  task_id: string;
  user_id: string | null;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export class TaskRepository extends BaseRepository<TaskRecord> {
  constructor(db: SupabaseClient) {
    super(db, 'tasks');
  }

  async findFiltered(
    filters: TaskFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<TaskRecord>> {
    return this.instrument('findFiltered', async () => {
      const page = pagination?.page ?? 1;
      const pageSize = pagination?.pageSize ?? 50;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = this.db
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .order('order_index', { ascending: true })
        .range(from, to);

      if (filters.parentId !== undefined) {
        if (filters.parentId === null) {
          query = query.is('parent_id', null);
        } else {
          query = query.eq('parent_id', filters.parentId);
        }
      }

      if (filters.status) query = query.eq('status', filters.status);
      if (filters.priority) query = query.eq('priority', filters.priority);
      if (filters.projectId) query = query.eq('project_id', filters.projectId);
      if (filters.dueBefore) query = query.lt('due_date', filters.dueBefore);
      if (filters.label) query = query.contains('labels', [filters.label]);
      if (filters.search) query = query.ilike('title', `%${filters.search}%`);

      if (filters.preset) {
        const now = new Date();
        const today = now.toISOString().split('T')[0]!;
        const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0]!;
        const weekEnd = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0]!;

        switch (filters.preset) {
          case 'today':
            query = query.gte('due_date', today).lt('due_date', tomorrow);
            break;
          case 'tomorrow':
            query = query
              .gte('due_date', tomorrow)
              .lt('due_date', new Date(now.getTime() + 2 * 86400000).toISOString().split('T')[0]!);
            break;
          case 'this_week':
            query = query.gte('due_date', today).lt('due_date', weekEnd);
            break;
          case 'overdue':
            query = query
              .lt('due_date', now.toISOString())
              .not('status', 'in', '("completed","cancelled")');
            break;
          case 'no_deadline':
            query = query.is('due_date', null);
            break;
          case 'high_priority':
            query = query.in('priority', ['critical', 'high']);
            break;
        }
      }

      const { data, error, count } = await query;
      const total = count ?? 0;

      return {
        data: error ? [] : ((data as TaskRecord[]) ?? []),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    });
  }

  async findSubtasks(parentId: string): Promise<ListResult<TaskRecord>> {
    return this.instrument('findSubtasks', async () => {
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('parent_id', parentId)
        .is('deleted_at', null)
        .order('order_index', { ascending: true });

      return { data: (data as TaskRecord[]) ?? [], error: error?.message ?? null };
    });
  }

  async findByStatus(status: string, limit = 20): Promise<ListResult<TaskRecord>> {
    return this.instrument('findByStatus', async () => {
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('status', status)
        .is('deleted_at', null)
        .order('order_index', { ascending: true })
        .limit(limit);

      return { data: (data as TaskRecord[]) ?? [], error: error?.message ?? null };
    });
  }

  async findOverdue(): Promise<ListResult<TaskRecord>> {
    return this.instrument('findOverdue', async () => {
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .is('deleted_at', null)
        .lt('due_date', new Date().toISOString())
        .not('status', 'in', '("completed","cancelled")')
        .order('due_date', { ascending: true });

      return { data: (data as TaskRecord[]) ?? [], error: error?.message ?? null };
    });
  }

  async findDueToday(): Promise<ListResult<TaskRecord>> {
    return this.instrument('findDueToday', async () => {
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
    });
  }

  async updateStatus(id: string, status: string): Promise<RepositoryResult<TaskRecord>> {
    return this.instrument('updateStatus', async () => {
      const updates: Record<string, unknown> = { status };
      if (status === 'completed') {
        updates['completed_at'] = new Date().toISOString();
      } else {
        updates['completed_at'] = null;
      }
      return this.update(id, updates as Partial<TaskRecord>);
    });
  }

  async updateLabels(id: string, labels: string[]): Promise<RepositoryResult<TaskRecord>> {
    return this.instrument('updateLabels', async () =>
      this.update(id, { labels } as Partial<TaskRecord>),
    );
  }

  async bulkUpdateStatus(
    ids: string[],
    status: string,
  ): Promise<{ updated: number; error: string | null }> {
    return this.instrument('bulkUpdateStatus', async () => {
      const updates: Record<string, unknown> = { status };
      if (status === 'completed') updates['completed_at'] = new Date().toISOString();

      const { data, error } = await this.db
        .from(this.tableName)
        .update(updates)
        .in('id', ids)
        .select('id');

      return { updated: data?.length ?? 0, error: error?.message ?? null };
    });
  }

  async bulkDelete(ids: string[]): Promise<{ deleted: number; error: string | null }> {
    return this.instrument('bulkDelete', async () => {
      const { data, error } = await this.db
        .from(this.tableName)
        .update({ deleted_at: new Date().toISOString() } as Record<string, unknown>)
        .in('id', ids)
        .select('id');

      return { deleted: data?.length ?? 0, error: error?.message ?? null };
    });
  }

  async bulkUpdatePriority(
    ids: string[],
    priority: string,
  ): Promise<{ updated: number; error: string | null }> {
    return this.instrument('bulkUpdatePriority', async () => {
      const { data, error } = await this.db
        .from(this.tableName)
        .update({ priority } as Record<string, unknown>)
        .in('id', ids)
        .select('id');

      return { updated: data?.length ?? 0, error: error?.message ?? null };
    });
  }

  async getSubtaskProgress(
    parentId: string,
  ): Promise<{ total: number; completed: number; percent: number }> {
    return this.instrument('getSubtaskProgress', async () => {
      const { data } = await this.db
        .from(this.tableName)
        .select('status')
        .eq('parent_id', parentId)
        .is('deleted_at', null);

      const total = data?.length ?? 0;
      const completed =
        data?.filter((t: { status: string }) => t.status === 'completed').length ?? 0;
      return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
    });
  }

  async getAllLabels(): Promise<string[]> {
    return this.instrument('getAllLabels', async () => {
      const { data } = await this.db.from(this.tableName).select('labels').is('deleted_at', null);

      const labelSet = new Set<string>();
      for (const row of data ?? []) {
        for (const label of (row as { labels: string[] }).labels) {
          labelSet.add(label);
        }
      }
      return [...labelSet].sort();
    });
  }

  async getSummary() {
    return this.instrument('getSummary', async () => {
      const statuses = ['pending', 'in_progress', 'completed', 'cancelled', 'failed', 'blocked'];
      const counts: Record<string, number> = {};

      for (const status of statuses) {
        counts[status] = await this.count({ status });
      }

      const overdue = await this.findOverdue();
      const dueToday = await this.findDueToday();
      const highPriority = await this.count({ priority: 'high' });
      const criticalPriority = await this.count({ priority: 'critical' });

      return {
        total: Object.values(counts).reduce((s, c) => s + c, 0),
        pending: counts['pending'] ?? 0,
        inProgress: counts['in_progress'] ?? 0,
        completed: counts['completed'] ?? 0,
        overdue: overdue.data.length,
        dueToday: dueToday.data.length,
        highPriority: highPriority + criticalPriority,
      };
    });
  }

  // --- Comments ---
  async addComment(
    taskId: string,
    userId: string,
    content: string,
  ): Promise<RepositoryResult<TaskCommentRecord>> {
    return this.instrument('addComment', async () => {
      const { data, error } = await this.db
        .from('task_comments')
        .insert({ task_id: taskId, user_id: userId, content } as Record<string, unknown>)
        .select()
        .single();

      return { data: data as TaskCommentRecord | null, error: error?.message ?? null };
    });
  }

  async getComments(taskId: string): Promise<ListResult<TaskCommentRecord>> {
    return this.instrument('getComments', async () => {
      const { data, error } = await this.db
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      return { data: (data as TaskCommentRecord[]) ?? [], error: error?.message ?? null };
    });
  }

  async deleteComment(commentId: string): Promise<RepositoryResult<TaskCommentRecord>> {
    return this.instrument('deleteComment', async () => {
      const { data, error } = await this.db
        .from('task_comments')
        .update({ deleted_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', commentId)
        .select()
        .single();

      return { data: data as TaskCommentRecord | null, error: error?.message ?? null };
    });
  }

  // --- Activity ---
  async logActivity(
    taskId: string,
    userId: string | null,
    action: string,
    field?: string,
    oldValue?: string,
    newValue?: string,
  ): Promise<void> {
    return this.instrument('logActivity', async () => {
      await this.db
        .from('task_activity')
        .insert({
          task_id: taskId,
          user_id: userId,
          action,
          field: field ?? null,
          old_value: oldValue ?? null,
          new_value: newValue ?? null,
        } as Record<string, unknown>);
    });
  }

  async getActivity(taskId: string, limit = 20): Promise<ListResult<TaskActivityRecord>> {
    return this.instrument('getActivity', async () => {
      const { data, error } = await this.db
        .from('task_activity')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return { data: (data as TaskActivityRecord[]) ?? [], error: error?.message ?? null };
    });
  }
}

export class GoalRepository extends BaseRepository<{
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
}> {
  constructor(db: SupabaseClient) {
    super(db, 'goals');
  }

  async getSummary() {
    return this.instrument('getSummary', async () => {
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
    });
  }
}
