import { describe, it, expect } from 'vitest';
import {
  buildHomeDashboard,
  buildApprovalCenter,
  buildTradingView,
  buildDesktopCompanion,
} from '../src/lib/mobile/mobile-runtime';
import { getApprovalQueue } from '../src/lib/ai/approval-queue';

describe('Mobile Runtime — Home Dashboard (facade)', () => {
  it('home dashboard tüm bölümleri aggregate eder', async () => {
    const d = await buildHomeDashboard();
    expect(d).toHaveProperty('executiveSummary');
    expect(d).toHaveProperty('dailyPlan');
    expect(d).toHaveProperty('trading');
    expect(d).toHaveProperty('commerce');
    expect(d).toHaveProperty('agents');
    expect(d).toHaveProperty('desktop');
    expect(typeof d.memoryHealth).toBe('number');
  });

  it('executiveSummary Executive servisinden gelir', async () => {
    const d = await buildHomeDashboard();
    expect(typeof d.executiveSummary.riskScore).toBe('number');
    expect(d.executiveSummary.focus.length).toBeGreaterThan(0);
    expect(d.executiveSummary.cycleState).toBeTruthy();
  });

  it('agents Agent Runtime metriklerinden', async () => {
    const d = await buildHomeDashboard();
    expect(typeof d.agents.total).toBe('number');
    expect(typeof d.agents.successRate).toBe('number');
  });

  it('desktop Desktop Intelligence bağlamından', async () => {
    const d = await buildHomeDashboard();
    expect(d.desktop).toHaveProperty('activeApp');
    expect(d.desktop).toHaveProperty('activeProject');
  });
});

describe('Mobile Runtime — Approval Center', () => {
  it('AI Approval Queue + Action Engine onaylarını birleştirir', () => {
    // Bir AI onayı oluştur
    getApprovalQueue().propose({
      type: 'status_change',
      title: 'BTC al onayı',
      description: 'Trading emri',
      reasoning: 'Risk kontrolü geçti',
      targetId: 'test',
      targetType: 'task',
      action: {},
    });
    const items = buildApprovalCenter();
    expect(items.length).toBeGreaterThan(0);
    const trading = items.find((i) => i.category === 'trading');
    expect(trading).toBeDefined();
    expect(trading!.source).toBe('ai');
  });

  it('kategorize eder (trading/commerce/workflow/agent)', () => {
    getApprovalQueue().propose({
      type: 'archive',
      title: 'Proje arşivle',
      description: 'agent işlemi',
      reasoning: 'x',
      targetId: 't',
      targetType: 'project',
      action: {},
    });
    const items = buildApprovalCenter();
    expect(
      items.every((i) =>
        ['trading', 'commerce', 'workflow', 'agent', 'approval'].includes(i.category),
      ),
    ).toBe(true);
  });
});

describe('Mobile Runtime — Trading View', () => {
  it('paper portföy döner (reuse quant)', async () => {
    const t = await buildTradingView();
    expect(t.mode).toBe('paper');
    expect(typeof t.equity).toBe('number');
    expect(Array.isArray(t.openPositions)).toBe(true);
  });
});

describe('Mobile Runtime — Desktop Companion', () => {
  it('Desktop Intelligence reuse eder', () => {
    const c = buildDesktopCompanion();
    expect(c).toHaveProperty('online');
    expect(c).toHaveProperty('activeApp');
    expect(c).toHaveProperty('ide');
  });
});
