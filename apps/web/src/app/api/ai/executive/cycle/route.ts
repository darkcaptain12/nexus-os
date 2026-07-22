import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getCycleEngine } from '@/lib/ai/orchestrator/cycle-engine';

async function handleGET() {
  const engine = getCycleEngine();
  return NextResponse.json({
    current: engine.getCurrent(),
    history: engine.getAll(20),
    averages: engine.getAverageMetrics(),
    generatedAt: new Date().toISOString(),
  });
}

export const GET = withErrorBoundary(handleGET);
