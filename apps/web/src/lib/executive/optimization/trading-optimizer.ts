import type { StrategyPerformance, OptimizerRecommendation } from './types';
import { getJournal } from '@/lib/quant/live/trade-journal';
import { listStrategies } from '@/lib/quant/strategy-engine';
import type { TradeJournalEntry } from '@/lib/quant/live/types';

// Trading Optimizer — her strateji için Win Rate / Profit Factor / Sharpe-benzeri
// skor / Drawdown / ortalama işlem süresi. Executive ÖNERİ üretir (pasifle/öne
// çıkar). GERÇEK ayar değişikliği YAPMAZ — yalnız öneri.

function minutesBetween(a: string, b: string): number {
  return Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 60_000);
}

/** Strateji bazında gerçek journal işlemlerinden performans hesapla. */
export function getStrategyPerformance(): StrategyPerformance[] {
  const closed = getJournal(500).filter((t) => t.result !== 'open');
  const byStrategy = new Map<string, TradeJournalEntry[]>();

  for (const t of closed) {
    const key = t.strategy ?? 'manuel';
    const arr = byStrategy.get(key) ?? [];
    arr.push(t);
    byStrategy.set(key, arr);
  }

  const results: StrategyPerformance[] = [];
  for (const [strategy, trades] of byStrategy) {
    const wins = trades.filter((t) => t.result === 'win');
    const losses = trades.filter((t) => t.result === 'loss');
    const winRate = trades.length > 0 ? Math.round((wins.length / trades.length) * 100) : 0;

    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const profitFactor =
      grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 99 : 0;

    // Sharpe-benzeri: ortalama getiri / standart sapma (işlem PnL dağılımı)
    const pnls = trades.map((t) => t.pnl);
    const mean = pnls.reduce((s, v) => s + v, 0) / pnls.length;
    const variance = pnls.reduce((s, v) => s + (v - mean) ** 2, 0) / pnls.length;
    const std = Math.sqrt(variance);
    const sharpeLike = std > 0 ? Number((mean / std).toFixed(2)) : mean > 0 ? 2 : 0;

    // Max drawdown — strateji equity curve üzerinden
    let peak = 0;
    let cum = 0;
    let maxDd = 0;
    for (const t of [...trades].sort((a, b) => a.openedAt.localeCompare(b.openedAt))) {
      cum += t.pnl;
      if (cum > peak) peak = cum;
      const dd = peak > 0 ? ((peak - cum) / peak) * 100 : 0;
      if (dd > maxDd) maxDd = dd;
    }

    const durations = trades
      .filter((t) => t.closedAt)
      .map((t) => minutesBetween(t.openedAt, t.closedAt!));
    const avgTradeMinutes =
      durations.length > 0
        ? Math.round(durations.reduce((s, v) => s + v, 0) / durations.length)
        : 0;

    const totalPnl = Number(pnls.reduce((s, v) => s + v, 0).toFixed(2));

    // Verdict: yüksek winRate + profitFactor → öne çıkar; düşük → pasifle öner
    const verdict: StrategyPerformance['verdict'] =
      trades.length >= 3 && winRate >= 55 && profitFactor >= 1.5
        ? 'promote'
        : trades.length >= 3 && (winRate < 40 || profitFactor < 1)
          ? 'demote'
          : 'keep';

    results.push({
      strategy,
      trades: trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate,
      profitFactor,
      sharpeLike,
      maxDrawdownPercent: Number(maxDd.toFixed(2)),
      avgTradeMinutes,
      totalPnl,
      verdict,
    });
  }

  return results.sort((a, b) => b.profitFactor - a.profitFactor);
}

/** Executive önerileri — strateji pasifle/öne çıkar. ASLA otomatik uygulanmaz. */
export function getTradingRecommendations(): OptimizerRecommendation[] {
  const perf = getStrategyPerformance();
  const known = new Set(listStrategies().map((s) => s.id));
  const recs: OptimizerRecommendation[] = [];

  for (const p of perf) {
    if (p.verdict === 'demote') {
      recs.push({
        id: crypto.randomUUID(),
        domain: 'trading',
        action: 'Düşük performanslı stratejiyi pasif öner',
        target: p.strategy,
        rationale: `Win rate %${p.winRate}, profit factor ${p.profitFactor}, ${p.trades} işlem — beklentinin altında.`,
        impact: p.totalPnl < 0 ? 'high' : 'medium',
        requiresApproval: false, // yalnız öneri; ayar değişikliği kullanıcıda
        metrics: {
          winRate: p.winRate,
          profitFactor: p.profitFactor,
          totalPnl: p.totalPnl,
          maxDrawdown: p.maxDrawdownPercent,
        },
        generatedAt: new Date().toISOString(),
      });
    } else if (p.verdict === 'promote') {
      recs.push({
        id: crypto.randomUUID(),
        domain: 'trading',
        action: 'Başarılı stratejiyi öne çıkar',
        target: p.strategy,
        rationale: `Win rate %${p.winRate}, profit factor ${p.profitFactor}, Sharpe-benzeri ${p.sharpeLike} — güçlü.${known.has(p.strategy) ? '' : ' (manuel işlemler)'}`,
        impact: 'medium',
        requiresApproval: false,
        metrics: {
          winRate: p.winRate,
          profitFactor: p.profitFactor,
          sharpeLike: p.sharpeLike,
          totalPnl: p.totalPnl,
        },
        generatedAt: new Date().toISOString(),
      });
    }
  }

  return recs;
}
