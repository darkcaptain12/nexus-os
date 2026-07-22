import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getStateMachine } from '@/lib/ai/orchestrator/state-machine';

async function handleGET() {
  const sm = getStateMachine();
  return NextResponse.json({
    state: sm.getState(),
    transitions: sm.getTransitions(20),
    lastTransition: sm.getLastTransition(),
    generatedAt: new Date().toISOString(),
  });
}

export const GET = withErrorBoundary(handleGET);
