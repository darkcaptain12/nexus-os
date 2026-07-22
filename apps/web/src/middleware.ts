import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { applySecurityHeaders, checkApiRateLimit } from '@/lib/security/headers';

export async function middleware(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/api/')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';
    const identifier = userId ?? `ip:${ip}`;
    const result = checkApiRateLimit(pathname, identifier);

    if (!result.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((new Date(result.resetAt).getTime() - Date.now()) / 1000),
      );
      const limited = NextResponse.json(
        {
          error: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.',
          code: 'RATE_LIMITED',
          group: result.group,
          retryAt: result.resetAt,
        },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
      );
      return applySecurityHeaders(limited);
    }
  }

  return applySecurityHeaders(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
