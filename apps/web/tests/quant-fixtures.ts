import type { Candle } from '../src/lib/quant/types';

// Deterministik test mumları — ağ yok, rastgelelik yok.

export function makeCandle(
  i: number,
  open: number,
  close: number,
  extra?: Partial<Candle>,
): Candle {
  // Deterministik mikro-fitil: ardışık mumlarda high/low eşitliğini kırar
  // (open = önceki close zincirinde tepe mumu ile sonraki mumun high'ı aksi halde
  // birebir eşit olur ve fractal swing tespiti imkânsızlaşır).
  const high = Math.max(open, close) * 1.005 + (i % 7) * 0.013;
  const low = Math.min(open, close) * 0.995 - ((i + 3) % 5) * 0.011;
  return {
    openTime: 1_700_000_000_000 + i * 3_600_000,
    open,
    high,
    low,
    close,
    volume: 100 + i,
    closeTime: 1_700_000_000_000 + (i + 1) * 3_600_000 - 1,
    ...extra,
  };
}

/** Doğrusal trend serisi: start'tan step ile ilerler. */
export function trendCandles(count: number, start = 100, step = 1): Candle[] {
  const candles: Candle[] = [];
  let price = start;
  for (let i = 0; i < count; i++) {
    const open = price;
    price += step;
    candles.push(makeCandle(i, open, price));
  }
  return candles;
}

/** Sinüs dalgası — mean reversion testleri için. */
export function waveCandles(count: number, base = 100, amplitude = 10, period = 20): Candle[] {
  const candles: Candle[] = [];
  for (let i = 0; i < count; i++) {
    const open = base + amplitude * Math.sin(((i - 1) / period) * Math.PI * 2);
    const close = base + amplitude * Math.sin((i / period) * Math.PI * 2);
    candles.push(makeCandle(i, open, close));
  }
  return candles;
}

/**
 * Önce yükselen sonra düşen dalgalı seri — CHoCH/BOS testleri için.
 * Trend üstüne irrasyonel frekanslı sinüs bindirilir: lokal swing'ler garanti,
 * high/low eşitlikleri oluşmaz (monoton veya simetrik seride fractal swing çıkmaz).
 */
export function reversalCandles(upCount = 30, downCount = 30, start = 100): Candle[] {
  const total = upCount + downCount;
  const level = (i: number): number => {
    const trend = i < upCount ? start + i * 2 : start + upCount * 2 - (i - upCount) * 2;
    // Wobble türevi (4×1.1) trend eğiminden (2) büyük — lokal tepe/dip garantili
    return trend + 4 * Math.sin(i * 1.1);
  };
  const candles: Candle[] = [];
  for (let i = 0; i < total; i++) {
    candles.push(makeCandle(i, level(i === 0 ? 0 : i - 1), level(i)));
  }
  return candles;
}
