import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getWorkflowRuntime, createWorkflowFromTemplate } from '@/lib/workflows/engine-instance';
import { listTemplates } from '@apex-os/workflow-engine';

async function handleGET() {
  const runtime = getWorkflowRuntime();
  return NextResponse.json({
    workflows: runtime.listWorkflows(),
    templates: listTemplates(),
    stats: runtime.getStats(),
  });
}

async function handlePOST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { templateId, workflow } = body as {
    templateId?: string;
    workflow?: Record<string, unknown>;
  };

  const runtime = getWorkflowRuntime();

  if (templateId) {
    const wf = createWorkflowFromTemplate(templateId, 'user');
    if (!wf) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    runtime.addWorkflow(wf);
    return NextResponse.json(wf, { status: 201 });
  }

  if (workflow) {
    const wf = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user',
      ...workflow,
    };
    runtime.addWorkflow(wf as import('@apex-os/workflow-engine').Workflow);
    return NextResponse.json(wf, { status: 201 });
  }

  return NextResponse.json({ error: 'templateId or workflow required' }, { status: 400 });
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
