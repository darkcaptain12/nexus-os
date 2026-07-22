import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getMemoryStore } from '@/lib/memory';
import type { MemorySource } from '@/lib/memory';

async function handleGET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') ?? undefined;
  const source = (searchParams.get('source') as MemorySource) ?? undefined;
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);

  const store = getMemoryStore();
  const entries = store.getTimeline(date, source, limit);
  const stats = store.getStats();

  return NextResponse.json({ entries, total: entries.length, stats });
}

export const GET = withErrorBoundary(handleGET);
