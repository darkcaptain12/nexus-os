import type { IntelligenceScore } from './types';
import { getStrategyPerformance } from './trading-optimizer';
import { getAgentPerformance, getWorkflowPerformance } from './agent-optimizer';
import { getLearningReport } from './learning-engine';
import { getLatestSelfReview } from './self-review';
import { getJournalStats } from '@/lib/quant/live/trade-journal';
import { getRevenueMetrics } from '@/lib/commerce/intelligence/revenue-intelligence';

// Executive Intelligence Score — 6 boyut (Trading/Commerce/Workflow/Agent/
// Productivity/Learning) → tek 0-100 skor. Gerçek metriklerden hesaplanır.
// Ring buffer trend takibi.

const g = globalThis as unknown as { __apexIntelScores?: { overall: number; at: string }[] };
const MAX_HISTORY = 60;

function history(): { overall: number; at: string }[] {
  if (!g.__apexIntelScores) g.__apexIntelScores = [];
  return g.__apexIntelScores;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function tradingScore(): number {
  const stats = getJournalStats();
  if (stats.total === 0) return 50; // veri yok → nötr
  const perf = getStrategyPerformance();
  const avgPf =
    perf.length > 0 ? perf.reduce((s, p) => s + Math.min(p.profitFactor, 3), 0) / perf.length : 1;
  // win rate (0-100) %60 + profit factor (0-3→0-100) %40
  return clamp(stats.winRate * 0.6 + (avgPf / 3) * 100 * 0.4);
}

async function commerceScore(): Promise<number> {
  const revenue = await getRevenueMetrics().catch(() => null);
  if (!revenue || revenue.revenue === 0) return 50;
  const roasScore = Math.min(revenue.roas / 4, 1) * 100; // ROAS 4 = tam puan
  const marginScore =
    revenue.revenue > 0 ? Math.min(revenue.profit / revenue.revenue / 0.3, 1) * 100 : 0;
  const refundPenalty = Math.max(0, 100 - revenue.refundRate * 3);
  return clamp(roasScore * 0.5 + marginScore * 0.3 + refundPenalty * 0.2);
}

function workflowScore(): number {
  const wf = getWorkflowPerformance();
  if (wf.totalExecutions === 0) return 50;
  return clamp(100 - wf.failureRate - wf.redundantSteps.length * 3);
}

function agentScore(): number {
  const agent = getAgentPerformance();
  if (agent.total === 0) return 50;
  return clamp(agent.successRate - agent.errorRate * 0.5);
}

function learningScore(): number {
  const report = getLearningReport();
  const review = getLatestSelfReview();
  // Karar isabeti temel; öğrenilen ders sayısı öğrenme aktifliğini gösterir
  const accuracy = review?.accuracy ?? 50;
  const activity = Math.min(report.totalLessons * 5, 30); // öğrenme aktifliği bonusu
  const riskPenalty = report.highRiskCount * 4;
  return clamp(accuracy * 0.7 + activity - riskPenalty);
}

async function productivityScore(): Promise<number> {
  // Agent + workflow tamamlama verimini birleştir (gerçek üretkenlik proxy)
  const agent = getAgentPerformance();
  const wf = getWorkflowPerformance();
  const agentSide = agent.total > 0 ? agent.successRate : 50;
  const wfSide = wf.totalExecutions > 0 ? 100 - wf.failureRate : 50;
  return clamp(agentSide * 0.5 + wfSide * 0.5);
}

function grade(score: number): IntelligenceScore['grade'] {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/** 6 boyutlu Executive Intelligence Score hesapla + trend kaydet. */
export async function computeIntelligenceScore(): Promise<IntelligenceScore> {
  const [commerce, productivity] = await Promise.all([commerceScore(), productivityScore()]);
  const dimensions = {
    trading: tradingScore(),
    commerce,
    workflow: workflowScore(),
    agent: agentScore(),
    productivity,
    learning: learningScore(),
  };

  // Ağırlıklı ortalama: gelir boyutları (trading+commerce) daha ağır
  const overall = clamp(
    dimensions.trading * 0.22 +
      dimensions.commerce * 0.22 +
      dimensions.workflow * 0.14 +
      dimensions.agent * 0.14 +
      dimensions.productivity * 0.14 +
      dimensions.learning * 0.14,
  );

  const h = history();
  const prev = h[h.length - 1]?.overall;
  const trend: IntelligenceScore['trend'] =
    prev === undefined
      ? 'stable'
      : overall > prev + 2
        ? 'improving'
        : overall < prev - 2
          ? 'declining'
          : 'stable';

  h.push({ overall, at: new Date().toISOString() });
  if (h.length > MAX_HISTORY) h.shift();

  return {
    overall,
    dimensions,
    trend,
    grade: grade(overall),
    generatedAt: new Date().toISOString(),
  };
}

export function getIntelligenceScoreHistory(): { overall: number; at: string }[] {
  return [...history()];
}
