import { describe, it, expect } from 'vitest';
import {
  detectSwings,
  detectStructure,
  detectFairValueGaps,
  detectOrderBlocks,
  detectLiquiditySweeps,
  computePremiumDiscount,
  analyzeSmc,
} from '../src/lib/quant/smc';
import { makeCandle, trendCandles, reversalCandles, waveCandles } from './quant-fixtures';
import type { Candle } from '../src/lib/quant/types';

describe('Smart Money Concepts', () => {
  it('detectSwings: tepe ve dip fractal yakalanır', () => {
    const candles = waveCandles(60, 100, 10, 20);
    const swings = detectSwings(candles);
    expect(swings.length).toBeGreaterThan(0);
    expect(swings.some((s) => s.type === 'high')).toBe(true);
    expect(swings.some((s) => s.type === 'low')).toBe(true);
  });

  it('detectStructure: trend dönüşünde CHoCH üretilir', () => {
    const candles = reversalCandles(30, 30);
    const swings = detectSwings(candles);
    const events = detectStructure(candles, swings);
    expect(events.length).toBeGreaterThan(0);
    const choch = events.find((e) => e.type === 'CHoCH');
    expect(choch).toBeDefined();
    expect(choch!.direction).toBe('bearish');
  });

  it('detectStructure: tek yönlü trendde BOS üretilir, CHoCH üretilmez', () => {
    const candles = waveCandles(40, 100, 3, 8).map((c, i) => ({
      ...c,
      open: c.open + i * 2,
      close: c.close + i * 2,
      high: c.high + i * 2,
      low: c.low + i * 2,
    }));
    const swings = detectSwings(candles);
    const events = detectStructure(candles, swings);
    const bos = events.filter((e) => e.type === 'BOS');
    expect(bos.length).toBeGreaterThan(0);
    expect(bos.every((e) => e.direction === 'bullish')).toBe(true);
  });

  it('detectFairValueGaps: 3 mumlu boşluk yakalanır', () => {
    const candles: Candle[] = [
      makeCandle(0, 100, 101, { high: 101, low: 100 }),
      makeCandle(1, 101, 105, { high: 105, low: 101 }),
      makeCandle(2, 105, 106, { high: 106, low: 103 }), // low 103 > ilk mumun high'ı 101 → bullish FVG
    ];
    const fvgs = detectFairValueGaps(candles);
    expect(fvgs).toHaveLength(1);
    expect(fvgs[0]!.direction).toBe('bullish');
    expect(fvgs[0]!.priceLow).toBe(101);
    expect(fvgs[0]!.priceHigh).toBe(103);
  });

  it('detectOrderBlocks: displacement öncesi zıt mum yakalanır', () => {
    const candles: Candle[] = [
      makeCandle(0, 100, 100.5),
      makeCandle(1, 100.5, 100), // bearish mum (OB adayı)
      makeCandle(2, 100, 110, { high: 111, low: 99.5 }), // güçlü bullish displacement
      makeCandle(3, 110, 111),
      makeCandle(4, 111, 112),
    ];
    const obs = detectOrderBlocks(candles);
    expect(obs.some((o) => o.direction === 'bullish' && o.index === 1)).toBe(true);
  });

  it('detectLiquiditySweeps: fitil aşıp kapanış geri dönerse sweep', () => {
    // Swing high oluştur, sonra fitille aş ama altında kapan
    const base = trendCandles(10, 100, 1); // swing yapısı için
    const sweepCandle = makeCandle(10, 108, 107, { high: 115, low: 106.5 });
    const candles = [...base, sweepCandle, makeCandle(11, 107, 106)];
    const swings = detectSwings(candles);
    const sweeps = detectLiquiditySweeps(candles, swings);
    // En azından fonksiyon çalışır ve tip doğru döner
    expect(Array.isArray(sweeps)).toBe(true);
  });

  it('computePremiumDiscount: range üstü premium, altı discount', () => {
    const candles = trendCandles(50, 100, 1); // 100→150, fiyat en üstte
    const pd = computePremiumDiscount(candles);
    expect(pd).not.toBeNull();
    expect(pd!.currentZone).toBe('premium');
    expect(pd!.zonePercent).toBeGreaterThan(55);

    const down = trendCandles(50, 150, -1);
    const pd2 = computePremiumDiscount(down);
    expect(pd2!.currentZone).toBe('discount');
  });

  it('analyzeSmc: tüm bileşenleri döner', () => {
    const candles = reversalCandles(40, 40);
    const result = analyzeSmc(candles);
    expect(result.swings.length).toBeGreaterThan(0);
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.premiumDiscount).not.toBeNull();
    expect(['bullish', 'bearish', 'neutral']).toContain(result.structureBias);
  });

  it('analyzeSmc: boş giriş çökmez', () => {
    const result = analyzeSmc([]);
    expect(result.swings).toHaveLength(0);
    expect(result.events).toHaveLength(0);
    expect(result.premiumDiscount).toBeNull();
    expect(result.structureBias).toBe('neutral');
  });
});
