import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getAgentStore } from '@/lib/agents/agent-store';
import { getAgentScheduler } from '@/lib/agents/agent-scheduler';

async function handleGET() {
  return NextResponse.json({
    store: getAgentStore().getMetrics(),
    scheduler: getAgentScheduler().getMetrics(),
    generatedAt: new Date().toISOString(),
  });
}

export const GET = withErrorBoundary(handleGET);
