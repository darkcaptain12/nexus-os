import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { productionDashboard } from '@/lib/observability/production/services/production-service';

async function handleGET() {
  return NextResponse.json({ dashboard: await productionDashboard() });
}

export const GET = withErrorBoundary(handleGET);
