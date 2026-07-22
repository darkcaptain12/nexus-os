import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { liveStrategies } from '@/lib/quant/live/services/live-trading-service';

async function handleGET() {
  return NextResponse.json({ strategies: liveStrategies() });
}

export const GET = withErrorBoundary(handleGET);
