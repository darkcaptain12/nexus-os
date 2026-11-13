import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getActionEngine } from '@/lib/actions/engine-instance';

async function handleGET() {
  const engine = getActionEngine();
  return NextResponse.json({
    history: engine.queue.getHistory(50),
    stats: engine.getStats(),
  });
}

export const GET = withErrorBoundary(handleGET);
