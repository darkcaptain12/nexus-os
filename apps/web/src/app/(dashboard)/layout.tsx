import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/health';
import { createRepositories } from '@/lib/repositories';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Supabase yapılandırılmışsa auth zorunlu; yapılandırılmamışsa demo modda devam (graceful degradation)
  if (!user && isSupabaseConfigured()) {
    redirect('/giris');
  }

  let userName = 'Demo Kullanıcı';
  let userEmail = 'demo@apex-os.local';

  if (user) {
    const repos = createRepositories(supabase);
    const profile = await repos.users.getFullProfile(user.id);
    userName =
      profile?.user.name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Kullanıcı';
    userEmail = profile?.user.email ?? user.email ?? '';
  }

  return (
    <DashboardShell userName={userName} userEmail={userEmail}>
      {children}
    </DashboardShell>
  );
}
