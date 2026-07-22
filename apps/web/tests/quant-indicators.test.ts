import { describe, it, expect } from 'vitest';
import {
  sma,
  ema,
  rsi,
  macd,
  vwap,
  bollinger,
  atr,
  lastDefined,
} from '../src/lib/quant/indicators';
import { trendCandles, makeCandle } from './quant-fixtures';

describe('Indicators', () => {
  it('sma: [1..5] period 3 → [null,null,2,3,4]', () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });

  it('sma: period > length → all null', () => {
    expect(sma([1, 2], 5)).toEqual([null, null]);
  });

  it('ema: seed = SMA of first period', () => {
    const result = ema([2, 4, 6, 8], 2);
    expect(result[0]).toBeNull();
    expect(result[1]).toBe(3); // (2+4)/2
    // k=2/3: 6*2/3 + 3*1/3 = 5
    expect(result[2]).toBeCloseTo(5, 10);
  });

  it('rsi: sürekli yükselen seri → 100', () => {
    const values = Array.from({ length: 20 }, (_, i) => 100 + i);
    const result = rsi(values, 14);
    expect(result[14]).toBe(100);
    expect(lastDefined(result)).toBe(100);
  });

  it('rsi: sürekli düşen seri → 0', () => {
    const values = Array.from({ length: 20 }, (_, i) => 100 - i);
    expect(lastDefined(rsi(values, 14))).toBeCloseTo(0, 5);
  });

  it('rsi: ilk period-1 değer null', () => {
    const values = Array.from({ length: 20 }, (_, i) => 100 + i);
    const result = rsi(values, 14);
    for (let i = 0; i < 14; i++) expect(result[i]).toBeNull();
  });

  it('macd: yükselen trendde histogram pozitif', () => {
    const values = Array.from({ length: 60 }, (_, i) => 100 + i * 2);
    const { histogram, macd: line, signal } = macd(values);
    expect(line.length).toBe(60);
    expect(signal.length).toBe(60);
    const lastHist = lastDefined(histogram);
    expect(lastHist).not.toBeNull();
  });

  it('vwap: eşit hacimde tipik fiyat ortalaması', () => {
    const candles = [makeCandle(0, 100, 100, { high: 100, low: 100, volume: 10 })];
    const result = vwap(candles);
    expect(result[0]).toBe(100);
  });

  it('vwap: kümülatif — girişle aynı uzunlukta', () => {
    const candles = trendCandles(50);
    expect(vwap(candles)).toHaveLength(50);
    expect(vwap(candles)[49]).not.toBeNull();
  });

  it('bollinger: sabit seride upper=middle=lower', () => {
    const values = Array.from({ length: 25 }, () => 100);
    const { upper, middle, lower } = bollinger(values, 20, 2);
    expect(middle[24]).toBe(100);
    expect(upper[24]).toBe(100);
    expect(lower[24]).toBe(100);
  });

  it('bollinger: dalgalı seride upper > middle > lower', () => {
    const values = Array.from({ length: 30 }, (_, i) => 100 + (i % 2 === 0 ? 5 : -5));
    const { upper, middle, lower } = bollinger(values, 20, 2);
    expect(upper[29]!).toBeGreaterThan(middle[29]!);
    expect(middle[29]!).toBeGreaterThan(lower[29]!);
  });

  it('atr: girişle aynı uzunluk, pozitif değer', () => {
    const candles = trendCandles(30);
    const result = atr(candles, 14);
    expect(result).toHaveLength(30);
    expect(lastDefined(result)).toBeGreaterThan(0);
  });

  it('lastDefined: sondaki null atlanır', () => {
    expect(lastDefined([1, 2, null])).toBe(2);
    expect(lastDefined([null, null])).toBeNull();
  });
});
