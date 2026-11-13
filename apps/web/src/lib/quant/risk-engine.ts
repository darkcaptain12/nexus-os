import type {
  RiskProfile,
  PositionSizeInput,
  PositionSizeResult,
  RiskCheckResult,
  PaperAccountState,
} from './types';

// Risk Engine — migration 008 risk_profiles alanlarıyla birebir kurallar.

export const DEFAULT_RISK_PROFILE: RiskProfile = {
  maxPositionSizePercent: 5,
  maxDailyLossPercent: 3,
  maxOpenPositions: 5,
  maxLeverage: 10,
  stopLossRequired: true,
};

/** Risk yüzdesine göre pozisyon büyüklüğü: risk tutarı / (entry-stop mesafesi). */
export function calculatePositionSize(input: PositionSizeInput): PositionSizeResult {
  const { equity, entryPrice, stopLoss, riskPercent } = input;
  const leverage = input.leverage ?? 1;

  if (equity <= 0 || entryPrice <= 0) {
    return {
      quantity: 0,
      positionValue: 0,
      riskAmount: 0,
      riskRewardRatio: null,
      leveragedExposure: 0,
    };
  }

  const riskAmount = equity * (riskPercent / 100);
  const stopDistance = Math.abs(entryPrice - stopLoss);
  const quantity = stopDistance > 0 ? riskAmount / stopDistance : 0;
  const positionValue = quantity * entryPrice;

  return {
    quantity: Number(quantity.toFixed(8)),
    positionValue: Number(positionValue.toFixed(2)),
    riskAmount: Number(riskAmount.toFixed(2)),
    riskRewardRatio: null,
    leveragedExposure: Number((positionValue * leverage).toFixed(2)),
  };
}

export function riskRewardRatio(
  entry: number,
  stopLoss: number,
  takeProfit: number,
): number | null {
  const risk = Math.abs(entry - stopLoss);
  const reward = Math.abs(takeProfit - entry);
  if (risk === 0) return null;
  return Number((reward / risk).toFixed(2));
}

/** Yeni emir öncesi risk kontrolü — ihlal varsa emir engellenir. */
export function checkOrderRisk(
  account: PaperAccountState,
  order: { positionValue: number; stopLoss: number | null; leverage?: number },
  profile: RiskProfile = DEFAULT_RISK_PROFILE,
): RiskCheckResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  const maxPositionValue = account.equity * (profile.maxPositionSizePercent / 100);
  if (order.positionValue > maxPositionValue) {
    violations.push(
      `Pozisyon büyüklüğü limiti aşıldı: ${order.positionValue.toFixed(2)} > ${maxPositionValue.toFixed(2)} (equity'nin %${profile.maxPositionSizePercent}'i)`,
    );
  }

  if (account.openPositions.length >= profile.maxOpenPositions) {
    violations.push(
      `Maksimum açık pozisyon sayısına ulaşıldı: ${account.openPositions.length}/${profile.maxOpenPositions}`,
    );
  }

  const dailyLossLimit = account.startingBalance * (profile.maxDailyLossPercent / 100);
  if (account.todayPnl < 0 && Math.abs(account.todayPnl) >= dailyLossLimit) {
    violations.push(
      `Günlük zarar limiti aşıldı: ${account.todayPnl.toFixed(2)} (limit: -${dailyLossLimit.toFixed(2)})`,
    );
  }

  if (profile.stopLossRequired && order.stopLoss === null) {
    violations.push('Stop-loss zorunlu — emirde stop-loss yok');
  }

  const leverage = order.leverage ?? 1;
  if (leverage > profile.maxLeverage) {
    violations.push(`Kaldıraç limiti aşıldı: ${leverage}x > ${profile.maxLeverage}x`);
  }

  if (order.positionValue > maxPositionValue * 0.8 && order.positionValue <= maxPositionValue) {
    warnings.push('Pozisyon büyüklüğü limitin %80 üstünde');
  }

  return { allowed: violations.length === 0, violations, warnings };
}
