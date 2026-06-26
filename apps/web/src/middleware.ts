import { updateSession } from '@/lib/supabase/middleware';
import { applySecurityHeaders } from '@/lib/security/headers';
import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  return applySecurityHeaders(response as NextResponse);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
