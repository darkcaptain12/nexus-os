import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { config } from '@/lib/release/services/release-service';

async function handleGET() {
  // Secret DEĞER dönmez — yalnız provider set/unset durumu (config-manager)
  return NextResponse.json({ config: config() });
}

export const GET = withErrorBoundary(handleGET);
