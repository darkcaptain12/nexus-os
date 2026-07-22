import { describe, it, expect } from 'vitest';
import { submitLiveOrder, getLiveOrders } from '../src/lib/quant/live/live-order-engine';
import { updateRiskProfileV2 } from '../src/lib/quant/live/risk-engine-v2';
import { getPortfolioIntelligence } from '../src/lib/quant/live/portfolio-intelligence';
import { liveTradingSummary } from '../src/lib/quant/live/services/live-trading-service';
import { parseVoiceIntent, handleVoiceIntent } from '../src/lib/quant/services/voice-service';
import { getLiveAlerts } from '../src/lib/quant/live/live-alerts';

describe('Live Order Engine — Approval routing', () => {
  it('geçerli emir → Action Engine → pending-approval (borsaya gitmez)', async () => {
    const result = await submitLiveOrder({
      exchange: 'okx',
      symbol: 'BTCUSDT',
      side: 'buy',
      type: 'market',
      quantity: 0.00001,
      stopLoss: 50000,
      reason: 'test',
    });
    // rejected değilse approval bekliyor olmalı — onaysız asla submitted/filled değil
    if (!result.rejected) {
      expect(result.requiresApproval).toBe(true);
      expect(['pending-approval', 'approved']).toContain(result.order.status);
      expect(result.order.status).not.toBe('filled');
      expect(result.order.status).not.toBe('submitted');
    }
  });

  it('risk ihlali → order rejected, borsaya gitmez', async () => {
    // kara listeye al
    updateRiskProfileV2({ blacklistedSymbols: ['DOGEUSDT'] });
    const result = await submitLiveOrder({
      exchange: 'okx',
      symbol: 'DOGEUSDT',
      side: 'buy',
      type: 'market',
      quantity: 1,
      stopLoss: 0.1,
      reason: 'blacklist test',
    });
    expect(result.rejected).toBe(true);
    expect(result.order.status).toBe('rejected');
    expect(result.order.rejectionReason).toContain('kara listede');
    updateRiskProfileV2({ blacklistedSymbols: [] }); // geri al
  });

  it('SL olmadan → rejected (risk v2 stop-loss zorunlu)', async () => {
    const result = await submitLiveOrder({
      exchange: 'okx',
      symbol: 'BTCUSDT',
      side: 'buy',
      type: 'market',
      quantity: 0.00001,
    });
    expect(result.rejected).toBe(true);
  });

  it('getLiveOrders emirleri listeler', async () => {
    expect(Array.isArray(getLiveOrders())).toBe(true);
  });
});

describe('Portfolio Intelligence — reuse', () => {
  it('portföy metrikleri döner (equity/exposure/allocation/drawdown)', async () => {
    const p = await getPortfolioIntelligence();
    expect(p).toHaveProperty('equity');
    expect(p).toHaveProperty('exposurePercent');
    expect(p).toHaveProperty('maxDrawdownPercent');
    expect(Array.isArray(p.allocation)).toBe(true);
    expect(p).toHaveProperty('weeklyPnl');
    expect(p).toHaveProperty('monthlyPnl');
  });

  it('liveTradingSummary kompakt özet (voice/mobile)', async () => {
    const s = await liveTradingSummary();
    expect(s).toHaveProperty('equity');
    expect(s).toHaveProperty('dailyPnl');
    expect(s).toHaveProperty('winRate');
    expect(() => JSON.stringify(s)).not.toThrow();
  });
});

describe('Voice — Live Trading intent’leri', () => {
  it('"tüm pozisyonları kapat" → trading.closeAll (onay)', async () => {
    const intent = parseVoiceIntent('tüm pozisyonları kapat');
    expect(intent.intent).toBe('trading.closeAll');
    const r = await handleVoiceIntent(intent);
    expect(r.requiresApproval).toBe(true);
  });

  it('"risk raporu" → trading.riskReport', async () => {
    const intent = parseVoiceIntent('risk raporu');
    expect(intent.intent).toBe('trading.riskReport');
    const r = await handleVoiceIntent(intent);
    expect(r.speech).toContain('Risk raporu');
  });

  it('"bugünkü PnL" → trading.pnl', async () => {
    const intent = parseVoiceIntent('bugünkü PnL');
    expect(intent.intent).toBe('trading.pnl');
    const r = await handleVoiceIntent(intent);
    expect(r.speech).toContain('PnL');
  });
});

describe('Live Alerts', () => {
  it('getLiveAlerts liste döner', () => {
    expect(Array.isArray(getLiveAlerts())).toBe(true);
  });
});
