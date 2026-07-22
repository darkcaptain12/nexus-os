import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { liveJournal, liveCloseAndReview } from '@/lib/quant/live/services/live-trading-service';

const CloseSchema = z.object({
  action: z.literal('close'),
  journalId: z.string().uuid(),
  exitPrice: z.number().positive(),
});

async function handleGET() {
  return NextResponse.json(liveJournal());
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = CloseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const result = liveCloseAndReview(parsed.data.journalId, parsed.data.exitPrice);
  if (!result)
    return NextResponse.json({ error: 'Journal kaydı bulunamadı veya kapalı' }, { status: 404 });
  return NextResponse.json(result);
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
