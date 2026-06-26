import { createClient } from '@/lib/supabase/server';
import { SettingsPanel } from '@/components/dashboard/settings-panel';

export const metadata = { title: 'Ayarlar — NEXUS OS' };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Ayarlar</h1>
      <SettingsPanel
        userName={user?.user_metadata?.name ?? ''}
        userEmail={user?.email ?? ''}
      />
    </div>
  );
}
