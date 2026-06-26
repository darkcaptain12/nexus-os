import { NextResponse } from 'next/server';
import { getActionEngine } from '@/lib/actions/engine-instance';

export async function GET() {
  const engine = getActionEngine();
  return NextResponse.json({
    pending: engine.approvals.getPending(),
    count: engine.approvals.getPending().length,
  });
}
