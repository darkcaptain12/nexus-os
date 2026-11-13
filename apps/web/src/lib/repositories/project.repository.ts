import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base';
import type { ListResult, RepositoryResult, PaginatedResult, PaginationParams } from './types';

export interface ProjectRecord {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  goal_id: string | null;
  owner_id: string;
  color: string | null;
  icon: string | null;
  start_date: string | null;
  end_date: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
}

export interface ProjectFilters {
  status?: string;
  priority?: string;
  search?: string;
  preset?: 'active' | 'completed' | 'archived' | 'recent' | 'high_priority';
}

export interface ProjectActivityRecord {
  id: string;
  project_id: string;
  user_id: string | null;
  action: string;
  detail: string | null;
  created_at: string;
}

export interface ProjectProgress {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  percent: number;
}

export class ProjectRepository extends BaseRepository<ProjectRecord> {
  constructor(db: SupabaseClient) {
    super(db, 'projects');
  }

  async findFiltered(
    filters: ProjectFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<ProjectRecord>> {
    return this.instrument('findFiltered', async () => {
      const page = pagination?.page ?? 1;
      const pageSize = pagination?.pageSize ?? 50;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = this.db
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .range(from, to);

      if (filters.status) query = query.eq('status', filters.status);
      if (filters.priority) query = query.eq('priority', filters.priority);
      if (filters.search) query = query.ilike('name', `%${filters.search}%`);

      if (filters.preset) {
        switch (filters.preset) {
          case 'active':
            query = query.eq('status', 'active');
            break;
          case 'completed':
            query = query.eq('status', 'completed');
            break;
          case 'archived':
            query = query.eq('status', 'archived');
            break;
          case 'recent':
            query = query.order('updated_at', { ascending: false }).limit(10);
            break;
          case 'high_priority':
            query = query.in('priority', ['critical', 'high']);
            break;
        }
      }

      const { data, error, count } = await query;
      const total = count ?? 0;

      return {
        data: error ? [] : ((data as ProjectRecord[]) ?? []),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    });
  }

  async findByOwner(ownerId: string, limit = 20): Promise<ListResult<ProjectRecord>> {
    return this.instrument('findByOwner', async () => {
      const { data, error } = await this.db
        .from(this.tableName)
        .select('*')
        .eq('owner_id', ownerId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(limit);

      return { data: (data as ProjectRecord[]) ?? [], error: error?.message ?? null };
    });
  }

  async getProgress(projectId: string): Promise<ProjectProgress> {
    return this.instrument('getProgress', async () => {
      const { data } = await this.db
        .from('tasks')
        .select('status, due_date')
        .eq('project_id', projectId)
        .is('deleted_at', null);

      const tasks = (data ?? []) as { status: string; due_date: string | null }[];
      const total = tasks.length;
      const completed = tasks.filter((t) => t.status === 'completed').length;
      const pending = tasks.filter((t) => t.status === 'pending').length;
      const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
      const overdue = tasks.filter(
        (t) =>
          t.due_date &&
          new Date(t.due_date) < new Date() &&
          t.status !== 'completed' &&
          t.status !== 'cancelled',
      ).length;

      return {
        totalTasks: total,
        completedTasks: completed,
        pendingTasks: pending,
        inProgressTasks: inProgress,
        overdueTasks: overdue,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
  }

  async getWithTasks(projectId: string) {
    return this.instrument('getWithTasks', async () => {
      const { data: project } = await this.db
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      const { data: tasks } = await this.db
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('order_index', { ascending: true });

      return { project: project as ProjectRecord | null, tasks: tasks ?? [] };
    });
  }

  async archive(id: string): Promise<RepositoryResult<ProjectRecord>> {
    return this.instrument('archive', async () =>
      this.update(id, { status: 'archived' } as Partial<ProjectRecord>),
    );
  }

  async restore(id: string): Promise<RepositoryResult<ProjectRecord>> {
    return this.instrument('restore', async () =>
      this.update(id, { status: 'active', deleted_at: null } as unknown as Partial<ProjectRecord>),
    );
  }

  async getSummary() {
    return this.instrument('getSummary', async () => {
      const active = await this.count({ status: 'active' });
      const planning = await this.count({ status: 'planning' });
      const completed = await this.count({ status: 'completed' });
      const archived = await this.count({ status: 'archived' });
      const onHold = await this.count({ status: 'on_hold' });

      return {
        total: active + planning + completed + archived + onHold,
        active,
        planning,
        completed,
        archived,
        onHold,
      };
    });
  }

  // --- Activity ---
  async logActivity(
    projectId: string,
    userId: string | null,
    action: string,
    detail?: string,
  ): Promise<void> {
    return this.instrument('logActivity', async () => {
      await this.db
        .from('project_activity')
        .insert({
          project_id: projectId,
          user_id: userId,
          action,
          detail: detail ?? null,
        } as Record<string, unknown>);
    });
  }

  async getActivity(projectId: string, limit = 20): Promise<ListResult<ProjectActivityRecord>> {
    return this.instrument('getActivity', async () => {
      const { data, error } = await this.db
        .from('project_activity')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return { data: (data as ProjectActivityRecord[]) ?? [], error: error?.message ?? null };
    });
  }
}
