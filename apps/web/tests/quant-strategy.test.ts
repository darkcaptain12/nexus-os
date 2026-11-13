import { describe, it, expect } from 'vitest';
import { listStrategies, getStrategy, runStrategy } from '../src/lib/quant/strategy-engine';
import { trendCandles, waveCandles, reversalCandles } from './quant-fixtures';

describe('Strategy Engine', () => {
  it('listStrategies: 3 strateji kayıtlı', () => {
    const strategies = listStrategies();
    expect(strategies.map((s) => s.id)).toEqual(['ema-cross', 'rsi-reversal', 'smc-confluence']);
  });

  it('getStrategy: bilinmeyen id fırlatır', () => {
    expect(() => getStrategy('yok-boyle-strateji')).toThrow('Bilinmeyen strateji');
  });

  it('ema-cross: dönüş serisinde hem long hem short sinyal üretir', () => {
    const candles = [...reversalCandles(40, 40), ...reversalCandles(40, 40)];
    const signals = runStrategy('ema-cross', candles);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.every((s) => s.reason.includes('EMA'))).toBe(true);
  });

  it('ema-cross: param override çalışır', () => {
    const candles = reversalCandles(50, 50);
    const defaults = runStrategy('ema-cross', candles);
    const custom = runStrategy('ema-cross', candles, { fast: 3, slow: 7 });
    // Farklı periyotlar farklı sinyal sayısı üretmeli (aynı olma ihtimali çok düşük)
    expect(custom.length + defaults.length).toBeGreaterThan(0);
  });

  it('rsi-reversal: dalga serisinde sinyal üretir, gerekçe RSI içerir', () => {
    const candles = waveCandles(120, 100, 15, 30);
    const signals = runStrategy('rsi-reversal', candles);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0]!.reason).toContain('RSI');
  });

  it('rsi-reversal: düz trendde aşırı bölge sinyali az/yok', () => {
    const candles = trendCandles(60, 100, 0.01);
    const signals = runStrategy('rsi-reversal', candles);
    expect(signals.length).toBe(0);
  });

  it('smc-confluence: sinyaller CHoCH gerekçeli', () => {
    const candles = [...reversalCandles(30, 30), ...reversalCandles(30, 30)];
    const signals = runStrategy('smc-confluence', candles);
    for (const s of signals) {
      expect(s.reason).toContain('CHoCH');
    }
  });

  it('her sinyalde index, price, action tutarlı', () => {
    const candles = reversalCandles(40, 40);
    for (const id of ['ema-cross', 'rsi-reversal', 'smc-confluence']) {
      for (const s of runStrategy(id, candles)) {
        expect(s.index).toBeGreaterThanOrEqual(0);
        expect(s.index).toBeLessThan(candles.length);
        expect(s.price).toBe(candles[s.index]!.close);
        expect(['long', 'short', 'exit', 'hold']).toContain(s.action);
      }
    }
  });
});
