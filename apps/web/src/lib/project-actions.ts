'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createRepositories } from '@/lib/repositories';

function revalidateProjectPaths() {
  revalidatePath('/projeler');
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
  return { repos, userId: userRecord.data?.id ?? null };
}

export async function createProject(formData: FormData) {
  const name = formData.get('name') as string;
  if (!name?.trim()) return { error: 'Proje adı boş olamaz' };

  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Oturum bulunamadı' };
  if (!ctx.userId) return { error: 'Kullanıcı bulunamadı' };

  const result = await ctx.repos.projects.create({
    name: name.trim(),
    description: (formData.get('description') as string) || null,
    status: (formData.get('status') as string) || 'planning',
    priority: (formData.get('priority') as string) || 'normal',
    goal_id: null,
    owner_id: ctx.userId,
    color: (formData.get('color') as string) || null,
    icon: null,
    start_date: (formData.get('start_date') as string) || null,
    end_date: (formData.get('end_date') as string) || null,
    metadata: {},
    deleted_at: null,
    created_by: ctx.userId,
  } as Parameters<typeof ctx.repos.projects.create>[0]);

  if (result.error) return { error: result.error };

  await ctx.repos.projects.logActivity(
    result.data!.id,
    ctx.userId,
    'created',
    `Proje oluşturuldu: ${name.trim()}`,
  );

  revalidateProjectPaths();
  return { success: true, data: result.data };
}

export async function updateProject(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) return { error: 'Proje ID gerekli' };

  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Oturum bulunamadı' };

  const updates: Record<string, unknown> = {};
  const name = formData.get('name') as string;
  if (name?.trim()) updates['name'] = name.trim();
  const description = formData.get('description') as string;
  if (description !== null) updates['description'] = description || null;
  const status = formData.get('status') as string;
  if (status) updates['status'] = status;
  const priority = formData.get('priority') as string;
  if (priority) updates['priority'] = priority;
  const startDate = formData.get('start_date') as string;
  if (startDate !== null) updates['start_date'] = startDate || null;
  const endDate = formData.get('end_date') as string;
  if (endDate !== null) updates['end_date'] = endDate || null;
  const color = formData.get('color') as string;
  if (color !== null) updates['color'] = color || null;

  if (Object.keys(updates).length === 0) return { error: 'Değişiklik yok' };

  const result = await ctx.repos.projects.update(
    id,
    updates as Partial<Parameters<typeof ctx.repos.projects.update>[1]>,
  );
  if (result.error) return { error: result.error };

  const fields = Object.keys(updates).join(', ');
  await ctx.repos.projects.logActivity(id, ctx.userId, 'updated', `Güncellendi: ${fields}`);

  revalidateProjectPaths();
  return { success: true };
}

export async function updateProjectStatus(id: string, status: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Oturum bulunamadı' };

  const result = await ctx.repos.projects.update(id, { status } as Partial<
    Parameters<typeof ctx.repos.projects.update>[1]
  >);
  if (result.error) return { error: result.error };

  await ctx.repos.projects.logActivity(id, ctx.userId, 'status_changed', `Durum: ${status}`);

  revalidateProjectPaths();
  return { success: true };
}

export async function deleteProject(id: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Oturum bulunamadı' };

  const result = await ctx.repos.projects.softDelete(id);
  if (result.error) return { error: result.error };

  await ctx.repos.projects.logActivity(id, ctx.userId, 'deleted', 'Proje silindi');

  revalidateProjectPaths();
  return { success: true };
}

export async function archiveProject(id: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Oturum bulunamadı' };

  const result = await ctx.repos.projects.archive(id);
  if (result.error) return { error: result.error };

  await ctx.repos.projects.logActivity(id, ctx.userId, 'archived', 'Proje arşivlendi');

  revalidateProjectPaths();
  return { success: true };
}

export async function restoreProject(id: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: 'Oturum bulunamadı' };

  const result = await ctx.repos.projects.restore(id);
  if (result.error) return { error: result.error };

  await ctx.repos.projects.logActivity(id, ctx.userId, 'restored', 'Proje geri yüklendi');

  revalidateProjectPaths();
  return { success: true };
}
