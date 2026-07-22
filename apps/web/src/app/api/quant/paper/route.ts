import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getPaperTradingEngine } from '@/lib/quant/paper-trading';
import { resetPaperAccount } from '@/lib/quant/services/quant-service';

const ResetSchema = z.object({
  action: z.literal('reset'),
  startingBalance: z.number().positive().max(10_000_000).optional(),
});

async function handleGET() {
  return NextResponse.json({ account: getPaperTradingEngine().getState() });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const account = resetPaperAccount(parsed.data.startingBalance);
  return NextResponse.json({ account });
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
