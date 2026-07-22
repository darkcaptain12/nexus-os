import type { PortfolioIntelligence } from './types';
import type { ExchangeName } from '../types';
import { syncPositions } from '../position-manager';
import { getJournal } from './trade-journal';

// Portfolio Intelligence — Equity/Balance/Daily-Weekly-Monthly PnL/Drawdown/
// Exposure/Allocation. Mevcut syncPositions (paper account, gerçek fiyat) reuse.

const g = globalThis as unknown as { __apexEquityCurve?: { at: string; equity: number }[] };

function equityCurve(): { at: string; equity: number }[] {
  if (!g.__apexEquityCurve) g.__apexEquityCurve = [];
  return g.__apexEquityCurve;
}

function recordEquity(equity: number): void {
  const c = equityCurve();
  c.push({ at: new Date().toISOString(), equity });
  if (c.length > 1000) c.shift();
}

function pnlSince(sinceMs: number, currentEquity: number): number {
  const c = equityCurve();
  const cutoff = Date.now() - sinceMs;
  const past = c.find((p) => new Date(p.at).getTime() >= cutoff);
  return past ? Number((currentEquity - past.equity).toFixed(2)) : 0;
}

export async function getPortfolioIntelligence(
  exchange: ExchangeName = 'okx',
): Promise<PortfolioIntelligence> {
  const state = await syncPositions(exchange);
  recordEquity(state.equity);

  const DAY = 86_400_000;
  const exposure = state.openPositions.reduce((s, p) => s + p.entryPrice * p.quantity, 0);
  const allocation = state.openPositions.map((p) => {
    const value = Number((p.entryPrice * p.quantity).toFixed(2));
    return {
      symbol: p.symbol,
      value,
      percent: state.equity > 0 ? Number(((value / state.equity) * 100).toFixed(1)) : 0,
    };
  });

  // Max drawdown — equity curve üzerinden
  const curve = equityCurve();
  let peak = curve[0]?.equity ?? state.equity;
  let maxDd = 0;
  for (const p of curve) {
    if (p.equity > peak) peak = p.equity;
    const dd = peak > 0 ? ((peak - p.equity) / peak) * 100 : 0;
    if (dd > maxDd) maxDd = dd;
  }

  // Günlük PnL: journal + equity curve (paper todayPnl reuse)
  const todayPnl = state.todayPnl;

  return {
    equity: state.equity,
    balance: state.balance,
    dailyPnl: todayPnl,
    weeklyPnl: pnlSince(7 * DAY, state.equity),
    monthlyPnl: pnlSince(30 * DAY, state.equity),
    maxDrawdownPercent: Number(maxDd.toFixed(2)),
    exposure: Number(exposure.toFixed(2)),
    exposurePercent: state.equity > 0 ? Number(((exposure / state.equity) * 100).toFixed(1)) : 0,
    allocation,
    openPositionCount: state.openPositions.length,
    currency: state.currency,
    generatedAt: new Date().toISOString(),
  };
}

/** Journal bazlı realized PnL özeti (portfolio için). */
export function getRealizedSummary(): { realizedPnl: number; tradeCount: number } {
  const closed = getJournal(500).filter((e) => e.result !== 'open');
  return {
    realizedPnl: Number(closed.reduce((s, e) => s + e.pnl, 0).toFixed(2)),
    tradeCount: closed.length,
  };
}
