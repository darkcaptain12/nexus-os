import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { installation } from '@/lib/release/services/release-service';

async function handleGET() {
  return NextResponse.json({ state: installation() });
}

export const GET = withErrorBoundary(handleGET);
