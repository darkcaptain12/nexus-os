import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base';
import type { ListResult } from './types';

interface ProjectRecord {
  id: string;
  name: string;
  description: string | null;
  status: string;
  goal_id: string | null;
  owner_id: string;
  color: string | null;
  icon: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class ProjectRepository extends BaseRepository<ProjectRecord> {
  constructor(db: SupabaseClient) {
    super(db, 'projects');
  }

  async findByOwner(ownerId: string, limit = 20): Promise<ListResult<ProjectRecord>> {
    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .eq('owner_id', ownerId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(limit);

    return { data: (data as ProjectRecord[]) ?? [], error: error?.message ?? null };
  }

  async getWithTasks(projectId: string) {
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

    return { project, tasks: tasks ?? [] };
  }
}
