import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { version } from '@/lib/release/services/release-service';

async function handleGET() {
  return NextResponse.json({ version: version() });
}

export const GET = withErrorBoundary(handleGET);
