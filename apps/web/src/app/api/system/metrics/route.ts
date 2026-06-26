import { NextResponse } from 'next/server';
import { getMetrics } from '@/lib/observability';
import { generateHealthReport } from '@/lib/observability/health';
import { generateProductionChecklist } from '@/lib/observability/production-checklist';

export async function GET() {
  const metrics = getMetrics();
  const health = await generateHealthReport();
  const checklist = await generateProductionChecklist();

  return NextResponse.json({
    summary: metrics.getSummary(),
    health: { score: health.score, status: health.status, system: health.system },
    production: { score: checklist.score, ready: checklist.ready },
    metrics: metrics.getMetrics(),
  });
}
