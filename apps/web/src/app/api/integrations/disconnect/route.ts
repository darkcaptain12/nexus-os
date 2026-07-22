import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getIntegrationHub } from '@/lib/integrations/hub-instance';

async function handlePOST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { providerId } = body as { providerId?: string };

  if (!providerId) {
    return NextResponse.json({ error: 'providerId required' }, { status: 400 });
  }

  const hub = getIntegrationHub();
  await hub.disconnect(providerId);

  return NextResponse.json({ disconnected: true, providerId });
}

export const POST = withErrorBoundary(handlePOST);
