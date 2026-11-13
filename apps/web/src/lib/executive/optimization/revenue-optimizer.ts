import type { OptimizerRecommendation } from './types';
import { getRevenueMetrics } from '@/lib/commerce/intelligence/revenue-intelligence';
import { getRealizedSummary } from '@/lib/quant/live/portfolio-intelligence';
import { getJournalStats } from '@/lib/quant/live/trade-journal';

// Revenue Optimizer — Commerce + Trading BİRLİKTE değerlendirilir. Executive
// önerileri: ticarete daha fazla zaman ayır, reklam bütçesi artır, kârsız ürün
// kaldır, yüksek marjlı ürün bul. Yalnız öneri; gelir işlemi Approval üzerinden.

export interface RevenueOverview {
  commerceProfit: number;
  tradingPnl: number;
  totalNet: number;
  roas: number;
  currency: string;
  balance: 'commerce-leaning' | 'trading-leaning' | 'balanced';
  generatedAt: string;
}

/** Commerce + Trading birleşik gelir görünümü — gerçek verilerden. */
export async function getRevenueOverview(): Promise<RevenueOverview> {
  const revenue = await getRevenueMetrics().catch(() => null);
  const trading = getRealizedSummary().realizedPnl;
  const commerceProfit = revenue?.profit ?? 0;
  const totalNet = Number((commerceProfit + trading).toFixed(2));

  const abs = Math.abs(commerceProfit) + Math.abs(trading);
  const balance: RevenueOverview['balance'] =
    abs === 0
      ? 'balanced'
      : commerceProfit > trading * 1.5
        ? 'commerce-leaning'
        : trading > commerceProfit * 1.5
          ? 'trading-leaning'
          : 'balanced';

  return {
    commerceProfit,
    tradingPnl: trading,
    totalNet,
    roas: revenue?.roas ?? 0,
    currency: revenue?.currency ?? 'TRY',
    balance,
    generatedAt: new Date().toISOString(),
  };
}

/** Executive gelir önerileri — commerce+trading kaynak dağılımı. */
export async function getRevenueRecommendations(): Promise<OptimizerRecommendation[]> {
  const overview = await getRevenueOverview();
  const journalStats = getJournalStats();
  const recs: OptimizerRecommendation[] = [];
  const now = new Date().toISOString();

  // ROAS güçlüyse ticarete ağırlık öner
  if (overview.roas >= 4) {
    recs.push({
      id: crypto.randomUUID(),
      domain: 'revenue',
      action: 'Ticarete daha fazla zaman ayır',
      target: 'commerce',
      rationale: `ROAS ${overview.roas} güçlü — commerce kârı ${overview.commerceProfit} ${overview.currency}. Ölçeklenebilir.`,
      impact: 'high',
      requiresApproval: false,
      metrics: { roas: overview.roas, commerceProfit: overview.commerceProfit },
      generatedAt: now,
    });
  } else if (overview.roas > 0 && overview.roas < 2) {
    recs.push({
      id: crypto.randomUUID(),
      domain: 'revenue',
      action: 'Reklam verimliliğini düzelt',
      target: 'ads',
      rationale: `ROAS ${overview.roas} zayıf — bütçe artırmadan önce kreatif/hedefleme optimize et.`,
      impact: 'high',
      requiresApproval: false,
      metrics: { roas: overview.roas },
      generatedAt: now,
    });
  }

  // Trading zarardaysa risk azalt
  if (overview.tradingPnl < 0) {
    recs.push({
      id: crypto.randomUUID(),
      domain: 'revenue',
      action: "Trading riskini azalt, commerce'e kaydır",
      target: 'trading',
      rationale: `Trading realized PnL ${overview.tradingPnl}, win rate %${journalStats.winRate}. Sermayeyi daha stabil commerce'e yönlendir.`,
      impact: 'high',
      requiresApproval: false,
      metrics: { tradingPnl: overview.tradingPnl, winRate: journalStats.winRate },
      generatedAt: now,
    });
  } else if (overview.balance === 'trading-leaning' && overview.tradingPnl > 0) {
    recs.push({
      id: crypto.randomUUID(),
      domain: 'revenue',
      action: 'Yüksek marjlı ürün bul (commerce dengesi)',
      target: 'commerce',
      rationale: `Gelir trading ağırlıklı (${overview.tradingPnl} vs ${overview.commerceProfit}). Çeşitlendir — Hunter ile yüksek marjlı ürün tara.`,
      impact: 'medium',
      requiresApproval: false,
      metrics: { tradingPnl: overview.tradingPnl, commerceProfit: overview.commerceProfit },
      generatedAt: now,
    });
  }

  return recs;
}
