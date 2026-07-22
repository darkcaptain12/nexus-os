import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getIntegrationHub } from '@/lib/integrations/hub-instance';

async function handlePOST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { providerId, credentials } = body as {
    providerId?: string;
    credentials?: Record<string, unknown>;
  };

  if (!providerId) {
    return NextResponse.json({ error: 'providerId required' }, { status: 400 });
  }

  const hub = getIntegrationHub();

  try {
    await hub.connect(providerId, 'user', {
      providerId,
      authMethod: 'bearer',
      accessToken: credentials?.accessToken as string,
      apiKey: credentials?.apiKey as string,
      ...credentials,
    });

    return NextResponse.json({ connected: true, providerId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}

export const POST = withErrorBoundary(handlePOST);
