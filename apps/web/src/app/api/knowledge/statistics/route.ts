import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getKnowledgeGraph } from '@/lib/knowledge/graph-store';

async function handleGET() {
  return NextResponse.json({ statistics: getKnowledgeGraph().getStatistics() });
}

export const GET = withErrorBoundary(handleGET);
