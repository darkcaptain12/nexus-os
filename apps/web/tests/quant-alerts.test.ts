import { describe, it, expect, beforeEach } from 'vitest';
import { AlertEngine } from '../src/lib/quant/alert-engine';
import { trendCandles } from './quant-fixtures';

describe('Alert Engine', () => {
  let engine: AlertEngine;

  beforeEach(() => {
    engine = new AlertEngine();
  });

  it('create aktif alarm oluşturur', () => {
    const alert = engine.create({
      symbol: 'BTCUSDT',
      exchange: 'binance',
      timeframe: '1h',
      condition: 'price_above',
      threshold: 120_000,
    });
    expect(alert.status).toBe('active');
    expect(engine.getActive()).toHaveLength(1);
  });

  it('price_above tetiklenir', () => {
    engine.create({
      symbol: 'BTCUSDT',
      exchange: 'binance',
      timeframe: '1h',
      condition: 'price_above',
      threshold: 150,
    });
    const candles = trendCandles(30, 100, 2); // son close 160
    const triggered = engine.evaluate('BTCUSDT', candles);
    expect(triggered).toHaveLength(1);
    expect(triggered[0]!.status).toBe('triggered');
    expect(triggered[0]!.triggeredValue).toBe(160);
  });

  it('price_below eşik üstündeyken tetiklenmez', () => {
    engine.create({
      symbol: 'BTCUSDT',
      exchange: 'binance',
      timeframe: '1h',
      condition: 'price_below',
      threshold: 50,
    });
    const triggered = engine.evaluate('BTCUSDT', trendCandles(30, 100, 2));
    expect(triggered).toHaveLength(0);
    expect(engine.getActive()).toHaveLength(1);
  });

  it('rsi_above sürekli yükselişte tetiklenir', () => {
    engine.create({
      symbol: 'ETHUSDT',
      exchange: 'binance',
      timeframe: '1h',
      condition: 'rsi_above',
      threshold: 90,
    });
    const triggered = engine.evaluate('ETHUSDT', trendCandles(40, 100, 2));
    expect(triggered).toHaveLength(1);
  });

  it('farklı sembol alarmı etkilenmez', () => {
    engine.create({
      symbol: 'SOLUSDT',
      exchange: 'binance',
      timeframe: '1h',
      condition: 'price_above',
      threshold: 1,
    });
    const triggered = engine.evaluate('BTCUSDT', trendCandles(10));
    expect(triggered).toHaveLength(0);
  });

  it('cancel alarmı iptal eder; tekrar tetiklenmez', () => {
    const alert = engine.create({
      symbol: 'BTCUSDT',
      exchange: 'binance',
      timeframe: '1h',
      condition: 'price_above',
      threshold: 1,
    });
    engine.cancel(alert.id);
    expect(engine.getActive()).toHaveLength(0);
    const triggered = engine.evaluate('BTCUSDT', trendCandles(10));
    expect(triggered).toHaveLength(0);
  });

  it('tetiklenen alarm ikinci kez tetiklenmez', () => {
    engine.create({
      symbol: 'BTCUSDT',
      exchange: 'binance',
      timeframe: '1h',
      condition: 'price_above',
      threshold: 1,
    });
    const first = engine.evaluate('BTCUSDT', trendCandles(10));
    const second = engine.evaluate('BTCUSDT', trendCandles(10));
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
  });
});
