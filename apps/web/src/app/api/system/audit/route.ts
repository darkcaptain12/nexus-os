import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { generateProductionAudit } from '@/lib/observability/production-audit';

async function handleGET() {
  const report = await generateProductionAudit();
  return NextResponse.json(report);
}

export const GET = withErrorBoundary(handleGET);
