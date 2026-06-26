import { NextResponse } from 'next/server';
import { getActionEngine } from '@/lib/actions/engine-instance';

export async function POST(request: Request) {
  let body: { actionId: string; params: Record<string, unknown>; source?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.actionId) {
    return NextResponse.json({ error: 'actionId required' }, { status: 400 });
  }

  const engine = getActionEngine();

  try {
    const execution = await engine.submit({
      actionId: body.actionId,
      params: body.params ?? {},
      requestedBy: 'user',
      source: (body.source as 'user' | 'ai') ?? 'user',
      priority: 5,
    });

    if (execution.status === 'queued') {
      const result = await engine.processNext();
      return NextResponse.json(result ?? execution);
    }

    return NextResponse.json(execution);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
