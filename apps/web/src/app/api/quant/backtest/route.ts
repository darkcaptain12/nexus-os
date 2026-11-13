import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { runBacktestForSymbol } from '@/lib/quant/services/quant-service';

const BacktestSchema = z.object({
  strategyId: z.string().min(1),
  symbol: z.string().min(3).max(20),
  exchange: z.enum(['binance', 'mexc', 'bybit', 'okx']).default('binance'),
  timeframe: z.enum(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w']).default('1h'),
  limit: z.coerce.number().int().min(50).max(1000).default(500),
  params: z.record(z.string(), z.number()).default({}),
});

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = BacktestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { strategyId, symbol, exchange, timeframe, limit, params } = parsed.data;
  const result = await runBacktestForSymbol(
    strategyId,
    exchange,
    symbol.toUpperCase(),
    timeframe,
    limit,
    params,
  );
  return NextResponse.json({ result });
}

export const POST = withErrorBoundary(handlePOST);
