import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getIntegrationHub } from '@/lib/integrations/hub-instance';

async function handleGET() {
  const hub = getIntegrationHub();
  return NextResponse.json({
    providers: hub.registry.list(),
    connections: hub.connections.listConnections(),
    actions: hub.registry.getAllActions().length,
    stats: hub.getStats(),
  });
}

export const GET = withErrorBoundary(handleGET);
