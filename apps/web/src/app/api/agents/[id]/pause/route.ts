import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { pauseAgent } from '@/lib/agents/agent-runtime';

async function handlePOST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = pauseAgent(id);
  return NextResponse.json({ agent });
}

export const POST = withErrorBoundary(handlePOST);
