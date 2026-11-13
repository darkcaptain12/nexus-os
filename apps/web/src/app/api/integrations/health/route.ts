import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getIntegrationHub } from '@/lib/integrations/hub-instance';

async function handleGET() {
  const hub = getIntegrationHub();
  const health = await hub.healthCheckAll();
  return NextResponse.json({ health, stats: hub.getStats() });
}

export const GET = withErrorBoundary(handleGET);
