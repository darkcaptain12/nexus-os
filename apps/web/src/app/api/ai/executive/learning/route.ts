import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getDecisionHistory } from '@/lib/ai/decision-history';
import { getCycleEngine } from '@/lib/ai/orchestrator/cycle-engine';

async function handleGET() {
  const report = getDecisionHistory().getLearningReport();
  const averages = getCycleEngine().getAverageMetrics();
  const recentCycles = getCycleEngine().getAll(10);

  return NextResponse.json({
    weeklyReport: report,
    cycleAverages: averages,
    recentCycles: recentCycles.map((c) => ({
      id: c.id,
      startAt: c.startAt,
      durationMs: c.durationMs,
      decisionCount: c.decisionCount,
      approvalCount: c.approvalCount,
      confidenceAverage: c.confidenceAverage,
      insight: c.insight,
      state: c.state,
    })),
    generatedAt: new Date().toISOString(),
  });
}

export const GET = withErrorBoundary(handleGET);
