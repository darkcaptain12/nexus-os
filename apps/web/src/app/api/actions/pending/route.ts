import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getActionEngine } from '@/lib/actions/engine-instance';

async function handleGET() {
  const engine = getActionEngine();
  return NextResponse.json({
    pending: engine.approvals.getPending(),
    count: engine.approvals.getPending().length,
  });
}

export const GET = withErrorBoundary(handleGET);
