import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getWorkerHealthRegistry } from '@/lib/observability/worker-health';

async function handleGET() {
  const workers = getWorkerHealthRegistry().getAllWorkerHealth();
  return NextResponse.json({ workers });
}

export const GET = withErrorBoundary(handleGET);
