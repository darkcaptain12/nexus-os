import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { livePositions, liveClosePosition } from '@/lib/quant/live/services/live-trading-service';

const CloseSchema = z.object({
  action: z.literal('close'),
  positionId: z.string().uuid(),
  exchange: z.enum(['binance', 'mexc', 'bybit', 'okx']).default('okx'),
});

async function handleGET() {
  return NextResponse.json({ positions: await livePositions() });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = CloseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const closed = await liveClosePosition(parsed.data.positionId, parsed.data.exchange);
  if (!closed) return NextResponse.json({ error: 'Pozisyon bulunamadı' }, { status: 404 });
  return NextResponse.json({ position: closed });
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
