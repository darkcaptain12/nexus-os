import { NextResponse } from 'next/server';
import { getWorkflowRuntime } from '@/lib/workflows/engine-instance';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workflowId = searchParams.get('workflowId') ?? undefined;

  const runtime = getWorkflowRuntime();
  const history = runtime.getHistory(workflowId);

  return NextResponse.json({ history, total: history.length });
}
