import { NextResponse } from 'next/server';
import { getActionEngine } from '@/lib/actions/engine-instance';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { approvalId } = body as { approvalId?: string };

  if (!approvalId) {
    return NextResponse.json({ error: 'approvalId required' }, { status: 400 });
  }

  const engine = getActionEngine();
  const execution = await engine.approveExecution(approvalId, 'user');

  if (!execution) {
    return NextResponse.json({ error: 'Approval not found or expired' }, { status: 404 });
  }

  const result = await engine.processNext();
  return NextResponse.json(result ?? execution);
}
