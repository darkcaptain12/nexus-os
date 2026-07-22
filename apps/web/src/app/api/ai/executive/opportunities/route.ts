import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getOpportunities } from '@/lib/ai/executive';

async function handleGET() {
  const opportunities = await getOpportunities();
  return NextResponse.json({ opportunities, generatedAt: new Date().toISOString() });
}

export const GET = withErrorBoundary(handleGET);
