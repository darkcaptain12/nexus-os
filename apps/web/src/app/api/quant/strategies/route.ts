import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getStrategies } from '@/lib/quant/services/quant-service';

async function handleGET() {
  return NextResponse.json({ strategies: getStrategies() });
}

export const GET = withErrorBoundary(handleGET);
