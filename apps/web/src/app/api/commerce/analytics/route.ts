import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { commerceDashboard } from '@/lib/commerce/intelligence/services/commerce-intelligence-service';

// Commerce Dashboard — Revenue/Profit/Orders/Ads/Products/Hunter/Supplier/ROAS/Executive
async function handleGET() {
  return NextResponse.json({ dashboard: await commerceDashboard() });
}

export const GET = withErrorBoundary(handleGET);
