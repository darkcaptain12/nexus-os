import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { changelog } from '@/lib/release/services/release-service';

async function handleGET() {
  return NextResponse.json({ changelog: changelog() });
}

export const GET = withErrorBoundary(handleGET);
