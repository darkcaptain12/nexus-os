import { NextResponse } from 'next/server';
import { getGoogleOAuth, exchangeCodeForToken } from '@/lib/integrations/oauth';
import { getIntegrationHub } from '@/lib/integrations/hub-instance';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=no_code`);
  }

  const provider = getGoogleOAuth();
  if (!provider) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=not_configured`);
  }

  const token = await exchangeCodeForToken(provider, code);
  if (!token) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=token_exchange_failed`);
  }

  const hub = getIntegrationHub();
  const expiresAt = token.expiresIn
    ? new Date(Date.now() + token.expiresIn * 1000).toISOString()
    : undefined;

  await hub.connect('gmail', 'user', {
    providerId: 'gmail',
    authMethod: 'oauth2',
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt,
  });

  await hub.connect('google-calendar', 'user', {
    providerId: 'google-calendar',
    authMethod: 'oauth2',
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt,
  });

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations?connected=google`);
}
