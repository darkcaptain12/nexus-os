import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { resumeAgent, resumeAfterApproval } from '@/lib/agents/agent-runtime';
import { getAgentStore } from '@/lib/agents/agent-store';

async function handlePOST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = getAgentStore().get(id);
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  if (agent.state === 'WAITING_APPROVAL') {
    const body = await req.json().catch(() => ({}));
    const approved = body.approved !== false;
    const updated = await resumeAfterApproval(id, approved);
    return NextResponse.json({ agent: updated });
  }

  const updated = resumeAgent(id);
  return NextResponse.json({ agent: updated });
}

export const POST = withErrorBoundary(handlePOST);
