import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import {
  liveSubmitOrder,
  liveKillSwitchStatus,
  liveArm,
  liveDisarm,
} from '@/lib/quant/live/services/live-trading-service';

// okx-trade node:crypto (HMAC imza) kullanır → Node.js runtime zorunlu (Edge değil)
export const runtime = 'nodejs';

// Canlı emir — Risk v2 geçerse Action Engine → Approval Queue. Onaysız borsaya gitmez.
const LiveOrderSchema = z.object({
  exchange: z.enum(['binance', 'mexc', 'bybit', 'okx']).default('okx'),
  symbol: z.string().min(3).max(20),
  side: z.enum(['buy', 'sell']),
  type: z
    .enum(['market', 'limit', 'stop', 'stop_limit', 'oco', 'tp', 'sl', 'trailing_stop'])
    .default('market'),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
  stopPrice: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  trailingPercent: z.number().positive().max(50).optional(),
  leverage: z.number().min(1).max(125).optional(),
  reason: z.string().max(300).optional(),
  strategy: z.string().max(50).optional(),
});

const KillSwitchSchema = z.object({
  action: z.enum(['arm', 'disarm']),
});

async function handleGET() {
  // Kill-switch durumu (live/paper mod)
  return NextResponse.json({ killSwitch: liveKillSwitchStatus() });
}

async function handlePOST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  // Kill-switch arm/disarm
  const ks = KillSwitchSchema.safeParse(body);
  if (ks.success) {
    const result = ks.data.action === 'arm' ? liveArm() : liveDisarm();
    return NextResponse.json({ killSwitch: { ...liveKillSwitchStatus(), ...result } });
  }

  const parsed = LiveOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const result = await liveSubmitOrder({
    ...parsed.data,
    symbol: parsed.data.symbol.toUpperCase(),
  });
  const status = result.rejected ? 422 : 202;
  return NextResponse.json(result, { status });
}

export const GET = withErrorBoundary(handleGET);
export const POST = withErrorBoundary(handlePOST);
