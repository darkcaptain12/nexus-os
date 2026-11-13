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
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
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
      signUp: async () => ({
        data: { user: null, session: null },
        error: { message: 'Supabase yapılandırılmamış' },
      }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: { message: 'Supabase yapılandırılmamış' },
      }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({
        data: {},
        error: { message: 'Supabase yapılandırılmamış' },
      }),
      exchangeCodeForSession: async () => ({
        data: { user: null, session: null },
        error: { message: 'Supabase yapılandırılmamış' },
      }),
    },
    // Graceful degradation — Supabase yapılandırılmamışsa query builder zincirleri
    // boş sonuç döner (crash yok). Build-time prerender + runtime mock için.
    from: () => createMockQueryBuilder(),
    rpc: async () => ({ data: null, error: { message: 'Supabase yapılandırılmamış' } }),
  } as unknown as ReturnType<typeof createServerClient>;
}

// Zincirlenebilir + await-edilebilir mock query builder — her metod kendini döner,
// terminal işlemler (single/maybeSingle) ve await boş { data, error } verir.
function createMockQueryBuilder() {
  const result = { data: null, error: null };
  const listResult = { data: [] as unknown[], error: null };
  const builder: Record<string, unknown> = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    upsert: () => builder,
    delete: () => builder,
    eq: () => builder,
    neq: () => builder,
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    is: () => builder,
    in: () => builder,
    like: () => builder,
    ilike: () => builder,
    contains: () => builder,
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    filter: () => builder,
    match: () => builder,
    single: async () => result,
    maybeSingle: async () => result,
    // Terminal await (ör. `await db.from(x).select()`) — liste sonucu
    then: (resolve: (v: typeof listResult) => unknown) => resolve(listResult),
  };
  return builder;
}
