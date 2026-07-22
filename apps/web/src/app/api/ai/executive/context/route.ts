import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { buildOrchestratorContext } from '@/lib/ai/orchestrator/context-pipeline';

async function handleGET() {
  const ctx = await buildOrchestratorContext('api-' + crypto.randomUUID().slice(0, 8));

  // Return a summary — not the full task list (too large for API response)
  return NextResponse.json({
    cycleId: ctx.cycleId,
    taskSummary: ctx.taskSummary,
    goalSummary: ctx.goalSummary,
    riskScore: ctx.riskScore,
    productivityScore: ctx.productivity.score,
    productivityTrend: ctx.productivity.trend,
    topRisks: ctx.risks.slice(0, 5),
    desktopTopApps: ctx.desktopTopApps,
    system: ctx.system,
    modules: ctx.modules,
    buildDurationMs: ctx.buildDurationMs,
    builtAt: ctx.builtAt,
  });
}

export const GET = withErrorBoundary(handleGET);
