import type { WeeklyCeoReport, MonthlyReview } from './types';
import { runSelfReview } from './self-review';
import { getLearningReport } from './learning-engine';
import { getRevenueOverview, getRevenueRecommendations } from './revenue-optimizer';
import { getStrategyPerformance } from './trading-optimizer';
import { computeIntelligenceScore } from './intelligence-score';
import { getGoalPriorities } from './goal-engine';
import { getJournalStats } from '@/lib/quant/live/trade-journal';
import { getRevenueMetrics } from '@/lib/commerce/intelligence/revenue-intelligence';
import { getWorkflowRuntime } from '@/lib/workflows/engine-instance';
import { getRecentAdMetrics } from '@/lib/commerce/intelligence/ad-optimizer';
import { getDecisionHistory } from '@/lib/ai/decision-history';
import { getMemoryStore } from '@/lib/memory/store';

// Weekly CEO Report + Monthly Review — otomatik oluşturulur. Tüm optimizer'ları
// aggregate eder (reuse). Memory'ye activity summary olarak yazar.

function weekBounds(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/** Haftalık CEO raporu — kazanç/kayıp/en iyi-kötü karar/dersler/plan/risk/öneri. */
export async function generateWeeklyCeoReport(): Promise<WeeklyCeoReport> {
  const { start, end } = weekBounds();
  const [revenue, intelligence, revenueRecs, priorities] = await Promise.all([
    getRevenueOverview(),
    computeIntelligenceScore(),
    getRevenueRecommendations(),
    getGoalPriorities(),
  ]);

  const review = runSelfReview();
  const learning = getLearningReport();
  const journalStats = getJournalStats();
  const wfStats = getWorkflowRuntime().getStats();
  const failedAds = getRecentAdMetrics(100).filter((a) => a.spend > 0 && a.roas < 1).length;

  // En iyi/kötü karar — decision history sonuçlarından
  const decisions = getDecisionHistory().getHistory(100);
  const best = decisions.find((d) => d.actualResult === 'successful');
  const worst = decisions.find((d) => d.actualResult === 'failed');

  const nextWeekPlan = priorities
    .filter((p) => p.status !== 'achieved')
    .slice(0, 3)
    .map((p) => `${p.goal.label}: %${Math.min(p.percent, 100)} tamam, kalan ${p.gap}`);

  const risks: string[] = [];
  if (revenue.tradingPnl < 0)
    risks.push(`Trading zararda (${revenue.tradingPnl} ${revenue.currency})`);
  if (revenue.roas > 0 && revenue.roas < 1)
    risks.push(`ROAS ${revenue.roas} < 1 — reklamlar zarar ediyor`);
  if (learning.highRiskCount > 0)
    risks.push(`${learning.highRiskCount} yüksek riskli tekrar tespit edildi`);
  if (review.accuracy < 40 && review.correct + review.wrong > 0)
    risks.push(`Karar isabeti düşük (%${review.accuracy})`);

  const report: WeeklyCeoReport = {
    weekStart: start,
    weekEnd: end,
    earnings: {
      tradingPnl: revenue.tradingPnl,
      commerceProfit: revenue.commerceProfit,
      total: revenue.totalNet,
      currency: revenue.currency,
    },
    losses: {
      failedTrades: journalStats.losses,
      failedAds,
      failedWorkflows: wfStats.todayFailures,
    },
    bestDecision: best?.decision ?? 'Bu hafta sonuçlanmış başarılı karar yok.',
    worstDecision: worst?.decision ?? 'Bu hafta başarısız karar kaydı yok.',
    lessons: learning.lessons.slice(0, 5).map((l) => `${l.cause} → ${l.prevention}`),
    nextWeekPlan:
      nextWeekPlan.length > 0 ? nextWeekPlan : ['Tüm hedefler yolunda — mevcut tempoyu koru.'],
    risks: risks.length > 0 ? risks : ['Kritik risk tespit edilmedi.'],
    recommendations: revenueRecs.map((r) => `${r.action}: ${r.rationale}`),
    intelligenceScore: intelligence.overall,
    generatedAt: new Date().toISOString(),
  };

  // Memory'ye haftalık özet yaz (Executive Context reuse eder)
  getMemoryStore().addTimelineEntry({
    source: 'decision',
    title: `CEO Raporu ${start}–${end}`,
    description: `Net ${report.earnings.total} ${report.earnings.currency}, Intelligence ${report.intelligenceScore}/100. ${report.recommendations.length} öneri, ${report.risks.length} risk.`,
    timestamp: report.generatedAt,
    metadata: {
      intelligenceScore: report.intelligenceScore,
      net: report.earnings.total,
      weekStart: start,
    },
  });

  return report;
}

/** Aylık review — toplam gelir/kâr + trading/commerce performansı + strateji. */
export async function generateMonthlyReview(): Promise<MonthlyReview> {
  const [revenueMetrics, intelligence] = await Promise.all([
    getRevenueMetrics().catch(() => null),
    computeIntelligenceScore(),
  ]);
  const strategies = getStrategyPerformance();
  const journalStats = getJournalStats();

  const promoted = strategies.filter((s) => s.verdict === 'promote').map((s) => s.strategy);
  const demoted = strategies.filter((s) => s.verdict === 'demote').map((s) => s.strategy);
  const best = strategies[0]?.strategy ?? null;
  const worst = strategies[strategies.length - 1]?.strategy ?? null;

  return {
    month: new Date().toISOString().slice(0, 7),
    totalRevenue: revenueMetrics?.revenue ?? 0,
    totalProfit: revenueMetrics?.profit ?? 0,
    currency: revenueMetrics?.currency ?? 'TRY',
    trading: {
      totalPnl: journalStats.totalPnl,
      winRate: journalStats.winRate,
      bestStrategy: best,
      worstStrategy: worst,
    },
    commerce: {
      revenue: revenueMetrics?.revenue ?? 0,
      roas: revenueMetrics?.roas ?? 0,
      bestProduct: null, // ürün-bazlı satış verisi yok — commerce-optimizer öneri katmanında
    },
    topStrategies: promoted,
    worstStrategies: demoted,
    intelligenceScore: intelligence.overall,
    generatedAt: new Date().toISOString(),
  };
}
