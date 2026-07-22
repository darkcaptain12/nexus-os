'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createRepositories } from '@/lib/repositories';

function revalidateTaskPaths() {
  revalidatePath('/gorevler');
  revalidatePath('/dashboard');
}

async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const repos = createRepositories(supabase);
  const userRecord = await repos.users.findByAuthId(user.id);
  return { supabase, repos, user, userId: userRecord.data?.id ?? null };
}

export async function createTask(formData: FormData) {
  const title = formData.get('title') as string;
  if (!title?.trim()) return { error: 'Görev başlığı boş olamaz' };

  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Oturum bulunamadı' };

  const labelsRaw = formData.get('labels') as string;
  const labels = labelsRaw
    ? labelsRaw
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean)
    : [];

  const result = await ctx.repos.tasks.create({
    title: title.trim(),
    description: (formData.get('description') as string) || null,
    status: 'pending',
    priority: (formData.get('priority') as string) || 'normal',
    project_id: (formData.get('project_id') as string) || null,
    parent_id: (formData.get('parent_id') as string) || null,
    goal_id: null,
    assignee_id: ctx.userId,
    due_date: (formData.get('due_date') as string) || null,
    completed_at: null,
    labels,
    order_index: 0,
    metadata: {},
    deleted_at: null,
    created_by: ctx.userId,
  } as Parameters<typeof ctx.repos.tasks.create>[0]);

  if (result.error) return { error: result.error };

  await ctx.repos.tasks.logActivity(result.data!.id, ctx.userId, 'created');

  revalidateTaskPaths();
  return { success: true, data: result.data };
}

export async function updateTask(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) return { error: 'Görev ID gerekli' };

  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Oturum bulunamadı' };

  const updates: Record<string, unknown> = {};
  const title = formData.get('title') as string;
  if (title?.trim()) updates['title'] = title.trim();
  const description = formData.get('description') as string;
  if (description !== null) updates['description'] = description || null;
  const priority = formData.get('priority') as string;
  if (priority) updates['priority'] = priority;
  const dueDate = formData.get('due_date') as string;
  if (dueDate !== null) updates['due_date'] = dueDate || null;

  if (Object.keys(updates).length === 0) return { error: 'Değişiklik yok' };

  const existing = await ctx.repos.tasks.findById(id);
  const result = await ctx.repos.tasks.update(
    id,
    updates as Partial<Parameters<typeof ctx.repos.tasks.update>[1]>,
  );
  if (result.error) return { error: result.error };

  for (const [field, newVal] of Object.entries(updates)) {
    const oldVal = existing.data
      ? String((existing.data as unknown as Record<string, unknown>)[field] ?? '')
      : '';
    await ctx.repos.tasks.logActivity(
      id,
      ctx.userId,
      'updated',
      field,
      oldVal,
      String(newVal ?? ''),
    );
  }

  revalidateTaskPaths();
  return { success: true };
}

export async function updateTaskStatus(id: string, status: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Oturum bulunamadı' };

  const existing = await ctx.repos.tasks.findById(id);
  const oldStatus = ((existing.data as Record<string, unknown> | null)?.['status'] as string) ?? '';

  const result = await ctx.repos.tasks.updateStatus(id, status);
  if (result.error) return { error: result.error };

  await ctx.repos.tasks.logActivity(id, ctx.userId, 'status_changed', 'status', oldStatus, status);

  revalidateTaskPaths();
  return { success: true };
}

export async function deleteTask(id: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Oturum bulunamadı' };

  const result = await ctx.repos.tasks.softDelete(id);
  if (result.error) return { error: result.error };

  await ctx.repos.tasks.logActivity(id, ctx.userId, 'deleted');

  revalidateTaskPaths();
  return { success: true };
}

export async function updateTaskLabels(id: string, labels: string[]) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Oturum bulunamadı' };

  const result = await ctx.repos.tasks.updateLabels(id, labels);
  if (result.error) return { error: result.error };

  await ctx.repos.tasks.logActivity(
    id,
    ctx.userId,
    'labels_changed',
    'labels',
    '',
    labels.join(', '),
  );

  revalidateTaskPaths();
  return { success: true };
}

export async function bulkUpdateTaskStatus(ids: string[], status: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Oturum bulunamadı' };

  const result = await ctx.repos.tasks.bulkUpdateStatus(ids, status);
  if (result.error) return { error: result.error };

  for (const id of ids) {
    await ctx.repos.tasks.logActivity(id, ctx.userId, 'bulk_status_changed', 'status', '', status);
  }

  revalidateTaskPaths();
  return { success: true, updated: result.updated };
}

export async function bulkDeleteTasks(ids: string[]) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Oturum bulunamadı' };

  const result = await ctx.repos.tasks.bulkDelete(ids);
  if (result.error) return { error: result.error };

  revalidateTaskPaths();
  return { success: true, deleted: result.deleted };
}

export async function bulkUpdateTaskPriority(ids: string[], priority: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Oturum bulunamadı' };

  const result = await ctx.repos.tasks.bulkUpdatePriority(ids, priority);
  if (result.error) return { error: result.error };

  revalidateTaskPaths();
  return { success: true, updated: result.updated };
}

export async function addTaskComment(taskId: string, content: string) {
  if (!content?.trim()) return { error: 'Yorum boş olamaz' };

  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Oturum bulunamadı' };
  if (!ctx.userId) return { error: 'Kullanıcı bulunamadı' };

  const result = await ctx.repos.tasks.addComment(taskId, ctx.userId, content.trim());
  if (result.error) return { error: result.error };

  await ctx.repos.tasks.logActivity(taskId, ctx.userId, 'comment_added');

  revalidateTaskPaths();
  return { success: true, data: result.data };
}

export async function deleteTaskComment(commentId: string, taskId: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Oturum bulunamadı' };

  const result = await ctx.repos.tasks.deleteComment(commentId);
  if (result.error) return { error: result.error };

  await ctx.repos.tasks.logActivity(taskId, ctx.userId, 'comment_deleted');

  revalidateTaskPaths();
  return { success: true };
}
