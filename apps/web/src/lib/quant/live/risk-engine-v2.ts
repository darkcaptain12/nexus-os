import type { RiskProfileV2, RiskCheckV2Result, LiveOrderInput } from './types';
import type { PaperAccountState } from '../types';
import { checkOrderRisk, DEFAULT_RISK_PROFILE } from '../risk-engine';

// Risk Engine v2 — mevcut checkOrderRisk (v1: pozisyon/günlük zarar/kaldıraç/SL)
// REUSE eder, üstüne 4 canlı kontrol ekler: sembol riski, günlük işlem, kara liste,
// haber/volatilite. Kural ihlali → emir REDDEDİLİR, borsaya gönderilmez.

export const DEFAULT_RISK_PROFILE_V2: RiskProfileV2 = {
  ...DEFAULT_RISK_PROFILE,
  maxSymbolExposurePercent: 20,
  maxDailyTrades: 15,
  blacklistedSymbols: [],
  newsBlackoutActive: false,
  maxVolatilityAtrPercent: 8,
};

export interface RiskV2Context {
  account: PaperAccountState;
  positionValue: number;
  todayTradeCount: number;
  symbolExposureValue: number;
  volatilityAtrPercent?: number;
}

export function checkLiveOrderRisk(
  order: LiveOrderInput,
  ctx: RiskV2Context,
  profile: RiskProfileV2 = DEFAULT_RISK_PROFILE_V2,
): RiskCheckV2Result {
  const checkedRules: string[] = [];
  const violations: string[] = [];
  const warnings: string[] = [];

  // v1 kontrolleri (reuse — pozisyon boyutu, günlük zarar, max pozisyon, SL, kaldıraç)
  const v1 = checkOrderRisk(
    ctx.account,
    {
      positionValue: ctx.positionValue,
      stopLoss: order.stopLoss ?? null,
      leverage: order.leverage,
    },
    {
      maxPositionSizePercent: profile.maxPositionSizePercent,
      maxDailyLossPercent: profile.maxDailyLossPercent,
      maxOpenPositions: profile.maxOpenPositions,
      maxLeverage: profile.maxLeverage,
      stopLossRequired: profile.stopLossRequired,
    },
  );
  checkedRules.push(
    'pozisyon-boyutu',
    'günlük-zarar',
    'max-açık-pozisyon',
    'stop-loss',
    'max-kaldıraç',
  );
  violations.push(...v1.violations);
  warnings.push(...v1.warnings);

  // v2: Kara liste sembol
  checkedRules.push('kara-liste');
  if (profile.blacklistedSymbols.map((s) => s.toUpperCase()).includes(order.symbol.toUpperCase())) {
    violations.push(`${order.symbol} kara listede — işlem yasak`);
  }

  // v2: Maksimum sembol riski (tek sembole toplam exposure)
  checkedRules.push('sembol-riski');
  const maxSymbolValue = ctx.account.equity * (profile.maxSymbolExposurePercent / 100);
  if (ctx.symbolExposureValue + ctx.positionValue > maxSymbolValue) {
    violations.push(
      `${order.symbol} sembol riski aşıldı: ${(ctx.symbolExposureValue + ctx.positionValue).toFixed(2)} > ${maxSymbolValue.toFixed(2)} (%${profile.maxSymbolExposurePercent})`,
    );
  }

  // v2: Maksimum günlük işlem
  checkedRules.push('günlük-işlem-limiti');
  if (ctx.todayTradeCount >= profile.maxDailyTrades) {
    violations.push(`Günlük işlem limiti doldu: ${ctx.todayTradeCount}/${profile.maxDailyTrades}`);
  }

  // v2: Haber zamanı işlem engeli
  checkedRules.push('haber-blackout');
  if (profile.newsBlackoutActive) {
    violations.push('Haber zamanı işlem engeli aktif — yüksek volatilite riski');
  }

  // v2: Volatilite filtresi
  checkedRules.push('volatilite-filtresi');
  if (
    ctx.volatilityAtrPercent !== undefined &&
    ctx.volatilityAtrPercent > profile.maxVolatilityAtrPercent
  ) {
    violations.push(
      `Volatilite çok yüksek: ATR %${ctx.volatilityAtrPercent} > %${profile.maxVolatilityAtrPercent}`,
    );
  } else if (
    ctx.volatilityAtrPercent !== undefined &&
    ctx.volatilityAtrPercent > profile.maxVolatilityAtrPercent * 0.75
  ) {
    warnings.push(`Volatilite yükseliyor: ATR %${ctx.volatilityAtrPercent}`);
  }

  return { allowed: violations.length === 0, violations, warnings, checkedRules };
}

// globalThis üzerinden risk profili (kullanıcı ayarlanabilir)
const g = globalThis as unknown as { __apexRiskProfileV2?: RiskProfileV2 };

export function getRiskProfileV2(): RiskProfileV2 {
  if (!g.__apexRiskProfileV2) g.__apexRiskProfileV2 = { ...DEFAULT_RISK_PROFILE_V2 };
  return g.__apexRiskProfileV2;
}

export function updateRiskProfileV2(patch: Partial<RiskProfileV2>): RiskProfileV2 {
  g.__apexRiskProfileV2 = { ...getRiskProfileV2(), ...patch };
  return g.__apexRiskProfileV2;
}
