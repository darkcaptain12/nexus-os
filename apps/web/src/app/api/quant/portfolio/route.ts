import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getPortfolioOverview } from '@/lib/quant/services/quant-service';

async function handleGET() {
  const portfolio = await getPortfolioOverview();
  return NextResponse.json({ portfolio });
}

export const GET = withErrorBoundary(handleGET);
