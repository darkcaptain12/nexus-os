import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getMetrics } from '@/lib/observability';
import { generateHealthReport } from '@/lib/observability/health';
import { generateProductionChecklist } from '@/lib/observability/production-checklist';
import { withCache, getCache } from '@/lib/cache';
import { getRateLimitInvocationCount, getRateLimitRejections } from '@/lib/security/headers';

async function handleGET() {
  const data = await withCache('system.metrics', 5000, async () => {
    const metrics = getMetrics();
    const health = await generateHealthReport();
    const checklist = await generateProductionChecklist();

    return {
      summary: metrics.getSummary(),
      health: {
        score: health.score,
        status: health.status,
        severity: health.severity,
        system: health.system,
      },
      production: { score: checklist.score, ready: checklist.ready },
      metrics: metrics.getMetrics(),
      percentiles: {
        request: metrics.getPercentiles({ module: 'request' }),
        db: metrics.getPercentiles({ module: 'db' }),
        ai: metrics.getPercentiles({ module: 'ai' }),
      },
      process: metrics.getProcessMetrics(),
      cache: getCache().getStats(),
      rateLimits: {
        invocations: getRateLimitInvocationCount(),
        rejections: getRateLimitRejections(),
      },
    };
  });

  return NextResponse.json(data);
}

export const GET = withErrorBoundary(handleGET);
