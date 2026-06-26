import { NextResponse } from 'next/server';
import { getIntegrationHub } from '@/lib/integrations/hub-instance';

export async function GET() {
  const hub = getIntegrationHub();
  const health = await hub.healthCheckAll();
  return NextResponse.json({ health, stats: hub.getStats() });
}
