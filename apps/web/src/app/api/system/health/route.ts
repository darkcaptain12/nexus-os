import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { generateHealthReport } from '@/lib/observability/health';

async function handleGET() {
  const report = await generateHealthReport();
  const status = report.score >= 50 ? 200 : 503;
  return NextResponse.json(report, { status });
}

export const GET = withErrorBoundary(handleGET);
