import { describe, it, expect } from 'vitest';
import {
  computeIntelligenceScore,
  getIntelligenceScoreHistory,
} from '../src/lib/executive/optimization/intelligence-score';
import {
  generateWeeklyCeoReport,
  generateMonthlyReview,
} from '../src/lib/executive/optimization/ceo-report';
import {
  optimizationDashboard,
  mobileOptimizationView,
  watchOptimizationView,
  allRecommendations,
  recommendationsRequiringApproval,
} from '../src/lib/executive/optimization/services/self-optimization-service';
import { getMemoryStore } from '../src/lib/memory/store';

describe('Executive Intelligence Score', () => {
  it('6 boyut → tek 0-100 skor + grade + trend', async () => {
    const score = await computeIntelligenceScore();
    expect(score.overall).toBeGreaterThanOrEqual(0);
    expect(score.overall).toBeLessThanOrEqual(100);
    for (const dim of [
      'trading',
      'commerce',
      'workflow',
      'agent',
      'productivity',
      'learning',
    ] as const) {
      expect(score.dimensions[dim]).toBeGreaterThanOrEqual(0);
      expect(score.dimensions[dim]).toBeLessThanOrEqual(100);
    }
    expect(['A', 'B', 'C', 'D', 'F']).toContain(score.grade);
    expect(['improving', 'stable', 'declining']).toContain(score.trend);
  });

  it('trend history kaydeder', async () => {
    await computeIntelligenceScore();
    await computeIntelligenceScore();
    expect(getIntelligenceScoreHistory().length).toBeGreaterThanOrEqual(2);
  });
});

describe('CEO Report', () => {
  it("haftalık rapor tüm başlıkları içerir + Memory'ye yazar", async () => {
    const before = getMemoryStore().getStats().timelineEntries;
    const report = await generateWeeklyCeoReport();
    expect(report).toHaveProperty('earnings');
    expect(report).toHaveProperty('losses');
    expect(report).toHaveProperty('bestDecision');
    expect(report).toHaveProperty('worstDecision');
    expect(Array.isArray(report.lessons)).toBe(true);
    expect(Array.isArray(report.nextWeekPlan)).toBe(true);
    expect(Array.isArray(report.risks)).toBe(true);
    expect(Array.isArray(report.recommendations)).toBe(true);
    expect(report.intelligenceScore).toBeGreaterThanOrEqual(0);
    // Memory timeline'a yazıldı
    expect(getMemoryStore().getStats().timelineEntries).toBeGreaterThan(before);
  });

  it('aylık review: gelir/kâr/trading/commerce/strateji', async () => {
    const review = await generateMonthlyReview();
    expect(review.month).toMatch(/^\d{4}-\d{2}$/);
    expect(review.trading).toHaveProperty('winRate');
    expect(review.commerce).toHaveProperty('roas');
    expect(Array.isArray(review.topStrategies)).toBe(true);
    expect(Array.isArray(review.worstStrategies)).toBe(true);
  });
});

describe('Self-Optimization Service — facade', () => {
  it('optimization dashboard tüm alanları döner (düz JSON)', async () => {
    const d = await optimizationDashboard();
    expect(d).toHaveProperty('intelligenceScore');
    expect(d).toHaveProperty('revenue');
    expect(d).toHaveProperty('selfReview');
    expect(d).toHaveProperty('learning');
    expect(d).toHaveProperty('recommendationCount');
    expect(d).toHaveProperty('approvalRequired');
    expect(() => JSON.stringify(d)).not.toThrow();
  });

  it('mobil + watch view düz JSON', async () => {
    const mobile = await mobileOptimizationView();
    expect(mobile).toHaveProperty('intelligenceScore');
    expect(mobile).toHaveProperty('grade');
    expect(mobile).toHaveProperty('reviewSummary');

    const watch = await watchOptimizationView();
    expect(watch).toHaveProperty('intelligenceScore');
    expect(watch).toHaveProperty('todayProfit');
    expect(watch).toHaveProperty('criticalRecommendation');
    expect(() => JSON.stringify(watch)).not.toThrow();
  });

  it('approval gerektiren öneriler = gelir etkileyen (commerce)', async () => {
    const all = await allRecommendations();
    const approval = await recommendationsRequiringApproval();
    expect(approval.every((r) => r.requiresApproval === true)).toBe(true);
    // Approval gerektiren öneriler yalnız commerce (gerçek para)
    expect(approval.every((r) => r.domain === 'commerce')).toBe(true);
    expect(approval.length).toBeLessThanOrEqual(all.length);
  });
});
