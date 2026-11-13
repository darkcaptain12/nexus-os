import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { generateSecurityAuditReport } from '@/lib/observability/security-audit';

async function handleGET() {
  const report = await generateSecurityAuditReport();
  return NextResponse.json(report);
}

export const GET = withErrorBoundary(handleGET);
