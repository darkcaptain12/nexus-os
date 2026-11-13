import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getGoalPriority } from '@/lib/ai/executive';

async function handleGET() {
  const goals = await getGoalPriority();
  return NextResponse.json({ goals, generatedAt: new Date().toISOString() });
}

export const GET = withErrorBoundary(handleGET);
