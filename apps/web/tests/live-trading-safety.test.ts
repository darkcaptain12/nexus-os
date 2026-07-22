import { describe, it, expect, beforeEach } from 'vitest';
import {
  isLiveTradingEnabled,
  isLiveTradingArmed,
  isLiveTradingEnvEnabled,
  armLiveTrading,
  disarmLiveTrading,
  getKillSwitchStatus,
} from '../src/lib/quant/live/kill-switch';
import { okxPlaceLiveOrder } from '../src/lib/quant/exchanges/okx-trade';

describe('Kill-Switch — gerçek para trading güvenliği', () => {
  beforeEach(() => {
    disarmLiveTrading();
    delete process.env.LIVE_TRADING_ENABLED;
  });

  it('varsayılan KAPALI — hiçbir kilit açık değil', () => {
    expect(isLiveTradingArmed()).toBe(false);
    expect(isLiveTradingEnvEnabled()).toBe(false);
    expect(isLiveTradingEnabled()).toBe(false);
    expect(getKillSwitchStatus().mode).toBe('paper');
  });

  it('yalnız runtime arm yeterli DEĞİL — env de gerekli (çift kilit)', () => {
    armLiveTrading();
    expect(isLiveTradingArmed()).toBe(true);
    expect(isLiveTradingEnvEnabled()).toBe(false);
    expect(isLiveTradingEnabled()).toBe(false); // env kapalı → yine paper
    expect(getKillSwitchStatus().mode).toBe('paper');
  });

  it('yalnız env yeterli DEĞİL — runtime arm de gerekli', () => {
    process.env.LIVE_TRADING_ENABLED = 'true';
    expect(isLiveTradingEnvEnabled()).toBe(true);
    expect(isLiveTradingArmed()).toBe(false);
    expect(isLiveTradingEnabled()).toBe(false); // arm yok → paper
  });

  it('her iki kilit açık → live mod', () => {
    process.env.LIVE_TRADING_ENABLED = 'true';
    armLiveTrading();
    expect(isLiveTradingEnabled()).toBe(true);
    expect(getKillSwitchStatus().mode).toBe('live');
  });

  it("disarm acil durdurma — anında paper'a döner", () => {
    process.env.LIVE_TRADING_ENABLED = 'true';
    armLiveTrading();
    expect(isLiveTradingEnabled()).toBe(true);
    disarmLiveTrading();
    expect(isLiveTradingEnabled()).toBe(false);
    expect(getKillSwitchStatus().mode).toBe('paper');
  });
});

describe('OKX signed order — credential güvenliği', () => {
  it("credential yoksa gerçek emir gönderMEZ (hata fırlatır, sessizce mock'a düşmez)", async () => {
    const saved = {
      k: process.env.OKX_API_KEY,
      s: process.env.OKX_API_SECRET,
      p: process.env.OKX_API_PASSPHRASE,
    };
    delete process.env.OKX_API_KEY;
    delete process.env.OKX_API_SECRET;
    delete process.env.OKX_API_PASSPHRASE;
    await expect(
      okxPlaceLiveOrder({ symbol: 'BTCUSDT', side: 'buy', quantity: 0.001 }),
    ).rejects.toThrow(/credentials.*tanımlı değil/);
    if (saved.k) process.env.OKX_API_KEY = saved.k;
    if (saved.s) process.env.OKX_API_SECRET = saved.s;
    if (saved.p) process.env.OKX_API_PASSPHRASE = saved.p;
  });

  it('placeholder credential ile gerçek emir gönderMEZ', async () => {
    const saved = {
      k: process.env.OKX_API_KEY,
      s: process.env.OKX_API_SECRET,
      p: process.env.OKX_API_PASSPHRASE,
    };
    process.env.OKX_API_KEY = 'REPLACE_WITH_REAL_OKX_API_KEY';
    process.env.OKX_API_SECRET = 'REPLACE_WITH_REAL_OKX_API_SECRET';
    process.env.OKX_API_PASSPHRASE = 'REPLACE_WITH_REAL_OKX_PASSPHRASE';
    await expect(
      okxPlaceLiveOrder({ symbol: 'BTCUSDT', side: 'buy', quantity: 0.001 }),
    ).rejects.toThrow(/placeholder/);
    if (saved.k) process.env.OKX_API_KEY = saved.k;
    else delete process.env.OKX_API_KEY;
    if (saved.s) process.env.OKX_API_SECRET = saved.s;
    else delete process.env.OKX_API_SECRET;
    if (saved.p) process.env.OKX_API_PASSPHRASE = saved.p;
    else delete process.env.OKX_API_PASSPHRASE;
  });
});
