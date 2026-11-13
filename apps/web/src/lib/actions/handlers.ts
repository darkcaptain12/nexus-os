import type { ActionHandler } from '@apex-os/action-engine';
import { createClient } from '@/lib/supabase/server';
import { createRepositories } from '@/lib/repositories';

async function getRepos() {
  const supabase = await createClient();
  return { supabase, repos: createRepositories(supabase) };
}

export const taskCreateHandler: ActionHandler = {
  async execute(params: Record<string, unknown>) {
    const { repos } = await getRepos();
    const result = await repos.tasks.create({
      title: params['title'] as string,
      description: (params['description'] as string) ?? null,
      status: 'pending',
      priority: (params['priority'] as string) ?? 'normal',
      project_id: (params['projectId'] as string) ?? null,
      parent_id: null,
      goal_id: null,
      assignee_id: (params['assigneeId'] as string) ?? null,
      due_date: (params['dueDate'] as string) ?? null,
      completed_at: null,
      labels: [],
      order_index: 0,
      metadata: {},
      deleted_at: null,
      created_by: (params['userId'] as string) ?? null,
    } as Parameters<typeof repos.tasks.create>[0]);
    if (result.error) throw new Error(result.error);
    return result.data;
  },
  async rollback(_params, result) {
    if (result && typeof result === 'object' && 'id' in result) {
      const { repos } = await getRepos();
      await repos.tasks.softDelete((result as { id: string }).id);
    }
  },
};

export const taskCompleteHandler: ActionHandler = {
  async execute(params: Record<string, unknown>) {
    const { repos } = await getRepos();
    const result = await repos.tasks.updateStatus(params['taskId'] as string, 'completed');
    if (result.error) throw new Error(result.error);
    return result.data;
  },
  async rollback(params) {
    const { repos } = await getRepos();
    await repos.tasks.updateStatus(params['taskId'] as string, 'pending');
  },
};

export const taskUpdatePriorityHandler: ActionHandler = {
  async execute(params: Record<string, unknown>) {
    const { repos } = await getRepos();
    const result = await repos.tasks.update(
      params['taskId'] as string,
      { priority: params['priority'] as string } as Parameters<typeof repos.tasks.update>[1],
    );
    if (result.error) throw new Error(result.error);
    return result.data;
  },
};

export const taskDeleteHandler: ActionHandler = {
  async execute(params: Record<string, unknown>) {
    const { repos } = await getRepos();
    const result = await repos.tasks.softDelete(params['taskId'] as string);
    if (result.error) throw new Error(result.error);
    return result.data;
  },
};

export const projectArchiveHandler: ActionHandler = {
  async execute(params: Record<string, unknown>) {
    const { repos } = await getRepos();
    const result = await repos.projects.archive(params['projectId'] as string);
    if (result.error) throw new Error(result.error);
    return result.data;
  },
  async rollback(params) {
    const { repos } = await getRepos();
    await repos.projects.restore(params['projectId'] as string);
  },
};

export const notificationSendHandler: ActionHandler = {
  async execute(params: Record<string, unknown>) {
    const { supabase } = await getRepos();
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: params['userId'] as string,
        channel: 'in_app',
        priority: (params['priority'] as string) ?? 'normal',
        title: params['title'] as string,
        body: params['body'] as string,
        action_url: (params['actionUrl'] as string) ?? null,
        source: 'action-engine',
        metadata: {},
      } as Record<string, unknown>)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
};

export const memorySaveHandler: ActionHandler = {
  async execute(params: Record<string, unknown>) {
    const { repos } = await getRepos();
    const result = await repos.memories.create({
      type: (params['type'] as string) ?? 'knowledge',
      content: params['content'] as string,
      source: 'action-engine',
      owner_id: (params['userId'] as string) ?? null,
      privacy: 'private',
      importance: 0.5,
      tags: (params['tags'] as string[]) ?? [],
      access_count: 0,
      metadata: {},
      deleted_at: null,
    } as Parameters<typeof repos.memories.create>[0]);
    if (result.error) throw new Error(result.error);
    return result.data;
  },
};
