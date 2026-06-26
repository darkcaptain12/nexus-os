import { redirect } from 'next/navigation';

export default async function RootPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    redirect('/giris');
    return;
  }

  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/giris');
  }
}
