import { describe, it, expect } from 'vitest';
import { runBacktest } from '../src/lib/quant/backtest-engine';
import { reversalCandles, trendCandles } from './quant-fixtures';

describe('Backtest Engine', () => {
  const candles = [
    ...reversalCandles(40, 40, 100),
    ...reversalCandles(40, 40, 100),
    ...reversalCandles(40, 40, 100),
  ];

  it('temel metrikler dolu döner', () => {
    const result = runBacktest({
      strategyId: 'ema-cross',
      symbol: 'TESTUSDT',
      timeframe: '1h',
      candles,
    });
    expect(result.candleCount).toBe(candles.length);
    expect(result.totalTrades).toBeGreaterThan(0);
    expect(result.winningTrades + result.losingTrades).toBe(result.totalTrades);
    expect(result.winRate).toBeGreaterThanOrEqual(0);
    expect(result.winRate).toBeLessThanOrEqual(100);
    expect(result.maxDrawdownPercent).toBeGreaterThanOrEqual(0);
    expect(result.endingBalance).toBeGreaterThan(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('getiri = (ending-starting)/starting', () => {
    const result = runBacktest({
      strategyId: 'ema-cross',
      symbol: 'TESTUSDT',
      timeframe: '1h',
      candles,
      startingBalance: 5000,
    });
    const expected = ((result.endingBalance - 5000) / 5000) * 100;
    expect(result.totalReturnPercent).toBeCloseTo(Number(expected.toFixed(2)), 2);
  });

  it('işlemler kronolojik: exitIndex >= entryIndex', () => {
    const result = runBacktest({
      strategyId: 'ema-cross',
      symbol: 'TESTUSDT',
      timeframe: '1h',
      candles,
    });
    for (const t of result.trades) {
      expect(t.exitIndex).toBeGreaterThanOrEqual(t.entryIndex);
      expect(['long', 'short']).toContain(t.direction);
    }
  });

  it('sinyalsiz seri: 0 işlem, bakiye korunur', () => {
    const flat = trendCandles(60, 100, 0.001);
    const result = runBacktest({
      strategyId: 'rsi-reversal',
      symbol: 'TESTUSDT',
      timeframe: '1h',
      candles: flat,
    });
    expect(result.totalTrades).toBe(0);
    expect(result.endingBalance).toBe(result.startingBalance);
    expect(result.winRate).toBe(0);
    expect(result.profitFactor).toBeNull();
  });

  it('positionPercent bakiye kullanımını sınırlar', () => {
    const full = runBacktest({
      strategyId: 'ema-cross',
      symbol: 'T',
      timeframe: '1h',
      candles,
      positionPercent: 100,
    });
    const half = runBacktest({
      strategyId: 'ema-cross',
      symbol: 'T',
      timeframe: '1h',
      candles,
      positionPercent: 50,
    });
    // Yarım pozisyonda mutlak PnL daha küçük olmalı
    expect(Math.abs(half.endingBalance - half.startingBalance)).toBeLessThanOrEqual(
      Math.abs(full.endingBalance - full.startingBalance) + 0.01,
    );
  });

  it('sharpeLike 2+ işlemde hesaplanır', () => {
    const result = runBacktest({
      strategyId: 'ema-cross',
      symbol: 'TESTUSDT',
      timeframe: '1h',
      candles,
    });
    if (result.totalTrades >= 2) {
      expect(result.sharpeLike).not.toBeNull();
    }
  });
});
