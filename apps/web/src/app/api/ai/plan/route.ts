import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getDailyPlanData } from '@/lib/ai/executive';

async function handleGET() {
  const plan = await getDailyPlanData();
  return NextResponse.json(plan);
}

export const GET = withErrorBoundary(handleGET);
