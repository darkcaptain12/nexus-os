import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getMemoryStore } from '@/lib/memory';
import type { MemorySearchQuery, MemorySource } from '@/lib/memory';

async function handleGET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query: MemorySearchQuery = {
    keyword: searchParams.get('q') ?? undefined,
    source: (searchParams.get('source') as MemorySource) ?? undefined,
    dateFrom: searchParams.get('from') ?? undefined,
    dateTo: searchParams.get('to') ?? undefined,
    project: searchParams.get('project') ?? undefined,
  };

  const store = getMemoryStore();
  const result = store.search(query);

  return NextResponse.json(result);
}

export const GET = withErrorBoundary(handleGET);
