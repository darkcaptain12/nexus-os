import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getIntegrationHub } from '@/lib/integrations/hub-instance';

async function handlePOST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { providerId, action, params } = body as {
    providerId?: string;
    action?: string;
    params?: Record<string, unknown>;
  };

  if (!providerId || !action) {
    return NextResponse.json({ error: 'providerId and action required' }, { status: 400 });
  }

  const hub = getIntegrationHub();
  const result = await hub.execute(providerId, action, params ?? {});

  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}

export const POST = withErrorBoundary(handlePOST);
