import { describe, it, expect, beforeEach } from 'vitest';
import { PaperTradingEngine } from '../src/lib/quant/paper-trading';

describe('Paper Trading Engine', () => {
  let engine: PaperTradingEngine;

  beforeEach(() => {
    engine = new PaperTradingEngine();
  });

  it('market emri anında fill olur ve pozisyon açar', () => {
    const order = engine.placeOrder({
      symbol: 'BTCUSDT',
      side: 'buy',
      type: 'market',
      quantity: 0.001,
      marketPrice: 100_000,
      stopLoss: 97_000,
      takeProfit: 106_000,
    });
    expect(order.status).toBe('filled');
    expect(order.filledPrice).toBe(100_000);
    const state = engine.getState();
    expect(state.openPositions).toHaveLength(1);
    expect(state.openPositions[0]!.direction).toBe('long');
  });

  it('fill ücreti bakiyeden düşer', () => {
    engine.placeOrder({
      symbol: 'BTCUSDT',
      side: 'buy',
      type: 'market',
      quantity: 0.001,
      marketPrice: 100_000,
      stopLoss: 97_000,
    });
    const state = engine.getState();
    // fee = 0.001 * 100000 * 0.001 = 0.1
    expect(state.balance).toBeCloseTo(10_000 - 0.1, 6);
  });

  it('limit emri fiyat uygun değilse pending kalır', () => {
    const order = engine.placeOrder({
      symbol: 'BTCUSDT',
      side: 'buy',
      type: 'limit',
      quantity: 0.001,
      marketPrice: 100_000,
      limitPrice: 95_000,
      stopLoss: 92_000,
    });
    expect(order.status).toBe('pending');
    expect(engine.getState().openPositions).toHaveLength(0);
  });

  it('limit emri fiyat uygunsa limit fiyattan fill olur', () => {
    const order = engine.placeOrder({
      symbol: 'BTCUSDT',
      side: 'buy',
      type: 'limit',
      quantity: 0.001,
      marketPrice: 94_000,
      limitPrice: 95_000,
      stopLoss: 92_000,
    });
    expect(order.status).toBe('filled');
    expect(order.filledPrice).toBe(95_000);
  });

  it('risk ihlali emri reddeder', () => {
    // %5 limit = 500 USDT; 1 BTC * 100k = 100000 → red
    const order = engine.placeOrder({
      symbol: 'BTCUSDT',
      side: 'buy',
      type: 'market',
      quantity: 1,
      marketPrice: 100_000,
      stopLoss: 97_000,
    });
    expect(order.status).toBe('rejected');
    expect(order.error).toContain('Pozisyon büyüklüğü');
  });

  it('stop-loss olmadan emir reddedilir', () => {
    const order = engine.placeOrder({
      symbol: 'BTCUSDT',
      side: 'buy',
      type: 'market',
      quantity: 0.001,
      marketPrice: 100_000,
    });
    expect(order.status).toBe('rejected');
    expect(order.error).toContain('Stop-loss');
  });

  it('long pozisyon kârda kapanır — PnL doğru', () => {
    engine.placeOrder({
      symbol: 'ETHUSDT',
      side: 'buy',
      type: 'market',
      quantity: 0.1,
      marketPrice: 3000,
      stopLoss: 2900,
    });
    const pos = engine.getState().openPositions[0]!;
    const closed = engine.closePositionAt(pos.id, 3100, 'test');
    expect(closed).not.toBeNull();
    // gross = (3100-3000)*0.1 = 10; closeFee = 0.1*3100*0.001 = 0.31 → net 9.69
    expect(closed!.pnl).toBeCloseTo(9.69, 2);
    expect(engine.getState().openPositions).toHaveLength(0);
    expect(engine.getState().closedPositions).toHaveLength(1);
  });

  it('short pozisyon düşüşte kâr eder', () => {
    engine.placeOrder({
      symbol: 'ETHUSDT',
      side: 'sell',
      type: 'market',
      quantity: 0.1,
      marketPrice: 3000,
      stopLoss: 3100,
    });
    const pos = engine.getState().openPositions[0]!;
    const closed = engine.closePositionAt(pos.id, 2900, 'test');
    // gross = (3000-2900)*0.1 = 10; fee 0.29 → 9.71
    expect(closed!.pnl).toBeCloseTo(9.71, 2);
  });

  it('updatePrices stop-loss tetikler', () => {
    engine.placeOrder({
      symbol: 'BTCUSDT',
      side: 'buy',
      type: 'market',
      quantity: 0.001,
      marketPrice: 100_000,
      stopLoss: 97_000,
    });
    const closed = engine.updatePrices({ BTCUSDT: 96_500 });
    expect(closed).toHaveLength(1);
    expect(closed[0]!.exitPrice).toBe(97_000);
    expect(closed[0]!.pnl).toBeLessThan(0);
  });

  it('updatePrices take-profit tetikler', () => {
    engine.placeOrder({
      symbol: 'BTCUSDT',
      side: 'buy',
      type: 'market',
      quantity: 0.001,
      marketPrice: 100_000,
      stopLoss: 97_000,
      takeProfit: 105_000,
    });
    const closed = engine.updatePrices({ BTCUSDT: 105_500 });
    expect(closed).toHaveLength(1);
    expect(closed[0]!.pnl).toBeGreaterThan(0);
  });

  it('unrealized PnL equity hesabına dahil', () => {
    engine.placeOrder({
      symbol: 'BTCUSDT',
      side: 'buy',
      type: 'market',
      quantity: 0.001,
      marketPrice: 100_000,
      stopLoss: 97_000,
    });
    const state = engine.getState({ BTCUSDT: 102_000 });
    expect(state.unrealizedPnl).toBeCloseTo(2, 5);
    expect(state.equity).toBeCloseTo(state.balance + 2, 5);
  });

  it('ters yön emri mevcut pozisyonu kapatır', () => {
    engine.placeOrder({
      symbol: 'BTCUSDT',
      side: 'buy',
      type: 'market',
      quantity: 0.001,
      marketPrice: 100_000,
      stopLoss: 97_000,
    });
    engine.placeOrder({
      symbol: 'BTCUSDT',
      side: 'sell',
      type: 'market',
      quantity: 0.001,
      marketPrice: 101_000,
      stopLoss: 104_000,
    });
    const state = engine.getState();
    expect(state.openPositions).toHaveLength(0);
    expect(state.closedPositions).toHaveLength(1);
    expect(state.closedPositions[0]!.pnl).toBeGreaterThan(0);
  });

  it('reset hesabı sıfırlar', () => {
    engine.placeOrder({
      symbol: 'BTCUSDT',
      side: 'buy',
      type: 'market',
      quantity: 0.001,
      marketPrice: 100_000,
      stopLoss: 97_000,
    });
    engine.reset(50_000);
    const state = engine.getState();
    expect(state.balance).toBe(50_000);
    expect(state.openPositions).toHaveLength(0);
    expect(state.orders).toHaveLength(0);
  });
});
