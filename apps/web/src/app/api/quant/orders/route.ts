import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { getPaperTradingEngine } from '@/lib/quant/paper-trading';
import { getTicker } from '@/lib/quant/market-data';

const CreateOrderSchema = z.object({
  symbol: z.string().min(3).max(20),
  exchange: z.enum(['binance', 'mexc', 'bybit', 'okx']).default('binance'),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['market', 'limit']).default('market'),
  quantity: z.number().positive(),
  limitPrice: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
});

async function handleGET() {
  const state = getPaperTradingEngine().getState();
  return NextResponse.json({ orders: state.orders });
}

// Paper emir — gerçek borsaya emir gönderilmez. Agent akışındaki emirler ayrıca
// Approval Queue'dan geçer; bu uç manuel paper denemeleri içindir.
async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const ticker = await getTicker(input.exchange, input.symbol.toUpperCase());
  const order = getPaperTradingEngine().placeOrder({
    symbol: input.symbol.toUpperCase(),
    side: input.side,
    type: input.type,
    quantity: input.quantity,
    marketPrice: ticker.lastPrice,
    limitPrice: input.limitPrice,
    stopLoss: input.stopLoss,
    takeProfit: input.takeProfit,
    source: 'manual',
  });
  const status = order.status === 'rejected' ? 422 : 201;
  return NextResponse.json({ order }, { status });
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
