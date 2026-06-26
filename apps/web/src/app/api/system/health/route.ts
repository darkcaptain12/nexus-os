import { NextResponse } from 'next/server';
import { getKernel } from '@/lib/kernel';

export async function GET() {
  const { kernel, ready } = getKernel();
  await ready;
  const report = await kernel.health.check();
  const status = report.score >= 80 ? 200 : report.score >= 50 ? 200 : 503;
  return NextResponse.json(report, { status });
}
