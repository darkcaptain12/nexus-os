import type { Candle, MacdResult, BollingerResult } from './types';

// Tüm indikatörler girişle aynı uzunlukta dizi döner; hesaplanamayan başlangıç
// noktaları null olur. Bu hizalama, grafik overlay ve backtest indekslemesini
// birebir candle indeksine eşler.

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i]!;
    if (i >= period) sum -= values[i - period]!;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;
  const k = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i]!;
  let prev = seed / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i]! * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period + 1) return out;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i]! - values[i - 1]!;
    if (diff >= 0) gainSum += diff;
    else lossSum -= diff;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i]! - values[i - 1]!;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export function macd(values: number[], fast = 12, slow = 26, signalPeriod = 9): MacdResult {
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);
  const macdLine: (number | null)[] = values.map((_, i) => {
    const f = fastEma[i];
    const s = slowEma[i];
    return f !== null && s !== null && f !== undefined && s !== undefined ? f - s : null;
  });

  // Sinyal EMA'sı yalnızca macd'nin tanımlı olduğu segment üzerinde hesaplanır
  const firstIdx = macdLine.findIndex((v) => v !== null);
  const signal: (number | null)[] = new Array(values.length).fill(null);
  if (firstIdx !== -1) {
    const defined = macdLine.slice(firstIdx) as number[];
    const sig = ema(defined, signalPeriod);
    for (let i = 0; i < sig.length; i++) {
      signal[firstIdx + i] = sig[i] ?? null;
    }
  }

  const histogram: (number | null)[] = macdLine.map((m, i) => {
    const s = signal[i];
    return m !== null && s !== null && s !== undefined ? m - s : null;
  });

  return { macd: macdLine, signal, histogram };
}

export function vwap(candles: Candle[]): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  let cumPV = 0;
  let cumVol = 0;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]!;
    const typical = (c.high + c.low + c.close) / 3;
    cumPV += typical * c.volume;
    cumVol += c.volume;
    out[i] = cumVol > 0 ? cumPV / cumVol : null;
  }
  return out;
}

export function bollinger(values: number[], period = 20, multiplier = 2): BollingerResult {
  const middle = sma(values, period);
  const upper: (number | null)[] = new Array(values.length).fill(null);
  const lower: (number | null)[] = new Array(values.length).fill(null);

  for (let i = period - 1; i < values.length; i++) {
    const mean = middle[i];
    if (mean === null || mean === undefined) continue;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) {
      variance += (values[j]! - mean) ** 2;
    }
    const std = Math.sqrt(variance / period);
    upper[i] = mean + multiplier * std;
    lower[i] = mean - multiplier * std;
  }
  return { upper, middle, lower };
}

export function atr(candles: Candle[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period + 1) return out;

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i]!;
    const prevClose = candles[i - 1]!.close;
    trueRanges.push(
      Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose)),
    );
  }

  let seed = 0;
  for (let i = 0; i < period; i++) seed += trueRanges[i]!;
  let prev = seed / period;
  out[period] = prev;
  for (let i = period; i < trueRanges.length; i++) {
    prev = (prev * (period - 1) + trueRanges[i]!) / period;
    out[i + 1] = prev;
  }
  return out;
}

export function lastDefined(series: (number | null)[]): number | null {
  for (let i = series.length - 1; i >= 0; i--) {
    const v = series[i];
    if (v !== null && v !== undefined) return v;
  }
  return null;
}
