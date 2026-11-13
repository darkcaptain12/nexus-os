import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getActionEngine } from '@/lib/actions/engine-instance';

// Ürün yayınlama — Action Engine üzerinden. high risk + source:'ai' → engine
// otomatik Approval Queue'ya alır. Gerçek yayın onaysız çalışmaz.
const PublishSchema = z.object({
  queueId: z.string().uuid(),
});

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = PublishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const engine = getActionEngine();
  const execution = await engine.submit({
    actionId: 'commerce.publishProduct',
    params: { queueId: parsed.data.queueId },
    requestedBy: 'commerce-api',
    source: 'ai',
    priority: 2,
  });
  return NextResponse.json(
    { execution, requiresApproval: execution.status === 'pending-approval' },
    { status: 202 },
  );
}

export const POST = withErrorBoundary(handlePOST);
