import { NextResponse } from 'next/server';
import { getGoogleOAuth, buildAuthorizeUrl } from '@/lib/integrations/oauth';

export async function GET() {
  const provider = getGoogleOAuth();
  if (!provider) {
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 503 });
  }

  const state = crypto.randomUUID();
  const url = buildAuthorizeUrl(provider, state);
  return NextResponse.redirect(url);
}
