import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getMetrics } from '@/lib/observability';
import { getQueryAuditor } from '@/lib/repositories/query-audit';

async function handleGET() {
  const metrics = getMetrics();
  const auditor = getQueryAuditor();
  const queryReport = auditor.getReport();

  return NextResponse.json({
    slowest: {
      request: metrics.getSlowest({ module: 'request' }),
      db: metrics.getSlowest({ module: 'db' }),
      ai: metrics.getSlowest({ module: 'ai' }),
      workflow: metrics.getSlowest({ module: 'workflow' }),
      action: metrics.getSlowest({ module: 'action' }),
      all: metrics.getSlowest(undefined, 20),
    },
    percentiles: {
      overall: metrics.getPercentiles(),
      request: metrics.getPercentiles({ module: 'request' }),
      db: metrics.getPercentiles({ module: 'db' }),
      ai: metrics.getPercentiles({ module: 'ai' }),
    },
    queryAudit: queryReport,
    top20SlowestQueries: auditor.getTopSlowest(20),
    repositoryHeatmap: queryReport.heatmap,
  });
}

export const GET = withErrorBoundary(handleGET);
