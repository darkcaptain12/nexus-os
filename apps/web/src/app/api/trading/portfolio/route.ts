import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { livePortfolio } from '@/lib/quant/live/services/live-trading-service';

async function handleGET() {
  return NextResponse.json({ portfolio: await livePortfolio() });
}

export const GET = withErrorBoundary(handleGET);
