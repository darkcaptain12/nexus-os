import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createRepositories } from '@/lib/repositories';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/giris');
  }

  const repos = createRepositories(supabase);
  const profile = await repos.users.getFullProfile(user.id);

  const userName =
    profile?.user.name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Kullanıcı';

  const userEmail = profile?.user.email ?? user.email ?? '';

  return (
    <DashboardShell userName={userName} userEmail={userEmail}>
      {children}
    </DashboardShell>
  );
}
