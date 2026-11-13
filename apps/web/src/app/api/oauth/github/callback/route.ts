import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getGitHubOAuth, exchangeCodeForToken } from '@/lib/integrations/oauth';
import { getIntegrationHub } from '@/lib/integrations/hub-instance';

async function handleGET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=no_code`);
  }

  const provider = getGitHubOAuth();
  if (!provider) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=not_configured`,
    );
  }

  const token = await exchangeCodeForToken(provider, code);
  if (!token) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=token_exchange_failed`,
    );
  }

  const hub = getIntegrationHub();
  await hub.connect('github', 'user', {
    providerId: 'github',
    authMethod: 'bearer',
    accessToken: token.accessToken,
  });

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations?connected=github`);
}

export const GET = withErrorBoundary(handleGET);
