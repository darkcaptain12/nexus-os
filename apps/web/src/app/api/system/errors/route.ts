import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getErrorRegistry } from '@/lib/observability/error-registry';

async function handleGET() {
  const registry = getErrorRegistry();
  return NextResponse.json({ total: registry.getTotal(), byClassification: registry.getAll() });
}

export const GET = withErrorBoundary(handleGET);
