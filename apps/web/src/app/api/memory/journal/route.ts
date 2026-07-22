import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { generateDailyJournal, getMemoryStore } from '@/lib/memory';

async function handleGET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') ?? undefined;

  const store = getMemoryStore();
  const existing = date ? store.getJournal(date) : null;

  if (existing) {
    return NextResponse.json(existing);
  }

  const journal = generateDailyJournal(date);
  return NextResponse.json(journal);
}

export const GET = withErrorBoundary(handleGET);
