import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getSyncEngine } from '@/lib/integrations/hub-instance';

async function handleGET() {
  const sync = getSyncEngine();
  return NextResponse.json({
    jobs: sync.listJobs(),
    metrics: sync.getMetrics(),
  });
}

async function handlePOST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { providerId, mode } = body as { providerId?: string; mode?: string };

  if (!providerId) {
    return NextResponse.json({ error: 'providerId required' }, { status: 400 });
  }

  const sync = getSyncEngine();
  const result = await sync.executeSync(
    providerId,
    (mode as 'full' | 'incremental') ?? 'incremental',
  );

  return NextResponse.json(result);
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
