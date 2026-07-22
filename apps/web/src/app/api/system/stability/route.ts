import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { stabilityAudit } from '@/lib/observability/production/services/production-service';

async function handleGET() {
  return NextResponse.json({ audit: stabilityAudit() });
}

export const GET = withErrorBoundary(handleGET);
