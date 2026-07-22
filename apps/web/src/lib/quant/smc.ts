import type { Candle, SwingPoint, SmcEvent, SmcAnalysis, PremiumDiscount } from './types';

// Smart Money Concepts — saf fiyat aksiyonu analizi.
// Swing tespiti fractal yöntemiyle (lookback penceresi), yapı olayları
// (BOS/CHoCH) swing kırılımlarından, blok/gap olayları mum geometrisinden türetilir.

const SWING_LOOKBACK = 2;

export function detectSwings(candles: Candle[], lookback = SWING_LOOKBACK): SwingPoint[] {
  const swings: SwingPoint[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const c = candles[i]!;
    let isHigh = true;
    let isLow = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (candles[j]!.high >= c.high) isHigh = false;
      if (candles[j]!.low <= c.low) isLow = false;
    }
    if (isHigh) swings.push({ index: i, price: c.high, type: 'high' });
    if (isLow) swings.push({ index: i, price: c.low, type: 'low' });
  }
  return swings;
}

/**
 * BOS (Break of Structure): trend yönünde son swing seviyesinin kapanışla kırılması.
 * CHoCH (Change of Character): trend TERSİNE ilk yapısal kırılım.
 */
export function detectStructure(candles: Candle[], swings: SwingPoint[]): SmcEvent[] {
  const events: SmcEvent[] = [];
  let bias: 'bullish' | 'bearish' | null = null;
  let lastHigh: SwingPoint | null = null;
  let lastLow: SwingPoint | null = null;

  const sorted = [...swings].sort((a, b) => a.index - b.index);
  let swingPtr = 0;

  for (let i = 0; i < candles.length; i++) {
    while (swingPtr < sorted.length && sorted[swingPtr]!.index <= i - 1) {
      const s = sorted[swingPtr]!;
      if (s.type === 'high') lastHigh = s;
      else lastLow = s;
      swingPtr++;
    }
    const close = candles[i]!.close;

    if (lastHigh && close > lastHigh.price) {
      const type = bias === 'bearish' ? 'CHoCH' : 'BOS';
      events.push({
        type,
        direction: 'bullish',
        index: i,
        price: lastHigh.price,
        description:
          type === 'CHoCH'
            ? `Yapı karakteri değişti: ${lastHigh.price} üstünde kapanış (düşüşten yükselişe)`
            : `Yükseliş yapısı devam: swing high ${lastHigh.price} kırıldı`,
      });
      bias = 'bullish';
      lastHigh = null;
    } else if (lastLow && close < lastLow.price) {
      const type = bias === 'bullish' ? 'CHoCH' : 'BOS';
      events.push({
        type,
        direction: 'bearish',
        index: i,
        price: lastLow.price,
        description:
          type === 'CHoCH'
            ? `Yapı karakteri değişti: ${lastLow.price} altında kapanış (yükselişten düşüşe)`
            : `Düşüş yapısı devam: swing low ${lastLow.price} kırıldı`,
      });
      bias = 'bearish';
      lastLow = null;
    }
  }
  return events;
}

/**
 * Order Block: güçlü hareket öncesi son zıt renk mum.
 * Displacement eşiği: sonraki mum gövdesi ATR benzeri ortalama gövdenin ≥1.5×.
 */
export function detectOrderBlocks(candles: Candle[]): SmcEvent[] {
  const events: SmcEvent[] = [];
  if (candles.length < 5) return events;

  const avgBody =
    candles.reduce((s, c) => s + Math.abs(c.close - c.open), 0) / candles.length || 1e-9;

  for (let i = 1; i < candles.length - 1; i++) {
    const cur = candles[i]!;
    const next = candles[i + 1]!;
    const curBearish = cur.close < cur.open;
    const curBullish = cur.close > cur.open;
    const nextBody = Math.abs(next.close - next.open);
    const displacement = nextBody >= avgBody * 1.5;

    if (curBearish && next.close > next.open && displacement && next.close > cur.high) {
      events.push({
        type: 'ORDER_BLOCK',
        direction: 'bullish',
        index: i,
        price: cur.low,
        priceHigh: cur.high,
        priceLow: cur.low,
        description: `Bullish order block: ${cur.low}-${cur.high} (displacement sonrası talep bölgesi)`,
      });
    } else if (curBullish && next.close < next.open && displacement && next.close < cur.low) {
      events.push({
        type: 'ORDER_BLOCK',
        direction: 'bearish',
        index: i,
        price: cur.high,
        priceHigh: cur.high,
        priceLow: cur.low,
        description: `Bearish order block: ${cur.low}-${cur.high} (displacement sonrası arz bölgesi)`,
      });
    }
  }
  return events;
}

/** Fair Value Gap: 3 mumlu dengesizlik — 1. mumun high'ı ile 3. mumun low'u arasında boşluk. */
export function detectFairValueGaps(candles: Candle[]): SmcEvent[] {
  const events: SmcEvent[] = [];
  for (let i = 2; i < candles.length; i++) {
    const a = candles[i - 2]!;
    const c = candles[i]!;
    if (c.low > a.high) {
      events.push({
        type: 'FAIR_VALUE_GAP',
        direction: 'bullish',
        index: i - 1,
        price: (a.high + c.low) / 2,
        priceHigh: c.low,
        priceLow: a.high,
        description: `Bullish FVG: ${a.high}-${c.low} arası doldurulmamış boşluk`,
      });
    } else if (c.high < a.low) {
      events.push({
        type: 'FAIR_VALUE_GAP',
        direction: 'bearish',
        index: i - 1,
        price: (a.low + c.high) / 2,
        priceHigh: a.low,
        priceLow: c.high,
        description: `Bearish FVG: ${c.high}-${a.low} arası doldurulmamış boşluk`,
      });
    }
  }
  return events;
}

