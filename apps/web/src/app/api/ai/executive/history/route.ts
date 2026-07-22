import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getDecisionHistoryData } from '@/lib/ai/executive';

async function handleGET() {
  const data = getDecisionHistoryData();
  return NextResponse.json(data);
}

export const GET = withErrorBoundary(handleGET);
