// Live Trading Kill-Switch — gerçek borsa emri için SON güvenlik kapısı.
//
// Gerçek emir gönderilebilmesi için İKİ koşul da gerekir (çift kilit):
//   1. env  LIVE_TRADING_ENABLED === 'true'   (deploy-time, kalıcı)
//   2. runtime arm  (session, elle armLiveTrading() ile açılır)
//
// Varsayılan KAPALI. Herhangi biri kapalıysa → paper tracking (gerçek emir gitmez).
// Bu, Risk Engine v2 + Approval Queue'dan SONRA gelen son kontrol noktasıdır.

const g = globalThis as unknown as { __apexLiveTradingArmed?: boolean };

/** Env kilidi — deploy-time. */
export function isLiveTradingEnvEnabled(): boolean {
  return process.env.LIVE_TRADING_ENABLED === 'true';
}

/** Runtime kilidi — session içinde elle açılır (default kapalı). */
export function isLiveTradingArmed(): boolean {
  return g.__apexLiveTradingArmed === true;
}

/** Her iki kilit de açık mı — gerçek emir gönderilebilir mi. */
export function isLiveTradingEnabled(): boolean {
  return isLiveTradingEnvEnabled() && isLiveTradingArmed();
}

/** Runtime kilidini aç. Env kilidi de açık olmalı, yoksa yine gönderilmez. */
export function armLiveTrading(): { armed: boolean; envEnabled: boolean; effective: boolean } {
  g.__apexLiveTradingArmed = true;
  return { armed: true, envEnabled: isLiveTradingEnvEnabled(), effective: isLiveTradingEnabled() };
}

/** Runtime kilidini kapat — acil durdurma. */
export function disarmLiveTrading(): { armed: boolean } {
  g.__apexLiveTradingArmed = false;
  return { armed: false };
}

export interface KillSwitchStatus {
  envEnabled: boolean;
  armed: boolean;
  liveTradingEnabled: boolean;
  mode: 'live' | 'paper';
}

export function getKillSwitchStatus(): KillSwitchStatus {
  const envEnabled = isLiveTradingEnvEnabled();
  const armed = isLiveTradingArmed();
  const enabled = envEnabled && armed;
  return {
    envEnabled,
    armed,
    liveTradingEnabled: enabled,
    mode: enabled ? 'live' : 'paper',
  };
}
