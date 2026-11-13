import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getGitHubOAuth, buildAuthorizeUrl } from '@/lib/integrations/oauth';

async function handleGET() {
  const provider = getGitHubOAuth();
  if (!provider) {
    return NextResponse.json({ error: 'GitHub OAuth not configured' }, { status: 503 });
  }

  const state = crypto.randomUUID();
  const url = buildAuthorizeUrl(provider, state);
  return NextResponse.redirect(url);
}

export const GET = withErrorBoundary(handleGET);
