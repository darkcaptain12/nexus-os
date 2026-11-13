import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getWorkflowRuntime } from '@/lib/workflows/engine-instance';

async function handlePOST(request: Request) {
  const { workflowId } = await request.json().catch(() => ({}));
  if (!workflowId) return NextResponse.json({ error: 'workflowId required' }, { status: 400 });

  const runtime = getWorkflowRuntime();
  const wf = runtime.getWorkflow(workflowId);
  if (!wf) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });

  wf.status = 'enabled';
  wf.updatedAt = new Date().toISOString();
  return NextResponse.json(wf);
}

export const POST = withErrorBoundary(handlePOST);
