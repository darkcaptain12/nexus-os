import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { environment } from '@/lib/release/services/release-service';

async function handleGET() {
  return NextResponse.json({ report: environment() });
}

export const GET = withErrorBoundary(handleGET);
