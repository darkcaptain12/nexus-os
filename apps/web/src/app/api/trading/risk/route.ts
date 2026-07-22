import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorBoundary } from '@/lib/observability/error-boundary';
import { liveRiskProfile, liveUpdateRisk } from '@/lib/quant/live/services/live-trading-service';

const RiskSchema = z.object({
  maxPositionSizePercent: z.number().min(0).max(100).optional(),
  maxDailyLossPercent: z.number().min(0).max(100).optional(),
  maxOpenPositions: z.number().int().min(0).max(100).optional(),
  maxLeverage: z.number().min(1).max(125).optional(),
  stopLossRequired: z.boolean().optional(),
  maxSymbolExposurePercent: z.number().min(0).max(100).optional(),
  maxDailyTrades: z.number().int().min(0).max(1000).optional(),
  blacklistedSymbols: z.array(z.string()).optional(),
  newsBlackoutActive: z.boolean().optional(),
  maxVolatilityAtrPercent: z.number().min(0).max(100).optional(),
});

async function handleGET() {
  return NextResponse.json({ risk: liveRiskProfile() });
}

async function handlePATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = RiskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  return NextResponse.json({ risk: liveUpdateRisk(parsed.data) });
}

export const GET = withErrorBoundary(handleGET);
export const PATCH = withErrorBoundary(handlePATCH);
