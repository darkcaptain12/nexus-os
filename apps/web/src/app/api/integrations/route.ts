import { NextResponse } from 'next/server';
import { getIntegrationHub } from '@/lib/integrations/hub-instance';

export async function GET() {
  const hub = getIntegrationHub();
  return NextResponse.json({
    providers: hub.registry.list(),
    connections: hub.connections.listConnections(),
    actions: hub.registry.getAllActions().length,
    stats: hub.getStats(),
  });
}
