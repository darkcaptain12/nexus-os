import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { commerceRevenue } from '@/lib/commerce/intelligence/services/commerce-intelligence-service';

async function handleGET() {
  return NextResponse.json({ revenue: await commerceRevenue() });
}

export const GET = withErrorBoundary(handleGET);
