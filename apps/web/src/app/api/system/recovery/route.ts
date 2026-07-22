import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { recoveryVerify } from '@/lib/observability/production/services/production-service';

async function handleGET() {
  return NextResponse.json({ report: recoveryVerify() });
}

export const GET = withErrorBoundary(handleGET);
