import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getKernel } from '@/lib/kernel';

async function handleGET() {
  const { kernel, ready } = getKernel();
  await ready;
  const status = kernel.getStatus();
  const lifecycle = kernel.getLifecycle();

  return NextResponse.json({
    version: status.version,
    phase: status.phase,
    environment: status.environment,
    bootTimeMs: status.bootTimeMs,
    uptimeMs: status.uptime,
    container: status.container,
    lifecycle: {
      phase: lifecycle.getPhase(),
      history: lifecycle.getHistory(),
    },
  });
}

export const GET = withErrorBoundary(handleGET);
