import { NextResponse } from 'next/server';
import { getWorkflowRuntime } from '@/lib/workflows/engine-instance';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { workflowId, variables } = body as { workflowId?: string; variables?: Record<string, unknown> };

  if (!workflowId) return NextResponse.json({ error: 'workflowId required' }, { status: 400 });

  const runtime = getWorkflowRuntime();

  try {
    const execution = await runtime.run(workflowId, 'user', variables);
    return NextResponse.json(execution);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
