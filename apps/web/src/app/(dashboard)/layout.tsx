import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/giris');
  }

  const userName = user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Kullanıcı';

  return (
    <DashboardShell userName={userName} userEmail={user.email ?? ''}>
      {children}
    </DashboardShell>
  );
}
