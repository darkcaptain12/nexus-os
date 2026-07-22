import { withCache } from '@/lib/cache';
import { runSelfReview, getLatestSelfReview, getSelfReviewHistory } from '../self-review';
import { learnFromFailures, getLearningReport, getLessons } from '../learning-engine';
import { getGoals, setGoal, removeGoal, getGoalProgress, getGoalPriorities } from '../goal-engine';
import { getRevenueOverview, getRevenueRecommendations } from '../revenue-optimizer';
import { getStrategyPerformance, getTradingRecommendations } from '../trading-optimizer';
import { getProductPerformance, getCommerceRecommendations } from '../commerce-optimizer';
import {
  getAgentPerformance,
  getWorkflowPerformance,
  getAgentWorkflowRecommendations,
} from '../agent-optimizer';
import { computeIntelligenceScore, getIntelligenceScoreHistory } from '../intelligence-score';
import { generateWeeklyCeoReport, generateMonthlyReview } from '../ceo-report';
import type { GoalMetric, GoalPeriod, OptimizerRecommendation } from '../types';

/**
 * Self-Optimization Service — framework-bağımsız facade. APEX kendi
 * performansını analiz eder, ÖNERİ üretir. Gelir etkileyen aksiyon Approval
 * Queue üzerinden. Ağır okumalar TTL cache arkasında. Mobil/watch/dashboard
 * aynı düz JSON sözleşmesini kullanır.
 */

// ─── Self Review + Learning ──────────────────────────────────────────────────

/** Günlük self review çalıştır + çıkan başarısızlıklardan ders öğren. */
export function runDailyReview() {
  const review = runSelfReview();
  const lessons = learnFromFailures(review.failures);
  return { review, newLessons: lessons.length };
}

export function selfReview() {
  return getLatestSelfReview() ?? runSelfReview();
}

export function selfReviewHistory(limit?: number) {
  return getSelfReviewHistory(limit);
}

export function learningReport() {
  return getLearningReport();
}

export function lessons(domain?: Parameters<typeof getLessons>[0], limit?: number) {
  return getLessons(domain, limit);
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export function goals() {
  return getGoals();
}

export function goalProgress() {
  return getGoalProgress();
}

export function goalPriorities() {
  return getGoalPriorities();
}

export function createGoal(input: {
  label: string;
  metric: GoalMetric;
  target: number;
  period: GoalPeriod;
}) {
  return setGoal(input);
}

export function deleteGoal(id: string) {
  return removeGoal(id);
}

// ─── Optimizers (öneriler) ───────────────────────────────────────────────────

export function revenueOverview() {
  return withCache('exec:revenue-overview', 15_000, () => getRevenueOverview());
}

export function tradingPerformance() {
  return getStrategyPerformance();
}

export function commercePerformance() {
  return withCache('exec:commerce-perf', 15_000, () => getProductPerformance());
}

export function agentPerformance() {
  return getAgentPerformance();
}

export function workflowPerformance() {
  return getWorkflowPerformance();
}

/** Tüm optimizer önerileri — tek düz liste (Approval gereksinimi işaretli). */
export async function allRecommendations(): Promise<OptimizerRecommendation[]> {
  const [revenue, commerce] = await Promise.all([
    getRevenueRecommendations(),
    getCommerceRecommendations(),
  ]);
  return [
    ...revenue,
    ...getTradingRecommendations(),
    ...commerce,
    ...getAgentWorkflowRecommendations(),
  ];
}

/** Approval gerektiren öneriler (gelir etkileyen — commerce ölçek/reklam/fiyat). */
export async function recommendationsRequiringApproval(): Promise<OptimizerRecommendation[]> {
  return (await allRecommendations()).filter((r) => r.requiresApproval);
}

// ─── Intelligence Score ──────────────────────────────────────────────────────

export function intelligenceScore() {
  return withCache('exec:intelligence-score', 10_000, () => computeIntelligenceScore());
}

export function intelligenceScoreTrend() {
  return getIntelligenceScoreHistory();
}

// ─── CEO Report ──────────────────────────────────────────────────────────────

export function weeklyCeoReport() {
  return withCache('exec:ceo-weekly', 30_000, () => generateWeeklyCeoReport());
}

export function monthlyReview() {
  return withCache('exec:ceo-monthly', 60_000, () => generateMonthlyReview());
}

// ─── Aggregate (dashboard/mobile home) ───────────────────────────────────────

export async function optimizationDashboard() {
  const [score, revenue, review, learning, recs] = await Promise.all([
    computeIntelligenceScore(),
    getRevenueOverview(),
    Promise.resolve(getLatestSelfReview() ?? runSelfReview()),
    Promise.resolve(getLearningReport()),
    allRecommendations(),
  ]);
  return {
    intelligenceScore: score,
    revenue,
    selfReview: {
      accuracy: review.accuracy,
      failures: review.failures.length,
      summary: review.summary,
    },
    learning: {
      totalLessons: learning.totalLessons,
      highRisk: learning.highRiskCount,
      insight: learning.topInsight,
    },
    recommendationCount: recs.length,
    approvalRequired: recs.filter((r) => r.requiresApproval).length,
    generatedAt: new Date().toISOString(),
  };
}

/** Apple Watch özeti — günlük hedef / Intelligence Score / bugünkü kâr / kritik öneri. */
export async function watchOptimizationView() {
  const [score, priorities, revenue, recs] = await Promise.all([
    computeIntelligenceScore(),
    getGoalPriorities(),
    getRevenueOverview(),
    allRecommendations(),
  ]);
  const critical = recs.find((r) => r.impact === 'critical' || r.impact === 'high');
  const dailyGoal = priorities.find((p) => p.goal.period === 'daily') ?? priorities[0];
  return {
    intelligenceScore: score.overall,
    grade: score.grade,
    dailyGoal: dailyGoal
      ? {
          label: dailyGoal.goal.label,
          percent: Math.min(dailyGoal.percent, 100),
          status: dailyGoal.status,
        }
      : null,
    todayProfit: revenue.totalNet,
    currency: revenue.currency,
    criticalRecommendation: critical ? `${critical.action}: ${critical.target}` : null,
    generatedAt: new Date().toISOString(),
  };
}

/** Mobil CEO/score özeti — düz JSON (iPhone/Watch). */
export async function mobileOptimizationView() {
  const [score, priorities, review] = await Promise.all([
    computeIntelligenceScore(),
    getGoalPriorities(),
    Promise.resolve(getLatestSelfReview() ?? runSelfReview()),
  ]);
  return {
    intelligenceScore: score.overall,
    grade: score.grade,
    trend: score.trend,
    topGoal: priorities[0]
      ? {
          label: priorities[0].goal.label,
          percent: Math.min(priorities[0].percent, 100),
          status: priorities[0].status,
        }
      : null,
    reviewSummary: review.summary,
    generatedAt: new Date().toISOString(),
  };
}
