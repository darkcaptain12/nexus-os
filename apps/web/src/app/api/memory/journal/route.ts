import { NextResponse } from 'next/server';
import { generateDailyJournal, getMemoryStore } from '@/lib/memory';

export async function GET(request: Request) {
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
