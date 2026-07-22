import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getExecutiveTimeline } from '@/lib/ai/orchestrator/executive-timeline';

async function handleGET() {
  const timeline = getExecutiveTimeline();
  return NextResponse.json({
    entries: timeline.getAll(20),
    latest: timeline.getLatest(),
    generatedAt: new Date().toISOString(),
  });
}

export const GET = withErrorBoundary(handleGET);
