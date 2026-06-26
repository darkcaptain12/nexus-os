import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return createMockClient();
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component — can't set cookies
        }
      },
    },
  });
}

function createMockClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signUp: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase yapılandırılmamış' } }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase yapılandırılmamış' } }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ data: {}, error: { message: 'Supabase yapılandırılmamış' } }),
      exchangeCodeForSession: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase yapılandırılmamış' } }),
    },
  } as ReturnType<typeof createServerClient>;
}
