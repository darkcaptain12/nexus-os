import { NextResponse } from 'next/server';
import { getGitHubOAuth, buildAuthorizeUrl } from '@/lib/integrations/oauth';

export async function GET() {
  const provider = getGitHubOAuth();
  if (!provider) {
    return NextResponse.json({ error: 'GitHub OAuth not configured' }, { status: 503 });
  }

  const state = crypto.randomUUID();
  const url = buildAuthorizeUrl(provider, state);
  return NextResponse.redirect(url);
}
