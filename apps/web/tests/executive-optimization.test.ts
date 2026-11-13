import { describe, it, expect, beforeAll } from 'vitest';
import { runSelfReview, getLatestSelfReview } from '../src/lib/executive/optimization/self-review';
import {
  learnFromFailures,
  getLearningReport,
  getLessons,
} from '../src/lib/executive/optimization/learning-engine';
import {
  getGoals,
  setGoal,
  getGoalProgress,
  getGoalPriorities,
} from '../src/lib/executive/optimization/goal-engine';
import { getMemoryStore } from '../src/lib/memory/store';
import { getKnowledgeGraph } from '../src/lib/knowledge/graph-store';
import { getDecisionHistory } from '../src/lib/ai/decision-history';
import { journalOpen, journalClose } from '../src/lib/quant/live/trade-journal';

// Gerçek başarısızlık üret: kaybeden bir trade kapat
beforeAll(() => {
  const entry = journalOpen({
    symbol: 'ETHUSDT',
    direction: 'long',
    entryPrice: 3000,
    quantity: 0.1,
    reason: 'test',
    aiRationale: 'x',
    riskScore: 80,
    exchange: 'okx',
    strategy: 'test-strat',
  });
  journalClose(entry.id, 2900); // zarar → loss
});

describe('Executive Self Review', () => {
  it('kendi kararlarını + başarısızlıkları analiz eder', () => {
    // Sonuçlanmış karar ekle (decision-history reuse)
    const hist = getDecisionHistory();
    const d1 = hist.add({
      decision: 'Test kararı doğru',
      category: 'trading',
      confidence: 80,
      outcome: 'accepted',
      reasoning: 'r',
    });
    hist.recordOutcome(d1.id, 'successful');
    const d2 = hist.add({
      decision: 'Test kararı yanlış',
      category: 'commerce',
      confidence: 60,
      outcome: 'accepted',
      reasoning: 'r',
    });
    hist.recordOutcome(d2.id, 'failed');

    const review = runSelfReview();
    expect(review.totalDecisions).toBeGreaterThan(0);
    expect(review.correct).toBeGreaterThanOrEqual(1);
    expect(review.wrong).toBeGreaterThanOrEqual(1);
    expect(review.failures.some((f) => f.domain === 'trade')).toBe(true); // kaybeden trade
    expect(review.accuracy).toBeGreaterThanOrEqual(0);
    expect(getLatestSelfReview()!.date).toBe(review.date);
  });
});

describe('Learning Engine', () => {
  it('başarısızlıktan ders çıkarır → Memory + KG', () => {
    const graph = getKnowledgeGraph();
    const beforeNodes = graph.getStatistics().nodeCount;
    const beforeDecisions = getMemoryStore().getDecisions('ai', 100).length;

    const lessons = learnFromFailures([
      {
        domain: 'trade',
        ref: `t-${Date.now()}`,
        title: 'ETHUSDT zarar',
        detail: 'risk skoru 80',
        at: new Date().toISOString(),
      },
      {
        domain: 'ad',
        ref: `ad-${Date.now()}`,
        title: 'ROAS 0.5',
        detail: 'Harcama 100 gelir 50',
        at: new Date().toISOString(),
      },
    ]);

    expect(lessons.length).toBe(2);
    expect(lessons[0]!.cause).toBeTruthy();
    expect(lessons[0]!.prevention).toBeTruthy();
    expect(['low', 'medium', 'high']).toContain(lessons[0]!.recurrenceRisk);
    // ad ROAS < 1 → high risk
    expect(lessons.find((l) => l.domain === 'ad')!.recurrenceRisk).toBe('high');
    // Memory + KG yazıldı
    expect(getMemoryStore().getDecisions('ai', 100).length).toBeGreaterThan(beforeDecisions);
    expect(graph.getStatistics().nodeCount).toBeGreaterThan(beforeNodes);
  });

  it('aynı başarısızlık ikinci kez öğrenilmez (dedup)', () => {
    const ref = `dup-${Date.now()}`;
    const first = learnFromFailures([
      { domain: 'workflow', ref, title: 'wf', detail: 'd', at: new Date().toISOString() },
    ]);
    const second = learnFromFailures([
      { domain: 'workflow', ref, title: 'wf', detail: 'd', at: new Date().toISOString() },
    ]);
    expect(first.length).toBe(1);
    expect(second.length).toBe(0);
  });

  it('learning report domain dağılımı + insight', () => {
    const report = getLearningReport();
    expect(report.totalLessons).toBeGreaterThan(0);
    expect(report.topInsight).toBeTruthy();
    expect(typeof report.highRiskCount).toBe('number');
    expect(getLessons('ad').every((l) => l.domain === 'ad')).toBe(true);
  });
});

describe('Goal Engine', () => {
  it('default hedefler seed edilir (100k kâr / 10 ürün / 5 analiz / ROAS 4)', () => {
    const goals = getGoals();
    expect(goals.length).toBeGreaterThanOrEqual(4);
    expect(goals.some((g) => g.metric === 'net_profit' && g.target === 100_000)).toBe(true);
    expect(goals.some((g) => g.metric === 'roas' && g.target === 4)).toBe(true);
  });

  it('ilerleme gerçek verilerden hesaplanır', async () => {
    const progress = await getGoalProgress();
    expect(progress.length).toBeGreaterThanOrEqual(4);
    for (const p of progress) {
      expect(p).toHaveProperty('current');
      expect(p).toHaveProperty('percent');
      expect(['on-track', 'behind', 'achieved', 'at-risk']).toContain(p.status);
    }
  });

  it('öncelik: en geride kalan en öncelikli', async () => {
    const priorities = await getGoalPriorities();
    const rank: Record<string, number> = { 'at-risk': 0, behind: 1, 'on-track': 2, achieved: 3 };
    for (let i = 1; i < priorities.length; i++) {
      expect(rank[priorities[i - 1]!.status] ?? 9).toBeLessThanOrEqual(
        rank[priorities[i]!.status] ?? 9,
      );
    }
  });

  it('özel hedef eklenebilir', () => {
    const before = getGoals().length;
    setGoal({
      label: 'Günlük 3 workflow',
      metric: 'workflow_completions',
      target: 3,
      period: 'daily',
    });
    expect(getGoals().length).toBe(before + 1);
  });
});
