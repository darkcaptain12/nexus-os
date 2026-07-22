import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getMarketSnapshot } from '@/lib/quant/services/quant-service';

const QuerySchema = z.object({
  symbol: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[A-Z0-9]+$/i),
  exchange: z.enum(['binance', 'mexc', 'bybit', 'okx']).default('binance'),
  timeframe: z.enum(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w']).default('1h'),
  limit: z.coerce.number().int().min(20).max(1000).default(200),
});

async function handleGET(req: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { symbol, exchange, timeframe, limit } = parsed.data;
  const snapshot = await getMarketSnapshot(exchange, symbol.toUpperCase(), timeframe, limit);
  return NextResponse.json(snapshot);
}

export const GET = withErrorBoundary(handleGET);
