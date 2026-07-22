import { describe, it, expect, beforeAll } from 'vitest';
import {
  getStrategyPerformance,
  getTradingRecommendations,
} from '../src/lib/executive/optimization/trading-optimizer';
import { getCommerceRecommendations } from '../src/lib/executive/optimization/commerce-optimizer';
import {
  getAgentPerformance,
  getWorkflowPerformance,
  getAgentWorkflowRecommendations,
} from '../src/lib/executive/optimization/agent-optimizer';
import {
  getRevenueOverview,
  getRevenueRecommendations,
} from '../src/lib/executive/optimization/revenue-optimizer';
import { journalOpen, journalClose } from '../src/lib/quant/live/trade-journal';

// Gerçek strateji verisi: bir kazanan bir kaybeden aynı stratejide
beforeAll(() => {
  for (let i = 0; i < 4; i++) {
    const win = journalOpen({
      symbol: 'BTCUSDT',
      direction: 'long',
      entryPrice: 60000,
      quantity: 0.01,
      reason: 'r',
      aiRationale: 'x',
      riskScore: 30,
      exchange: 'okx',
      strategy: 'winner-strat',
    });
    journalClose(win.id, 62000); // win
  }
  const loss = journalOpen({
    symbol: 'BTCUSDT',
    direction: 'long',
    entryPrice: 60000,
    quantity: 0.01,
    reason: 'r',
    aiRationale: 'x',
    riskScore: 30,
    exchange: 'okx',
    strategy: 'loser-strat',
  });
  journalClose(loss.id, 55000); // loss
});

describe('Trading Optimizer — strateji performansı', () => {
  it('win rate / profit factor / sharpe / drawdown / süre hesaplar', () => {
    const perf = getStrategyPerformance();
    expect(perf.length).toBeGreaterThan(0);
    const winner = perf.find((p) => p.strategy === 'winner-strat');
    expect(winner).toBeDefined();
    expect(winner!.winRate).toBe(100);
    expect(winner!.profitFactor).toBeGreaterThan(1);
    expect(winner!.verdict).toBe('promote');
    for (const p of perf) {
      expect(p).toHaveProperty('sharpeLike');
      expect(p).toHaveProperty('maxDrawdownPercent');
      expect(p).toHaveProperty('avgTradeMinutes');
    }
  });

  it('öneri: başarılı öne çıkar, düşük pasifle — gerçek ayar YOK', () => {
    const recs = getTradingRecommendations();
    expect(recs.some((r) => r.action.includes('öne çıkar'))).toBe(true);
    // Trading önerileri ayar değiştirmez → requiresApproval false
    expect(recs.every((r) => r.requiresApproval === false)).toBe(true);
    expect(recs.every((r) => r.domain === 'trading')).toBe(true);
  });
});

describe('Commerce Optimizer — güvenlik', () => {
  it('gelir etkileyen aksiyonlar Approval gerektirir', async () => {
    const recs = await getCommerceRecommendations();
    // Her commerce önerisi ürün/reklam aksiyonu → requiresApproval true (keep hariç zaten filtreli)
    for (const r of recs) {
      expect(r.domain).toBe('commerce');
      expect(r.requiresApproval).toBe(true); // gerçek para → Approval Queue
    }
  });
});

describe('Agent & Workflow Optimizer', () => {
  it('agent performansı metrikleri döner', () => {
    const perf = getAgentPerformance();
    expect(perf).toHaveProperty('successRate');
    expect(perf).toHaveProperty('errorRate');
    expect(perf).toHaveProperty('avgApprovalWaitMs');
    expect(perf).toHaveProperty('bottleneck');
  });

  it('workflow performansı: hata oranı + yavaş + tekrar adım', () => {
    const perf = getWorkflowPerformance();
    expect(perf).toHaveProperty('failureRate');
    expect(perf).toHaveProperty('redundantSteps');
    expect(perf).toHaveProperty('automationSuggestions');
    expect(Array.isArray(perf.automationSuggestions)).toBe(true);
  });

  it('öneriler yalnız optimizasyon (ayar değiştirmez)', () => {
    const recs = getAgentWorkflowRecommendations();
    expect(recs.every((r) => r.requiresApproval === false)).toBe(true);
  });
});

describe('Revenue Optimizer — Commerce + Trading birlikte', () => {
  it('birleşik gelir görünümü', async () => {
    const overview = await getRevenueOverview();
    expect(overview).toHaveProperty('commerceProfit');
    expect(overview).toHaveProperty('tradingPnl');
    expect(overview).toHaveProperty('totalNet');
    expect(['commerce-leaning', 'trading-leaning', 'balanced']).toContain(overview.balance);
  });

  it('öneri üretir (kaynak dağılımı)', async () => {
    const recs = await getRevenueRecommendations();
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.every((r) => r.domain === 'revenue')).toBe(true);
  });
});
