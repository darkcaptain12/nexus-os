import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getAlertEngine } from '@/lib/quant/alert-engine';
import { getCandles } from '@/lib/quant/market-data';

const CreateAlertSchema = z.object({
  symbol: z.string().min(3).max(20),
  exchange: z.enum(['binance', 'mexc', 'bybit', 'okx']).default('binance'),
  timeframe: z.enum(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w']).default('1h'),
  condition: z.enum(['price_above', 'price_below', 'rsi_above', 'rsi_below']),
  threshold: z.number(),
  message: z.string().max(200).optional(),
});

const EvaluateSchema = z.object({
  action: z.literal('evaluate'),
  symbol: z.string().min(3).max(20),
  exchange: z.enum(['binance', 'mexc', 'bybit', 'okx']).default('binance'),
  timeframe: z.enum(['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w']).default('1h'),
});

async function handleGET() {
  return NextResponse.json({ alerts: getAlertEngine().getAll() });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const evaluate = EvaluateSchema.safeParse(body);
  if (evaluate.success) {
    const { symbol, exchange, timeframe } = evaluate.data;
    const candles = await getCandles(exchange, symbol.toUpperCase(), timeframe, 100);
    const triggered = getAlertEngine().evaluate(symbol.toUpperCase(), candles);
    return NextResponse.json({ triggered });
  }

  const parsed = CreateAlertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const alert = getAlertEngine().create({
    ...parsed.data,
    symbol: parsed.data.symbol.toUpperCase(),
  });
  return NextResponse.json({ alert }, { status: 201 });
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
