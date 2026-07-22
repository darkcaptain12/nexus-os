import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getWorkflowRuntime } from '@/lib/workflows/engine-instance';

async function handleGET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workflowId = searchParams.get('workflowId') ?? undefined;

  const runtime = getWorkflowRuntime();
  const history = runtime.getHistory(workflowId);

  return NextResponse.json({ history, total: history.length });
}

export const GET = withErrorBoundary(handleGET);
