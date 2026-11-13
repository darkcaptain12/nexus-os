import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { liveOrders } from '@/lib/quant/live/services/live-trading-service';

async function handleGET() {
  return NextResponse.json({ orders: liveOrders() });
}

export const GET = withErrorBoundary(handleGET);
