import { NextResponse } from 'next/server';
import { getActionEngine } from '@/lib/actions/engine-instance';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { approvalId, reason } = body as { approvalId?: string; reason?: string };

  if (!approvalId) {
    return NextResponse.json({ error: 'approvalId required' }, { status: 400 });
  }

  const engine = getActionEngine();
  const approval = engine.rejectExecution(approvalId, 'user', reason);

  if (!approval) {
    return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
  }

  return NextResponse.json(approval);
}
