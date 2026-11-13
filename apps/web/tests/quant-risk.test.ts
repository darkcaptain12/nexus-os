import { describe, it, expect } from 'vitest';
import {
  calculatePositionSize,
  riskRewardRatio,
  checkOrderRisk,
  DEFAULT_RISK_PROFILE,
} from '../src/lib/quant/risk-engine';
import type { PaperAccountState } from '../src/lib/quant/types';

function makeAccount(overrides: Partial<PaperAccountState> = {}): PaperAccountState {
  return {
    startingBalance: 10_000,
    balance: 10_000,
    equity: 10_000,
    currency: 'USDT',
    realizedPnl: 0,
    unrealizedPnl: 0,
    todayPnl: 0,
    openPositions: [],
    closedPositions: [],
    orders: [],
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Risk Engine', () => {
  it('calculatePositionSize: risk tutarı / stop mesafesi', () => {
    // 10000 equity, %1 risk = 100 USDT risk; entry 100, stop 95 → mesafe 5 → qty 20
    const result = calculatePositionSize({
      equity: 10_000,
      entryPrice: 100,
      stopLoss: 95,
      riskPercent: 1,
    });
    expect(result.quantity).toBe(20);
    expect(result.riskAmount).toBe(100);
    expect(result.positionValue).toBe(2000);
  });

  it('calculatePositionSize: sıfır equity → sıfır', () => {
    const result = calculatePositionSize({
      equity: 0,
      entryPrice: 100,
      stopLoss: 95,
      riskPercent: 1,
    });
    expect(result.quantity).toBe(0);
  });

  it('riskRewardRatio: entry 100, SL 95, TP 110 → 2', () => {
    expect(riskRewardRatio(100, 95, 110)).toBe(2);
  });

  it('riskRewardRatio: sıfır risk → null', () => {
    expect(riskRewardRatio(100, 100, 110)).toBeNull();
  });

  it('checkOrderRisk: pozisyon limiti aşımı engellenir', () => {
    // equity 10000, max %5 = 500; 1000'lik pozisyon → ihlal
    const result = checkOrderRisk(makeAccount(), { positionValue: 1000, stopLoss: 95 });
    expect(result.allowed).toBe(false);
    expect(result.violations.some((v) => v.includes('Pozisyon büyüklüğü'))).toBe(true);
  });

  it('checkOrderRisk: stop-loss zorunlu', () => {
    const result = checkOrderRisk(makeAccount(), { positionValue: 100, stopLoss: null });
    expect(result.allowed).toBe(false);
    expect(result.violations.some((v) => v.includes('Stop-loss'))).toBe(true);
  });

  it('checkOrderRisk: günlük zarar limiti', () => {
    // startingBalance 10000, max daily loss %3 = 300; todayPnl -350 → ihlal
    const result = checkOrderRisk(makeAccount({ todayPnl: -350 }), {
      positionValue: 100,
      stopLoss: 95,
    });
    expect(result.allowed).toBe(false);
    expect(result.violations.some((v) => v.includes('Günlük zarar'))).toBe(true);
  });

  it('checkOrderRisk: kaldıraç limiti', () => {
    const result = checkOrderRisk(makeAccount(), {
      positionValue: 100,
      stopLoss: 95,
      leverage: 25,
    });
    expect(result.allowed).toBe(false);
    expect(result.violations.some((v) => v.includes('Kaldıraç'))).toBe(true);
  });

  it('checkOrderRisk: kurallara uyan emir geçer', () => {
    const result = checkOrderRisk(makeAccount(), { positionValue: 400, stopLoss: 95 });
    expect(result.allowed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('DEFAULT_RISK_PROFILE migration 008 varsayılanlarıyla uyumlu', () => {
    expect(DEFAULT_RISK_PROFILE.maxPositionSizePercent).toBe(5);
    expect(DEFAULT_RISK_PROFILE.maxDailyLossPercent).toBe(3);
    expect(DEFAULT_RISK_PROFILE.maxOpenPositions).toBe(5);
    expect(DEFAULT_RISK_PROFILE.maxLeverage).toBe(10);
    expect(DEFAULT_RISK_PROFILE.stopLossRequired).toBe(true);
  });
});
