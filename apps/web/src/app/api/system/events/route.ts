import { NextResponse } from 'next/server';
import { getKernel } from '@/lib/kernel';

export async function GET() {
  const { kernel, ready } = getKernel();
  await ready;
  const eventRuntime = kernel.getEventRuntime();
  const metrics = eventRuntime.getMetrics();

  return NextResponse.json({
    metrics,
    deadLetterQueue: await eventRuntime.getDeadLetterQueue(),
  });
}
