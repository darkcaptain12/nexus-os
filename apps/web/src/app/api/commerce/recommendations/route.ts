import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { commerceAdMetrics } from '@/lib/commerce/intelligence/services/commerce-intelligence-service';
import { recommendAdAction } from '@/lib/commerce/intelligence/ad-optimizer';

// Ad Optimizer önerileri — her kampanya için Executive önerisi (bütçe/durdur/creative/audience)
async function handleGET() {
  const metrics = commerceAdMetrics();
  const recommendations = metrics.map((m) => recommendAdAction(m));
  return NextResponse.json({ recommendations });
}

export const GET = withErrorBoundary(handleGET);
