import { createClient } from '@/lib/supabase/server';
import { createRepositories } from '@/lib/repositories';
import { SettingsPanel } from '@/components/dashboard/settings-panel';

export const metadata = { title: 'Ayarlar — NEXUS OS' };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const repos = createRepositories(supabase);
  const profile = await repos.users.getFullProfile(user?.id ?? '');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-foreground text-2xl font-bold">Ayarlar</h1>
      <SettingsPanel
        userName={profile?.user.name ?? user?.user_metadata?.name ?? ''}
        userEmail={profile?.user.email ?? user?.email ?? ''}
        bio={profile?.profile.bio ?? ''}
        timezone={profile?.profile.timezone ?? 'Europe/Istanbul'}
        currency={profile?.profile.currency ?? 'TRY'}
        currentTheme={profile?.preferences.theme ?? 'dark'}
        notificationsEnabled={profile?.preferences.notifications_enabled ?? true}
      />
    </div>
  );
}
