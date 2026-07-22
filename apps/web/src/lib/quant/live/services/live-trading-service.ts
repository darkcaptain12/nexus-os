import type { LiveOrderInput, LivePositionView, TradeReview } from '../types';
import type { ExchangeName } from '../../types';
import { submitLiveOrder, getLiveOrders } from '../live-order-engine';
import { getPortfolioIntelligence, getRealizedSummary } from '../portfolio-intelligence';
import { getRiskProfileV2, updateRiskProfileV2 } from '../risk-engine-v2';
import { getJournal, getJournalStats, getJournalEntry } from '../trade-journal';
import { closeWithReview, reviewTrade } from '../ai-trade-review';
import { getLiveAlerts } from '../live-alerts';
import { syncPositions, closePosition } from '../../position-manager';
import { listStrategies } from '../../strategy-engine';
import { getKillSwitchStatus, armLiveTrading, disarmLiveTrading } from '../kill-switch';
import { withCache } from '@/lib/cache';

// Live Trading Service — mobil/voice/dashboard facade. Düz JSON. Mevcut
// paper/position/strategy/risk servislerini reuse eder. Ağır okuma TTL cache.

export function liveSubmitOrder(input: LiveOrderInput) {
  return submitLiveOrder(input);
}

export function liveOrders() {
  return getLiveOrders();
}

export async function livePositions(exchange: ExchangeName = 'okx'): Promise<LivePositionView[]> {
  const state = await syncPositions(exchange);
  return state.openPositions.map(
    (p): LivePositionView => ({
      symbol: p.symbol,
      direction: p.direction,
      quantity: p.quantity,
      averageCost: p.entryPrice,
      markPrice: p.entryPrice, // syncPositions fiyatı entry'ye yakın tutar; gerçek mark ticker'dan
      unrealizedPnl: p.pnl,
      realizedPnl: 0,
      leverage: 1,
      margin: Number((p.entryPrice * p.quantity).toFixed(2)),
      riskScore: 40,
    }),
  );
}

export function livePortfolio(exchange: ExchangeName = 'okx') {
  return withCache('live:portfolio', 10_000, () => getPortfolioIntelligence(exchange));
}

export function liveRiskProfile() {
  return getRiskProfileV2();
}

export function liveUpdateRisk(patch: Parameters<typeof updateRiskProfileV2>[0]) {
  return updateRiskProfileV2(patch);
}

export function liveJournal(limit?: number) {
  return { entries: getJournal(limit), stats: getJournalStats() };
}

export function liveCloseAndReview(journalId: string, exitPrice: number) {
  return closeWithReview(journalId, exitPrice);
}

export function liveReview(journalId: string): TradeReview | null {
  const entry = getJournalEntry(journalId);
  return entry ? reviewTrade(entry) : null;
}

export function liveStrategies() {
  return listStrategies();
}

export function liveAlerts(limit?: number) {
  return getLiveAlerts(limit);
}

// ─── Kill-Switch (gerçek para trading son kapısı) ───────────────────────────
// Gerçek borsa emri için env LIVE_TRADING_ENABLED + runtime arm ikisi de açık
// olmalı. Varsayılan KAPALI (paper). armLiveTrading yalnız runtime kilidini açar.

export function liveKillSwitchStatus() {
  return getKillSwitchStatus();
}

export function liveArm() {
  return armLiveTrading();
}

export function liveDisarm() {
  return disarmLiveTrading();
}

export async function liveClosePosition(positionId: string, exchange: ExchangeName = 'okx') {
  return closePosition(positionId, exchange);
}

// ─── Voice/Mobile kompakt özet ───────────────────────────────────────────────

export async function liveTradingSummary(exchange: ExchangeName = 'okx') {
  const [portfolio, realized] = await Promise.all([
    getPortfolioIntelligence(exchange).catch(() => null),
    Promise.resolve(getRealizedSummary()),
  ]);
  const journal = getJournalStats();
  return {
    equity: portfolio?.equity ?? 0,
    dailyPnl: portfolio?.dailyPnl ?? 0,
    openPositions: portfolio?.openPositionCount ?? 0,
    exposurePercent: portfolio?.exposurePercent ?? 0,
    drawdown: portfolio?.maxDrawdownPercent ?? 0,
    winRate: journal.winRate,
    realizedPnl: realized.realizedPnl,
    generatedAt: new Date().toISOString(),
  };
}
