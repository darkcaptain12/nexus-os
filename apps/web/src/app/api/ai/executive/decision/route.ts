import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getDecisions } from '@/lib/ai/executive';

async function handleGET() {
  const decisions = await getDecisions();
  return NextResponse.json({ decisions, generatedAt: new Date().toISOString() });
}

export const GET = withErrorBoundary(handleGET);
