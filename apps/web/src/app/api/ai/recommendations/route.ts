import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getRecommendations } from '@/lib/ai/executive';

async function handleGET() {
  const recommendations = await getRecommendations();
  return NextResponse.json({ recommendations, count: recommendations.length });
}

export const GET = withErrorBoundary(handleGET);
