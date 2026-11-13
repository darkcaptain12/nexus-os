import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { syncPositions } from '@/lib/quant/position-manager';

async function handleGET() {
  const state = await syncPositions();
  return NextResponse.json({
    open: state.openPositions,
    closed: state.closedPositions,
    unrealizedPnl: state.unrealizedPnl,
  });
}

export const GET = withErrorBoundary(handleGET);
