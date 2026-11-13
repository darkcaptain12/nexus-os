import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/giris', '/kayit', '/sifre-sifirla', '/auth/callback'];

export interface SessionResult {
  response: NextResponse;
  userId: string | null;
}

export async function updateSession(request: NextRequest): Promise<SessionResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { response: NextResponse.next({ request }), userId: null };
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isApiPath = pathname.startsWith('/api');

  if (!user && !isPublicPath && !isApiPath && pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/giris';
    return { response: NextResponse.redirect(url), userId: null };
  }

  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return { response: NextResponse.redirect(url), userId: user.id };
  }

  return { response: supabaseResponse, userId: user?.id ?? null };
}
