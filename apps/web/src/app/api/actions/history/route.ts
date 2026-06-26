import { NextResponse } from 'next/server';
import { getActionEngine } from '@/lib/actions/engine-instance';

export async function GET() {
  const engine = getActionEngine();
  return NextResponse.json({
    history: engine.queue.getHistory(50),
    stats: engine.getStats(),
  });
}
