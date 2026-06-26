'use server';

import { createClient } from '@/lib/supabase/server';
import { createRepositories } from '@/lib/repositories';

export async function updateUserName(formData: FormData) {
  const name = formData.get('name') as string;
  if (!name?.trim()) return { error: 'İsim boş olamaz' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı' };

  const repos = createRepositories(supabase);
  const profile = await repos.users.getFullProfile(user.id);
  if (!profile) return { error: 'Profil bulunamadı' };

  const result = await repos.users.updateName(profile.user.id, name.trim());
  if (result.error) return { error: result.error };

  await supabase.auth.updateUser({ data: { name: name.trim() } });

  return { success: true };
}

export async function updateUserProfile(formData: FormData) {
  const bio = formData.get('bio') as string | null;
  const timezone = formData.get('timezone') as string | null;
  const currency = formData.get('currency') as string | null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı' };

  const repos = createRepositories(supabase);
  const profile = await repos.users.getFullProfile(user.id);
  if (!profile) return { error: 'Profil bulunamadı' };

  const updates: Record<string, string | null> = {};
  if (bio !== null) updates['bio'] = bio;
  if (timezone) updates['timezone'] = timezone;
  if (currency) updates['currency'] = currency;

  if (Object.keys(updates).length === 0) return { error: 'Değişiklik yok' };

  const result = await repos.users.updateProfile(profile.user.id, updates);
  if (result.error) return { error: result.error };

  return { success: true };
}

export async function updateUserPreferences(formData: FormData) {
  const theme = formData.get('theme') as string | null;
  const notificationsEnabled = formData.get('notifications_enabled');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı' };

  const repos = createRepositories(supabase);
  const profile = await repos.users.getFullProfile(user.id);
  if (!profile) return { error: 'Profil bulunamadı' };

  const updates: Record<string, unknown> = {};
  if (theme) updates['theme'] = theme;
  if (notificationsEnabled !== null)
    updates['notifications_enabled'] = notificationsEnabled === 'true';

  if (Object.keys(updates).length === 0) return { error: 'Değişiklik yok' };

  const result = await repos.users.updatePreferences(profile.user.id, updates);
  if (result.error) return { error: result.error };

  return { success: true };
}
