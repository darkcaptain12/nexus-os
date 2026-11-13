import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getWeeklyReviewData } from '@/lib/ai/executive';

async function handleGET() {
  const review = await getWeeklyReviewData();
  return NextResponse.json(review);
}

export const GET = withErrorBoundary(handleGET);
