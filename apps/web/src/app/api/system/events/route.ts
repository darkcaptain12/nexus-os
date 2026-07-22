import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getKernel } from '@/lib/kernel';

async function handleGET() {
  const { kernel, ready } = getKernel();
  await ready;
  const eventRuntime = kernel.getEventRuntime();
  const metrics = eventRuntime.getMetrics();

  return NextResponse.json({
    metrics,
    deadLetterQueue: await eventRuntime.getDeadLetterQueue(),
  });
}

export const GET = withErrorBoundary(handleGET);
