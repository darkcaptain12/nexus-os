import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getAIExecutiveStatus } from '@/lib/ai/executive';

async function handleGET() {
  const status = await getAIExecutiveStatus();
  return NextResponse.json(status);
}

export const GET = withErrorBoundary(handleGET);
