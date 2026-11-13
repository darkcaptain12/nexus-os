import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getRisks } from '@/lib/ai/executive';

async function handleGET() {
  const risks = await getRisks();
  return NextResponse.json({ risks, count: risks.length });
}

export const GET = withErrorBoundary(handleGET);
