import { NextResponse } from 'next/server';
import { getKernel } from '@/lib/kernel';

export async function GET() {
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
