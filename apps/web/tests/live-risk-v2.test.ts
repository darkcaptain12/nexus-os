import { describe, it, expect } from 'vitest';
import {
  checkLiveOrderRisk,
  DEFAULT_RISK_PROFILE_V2,
  type RiskV2Context,
} from '../src/lib/quant/live/risk-engine-v2';
import type { LiveOrderInput, RiskProfileV2 } from '../src/lib/quant/live/types';
import type { PaperAccountState } from '../src/lib/quant/types';

function makeAccount(o: Partial<PaperAccountState> = {}): PaperAccountState {
  return {
    startingBalance: 10000,
    balance: 10000,
    equity: 10000,
    currency: 'USDT',
    realizedPnl: 0,
    unrealizedPnl: 0,
    todayPnl: 0,
    openPositions: [],
    closedPositions: [],
    orders: [],
    updatedAt: new Date().toISOString(),
    ...o,
  };
}
function makeOrder(o: Partial<LiveOrderInput> = {}): LiveOrderInput {
  return {
    exchange: 'okx',
    symbol: 'BTCUSDT',
    side: 'buy',
    type: 'market',
    quantity: 0.001,
    stopLoss: 60000,
    ...o,
  };
}
function ctx(o: Partial<RiskV2Context> = {}): RiskV2Context {
  return {
    account: makeAccount(),
    positionValue: 300,
    todayTradeCount: 0,
    symbolExposureValue: 0,
    ...o,
  };
}

describe('Risk Engine v2 — v1 reuse + 4 canlı kontrol', () => {
  it('geçerli emir onaylanır, tüm kurallar kontrol edilir', () => {
    const r = checkLiveOrderRisk(makeOrder(), ctx());
    expect(r.allowed).toBe(true);
    expect(r.checkedRules).toContain('kara-liste');
    expect(r.checkedRules).toContain('sembol-riski');
    expect(r.checkedRules).toContain('günlük-işlem-limiti');
    expect(r.checkedRules).toContain('volatilite-filtresi');
    // v1 kuralları da reuse edildi
    expect(r.checkedRules).toContain('stop-loss');
    expect(r.checkedRules).toContain('max-kaldıraç');
  });

  it('kara liste sembol → reddedilir', () => {
    const profile: RiskProfileV2 = { ...DEFAULT_RISK_PROFILE_V2, blacklistedSymbols: ['BTCUSDT'] };
    const r = checkLiveOrderRisk(makeOrder(), ctx(), profile);
    expect(r.allowed).toBe(false);
    expect(r.violations.some((v) => v.includes('kara listede'))).toBe(true);
  });

  it('sembol riski aşımı → reddedilir', () => {
    // equity 10000, max %20 = 2000; mevcut 1900 + yeni 300 = 2200 > 2000
    const r = checkLiveOrderRisk(
      makeOrder(),
      ctx({ symbolExposureValue: 1900, positionValue: 300 }),
    );
    expect(r.allowed).toBe(false);
    expect(r.violations.some((v) => v.includes('sembol riski'))).toBe(true);
  });

  it('günlük işlem limiti → reddedilir', () => {
    const r = checkLiveOrderRisk(makeOrder(), ctx({ todayTradeCount: 15 }));
    expect(r.allowed).toBe(false);
    expect(r.violations.some((v) => v.includes('Günlük işlem limiti'))).toBe(true);
  });

  it('haber blackout → reddedilir', () => {
    const profile: RiskProfileV2 = { ...DEFAULT_RISK_PROFILE_V2, newsBlackoutActive: true };
    const r = checkLiveOrderRisk(makeOrder(), ctx(), profile);
    expect(r.allowed).toBe(false);
    expect(r.violations.some((v) => v.includes('Haber zamanı'))).toBe(true);
  });

  it('volatilite filtresi → reddedilir', () => {
    const r = checkLiveOrderRisk(makeOrder(), ctx({ volatilityAtrPercent: 12 }));
    expect(r.allowed).toBe(false);
    expect(r.violations.some((v) => v.includes('Volatilite'))).toBe(true);
  });

  it('yüksek volatilite eşiğe yakın → uyarı (red değil)', () => {
    const r = checkLiveOrderRisk(makeOrder(), ctx({ volatilityAtrPercent: 6.5 }));
    expect(r.allowed).toBe(true);
    expect(r.warnings.some((w) => w.includes('Volatilite'))).toBe(true);
  });

  it('v1 stop-loss zorunlu (reuse) → SL yoksa reddedilir', () => {
    const r = checkLiveOrderRisk(makeOrder({ stopLoss: undefined }), ctx());
    expect(r.allowed).toBe(false);
    expect(r.violations.some((v) => v.includes('Stop-loss'))).toBe(true);
  });

  it('DEFAULT_RISK_PROFILE_V2 v1 alanlarını içerir', () => {
    expect(DEFAULT_RISK_PROFILE_V2.maxPositionSizePercent).toBe(5);
    expect(DEFAULT_RISK_PROFILE_V2.maxSymbolExposurePercent).toBe(20);
    expect(DEFAULT_RISK_PROFILE_V2.maxDailyTrades).toBe(15);
  });
});