/** Liquidity Sweep: swing seviyesi fitille aşılıp kapanışın geri dönmesi. */
export function detectLiquiditySweeps(candles: Candle[], swings: SwingPoint[]): SmcEvent[] {
  const events: SmcEvent[] = [];
  for (const swing of swings) {
    for (let i = swing.index + 1; i < Math.min(candles.length, swing.index + 20); i++) {
      const c = candles[i]!;
      if (swing.type === 'high' && c.high > swing.price && c.close < swing.price) {
        events.push({
          type: 'LIQUIDITY_SWEEP',
          direction: 'bearish',
          index: i,
          price: swing.price,
          description: `Buy-side likidite süpürüldü: ${swing.price} üstü fitil, altında kapanış`,
        });
        break;
      }
      if (swing.type === 'low' && c.low < swing.price && c.close > swing.price) {
        events.push({
          type: 'LIQUIDITY_SWEEP',
          direction: 'bullish',
          index: i,
          price: swing.price,
          description: `Sell-side likidite süpürüldü: ${swing.price} altı fitil, üstünde kapanış`,
        });
        break;
      }
    }
  }
  return events;
}

/** Breaker Block: kırılan order block'un ters yönde direnç/destek olması. */
export function detectBreakerBlocks(candles: Candle[], orderBlocks: SmcEvent[]): SmcEvent[] {
  const events: SmcEvent[] = [];
  for (const ob of orderBlocks) {
    const low = ob.priceLow ?? ob.price;
    const high = ob.priceHigh ?? ob.price;
    for (let i = ob.index + 2; i < candles.length; i++) {
      const c = candles[i]!;
      if (ob.direction === 'bullish' && c.close < low) {
        events.push({
          type: 'BREAKER_BLOCK',
          direction: 'bearish',
          index: i,
          price: high,
          priceHigh: high,
          priceLow: low,
          description: `Breaker block: bullish OB (${low}-${high}) kırıldı, artık direnç`,
        });
        break;
      }
      if (ob.direction === 'bearish' && c.close > high) {
        events.push({
          type: 'BREAKER_BLOCK',
          direction: 'bullish',
          index: i,
          price: low,
          priceHigh: high,
          priceLow: low,
          description: `Breaker block: bearish OB (${low}-${high}) kırıldı, artık destek`,
        });
        break;
      }
    }
  }
  return events;
}

/** Mitigation Block: fiyatın order block'a geri dönüp bölgeden tepki vermesi. */
export function detectMitigationBlocks(candles: Candle[], orderBlocks: SmcEvent[]): SmcEvent[] {
  const events: SmcEvent[] = [];
  for (const ob of orderBlocks) {
    const low = ob.priceLow ?? ob.price;
    const high = ob.priceHigh ?? ob.price;
    for (let i = ob.index + 2; i < candles.length; i++) {
      const c = candles[i]!;
      const touched = c.low <= high && c.high >= low;
      if (!touched) continue;
      if (ob.direction === 'bullish' && c.close > high) {
        events.push({
          type: 'MITIGATION_BLOCK',
          direction: 'bullish',
          index: i,
          price: (low + high) / 2,
          priceHigh: high,
          priceLow: low,
          description: `Mitigation: fiyat bullish OB'ye döndü ve tepki verdi (${low}-${high})`,
        });
        break;
      }
      if (ob.direction === 'bearish' && c.close < low) {
        events.push({
          type: 'MITIGATION_BLOCK',
          direction: 'bearish',
          index: i,
          price: (low + high) / 2,
          priceHigh: high,
          priceLow: low,
          description: `Mitigation: fiyat bearish OB'ye döndü ve tepki verdi (${low}-${high})`,
        });
        break;
      }
    }
  }
  return events;
}

/** Premium/Discount: son belirgin range içinde fiyatın konumu. */
export function computePremiumDiscount(candles: Candle[], lookback = 50): PremiumDiscount | null {
  if (candles.length === 0) return null;
  const slice = candles.slice(-lookback);
  const rangeHigh = Math.max(...slice.map((c) => c.high));
  const rangeLow = Math.min(...slice.map((c) => c.low));
  if (rangeHigh === rangeLow) return null;
  const equilibrium = (rangeHigh + rangeLow) / 2;
  const price = candles[candles.length - 1]!.close;
  const zonePercent = ((price - rangeLow) / (rangeHigh - rangeLow)) * 100;
  const currentZone = zonePercent > 55 ? 'premium' : zonePercent < 45 ? 'discount' : 'equilibrium';
  return { rangeHigh, rangeLow, equilibrium, currentZone, zonePercent: Math.round(zonePercent) };
}

export function analyzeSmc(candles: Candle[]): SmcAnalysis {
  const swings = detectSwings(candles);
  const structure = detectStructure(candles, swings);
  const orderBlocks = detectOrderBlocks(candles);
  const fvgs = detectFairValueGaps(candles);
  const sweeps = detectLiquiditySweeps(candles, swings);
  const breakers = detectBreakerBlocks(candles, orderBlocks);
  const mitigations = detectMitigationBlocks(candles, orderBlocks);

  const events = [
    ...structure,
    ...orderBlocks,
    ...fvgs,
    ...sweeps,
    ...breakers,
    ...mitigations,
  ].sort((a, b) => a.index - b.index);

  const lastStructure = structure[structure.length - 1];
  const structureBias: SmcAnalysis['structureBias'] = lastStructure
    ? lastStructure.direction === 'bullish'
      ? 'bullish'
      : 'bearish'
    : 'neutral';

  return {
    swings,
    events,
    premiumDiscount: computePremiumDiscount(candles),
    structureBias,
  };
}
