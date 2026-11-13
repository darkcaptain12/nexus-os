import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { rcScore } from '@/lib/observability/production/services/production-service';

async function handleGET() {
  return NextResponse.json({ score: await rcScore() });
}

export const GET = withErrorBoundary(handleGET);
