import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { devMarketplace } from '@/lib/plugins/services/developer-platform-service';

// Marketplace kataloğu (official plugins + downloads/rating)
async function handleGET() {
  return NextResponse.json({ marketplace: devMarketplace() });
}

export const GET = withErrorBoundary(handleGET);
