import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { backupVerify } from '@/lib/observability/production/services/production-service';

async function handleGET() {
  return NextResponse.json({ report: backupVerify() });
}

export const GET = withErrorBoundary(handleGET);
