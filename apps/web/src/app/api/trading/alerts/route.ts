import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { liveAlerts } from '@/lib/quant/live/services/live-trading-service';

async function handleGET() {
  return NextResponse.json({ alerts: liveAlerts() });
}

export const GET = withErrorBoundary(handleGET);
