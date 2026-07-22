import type { Candle, StrategyDefinition, StrategySignal, StrategyInfo } from './types';
import { ema, rsi } from './indicators';
import { analyzeSmc } from './smc';

// Strategy Engine — deterministik sinyal üreticileri. Her sinyal gerekçeli.

function emaCrossStrategy(candles: Candle[], params: Record<string, number>): StrategySignal[] {
  const fast = params.fast ?? 9;
  const slow = params.slow ?? 21;
  const closes = candles.map((c) => c.close);
  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);
  const signals: StrategySignal[] = [];

  for (let i = 1; i < candles.length; i++) {
    const pf = fastEma[i - 1];
    const ps = slowEma[i - 1];
    const cf = fastEma[i];
    const cs = slowEma[i];
    if (pf === null || ps === null || cf === null || cs === null) continue;
    if (pf === undefined || ps === undefined || cf === undefined || cs === undefined) continue;

    if (pf <= ps && cf > cs) {
      signals.push({
        action: 'long',
        index: i,
        price: candles[i]!.close,
        reason: `EMA${fast} EMA${slow}'i yukarı kesti (golden cross)`,
      });
    } else if (pf >= ps && cf < cs) {
      signals.push({
        action: 'short',
        index: i,
        price: candles[i]!.close,
        reason: `EMA${fast} EMA${slow}'i aşağı kesti (death cross)`,
      });
    }
  }
  return signals;
}

function rsiReversalStrategy(candles: Candle[], params: Record<string, number>): StrategySignal[] {
  const period = params.period ?? 14;
  const oversold = params.oversold ?? 30;
  const overbought = params.overbought ?? 70;
  const closes = candles.map((c) => c.close);
  const rsiSeries = rsi(closes, period);
  const signals: StrategySignal[] = [];

  for (let i = 1; i < candles.length; i++) {
    const prev = rsiSeries[i - 1];
    const cur = rsiSeries[i];
    if (prev === null || cur === null || prev === undefined || cur === undefined) continue;

    if (prev < oversold && cur >= oversold) {
      signals.push({
        action: 'long',
        index: i,
        price: candles[i]!.close,
        reason: `RSI aşırı satımdan çıktı (${prev.toFixed(1)} → ${cur.toFixed(1)})`,
      });
    } else if (prev > overbought && cur <= overbought) {
      signals.push({
        action: 'short',
        index: i,
        price: candles[i]!.close,
        reason: `RSI aşırı alımdan döndü (${prev.toFixed(1)} → ${cur.toFixed(1)})`,
      });
    }
  }
  return signals;
}

function smcConfluenceStrategy(
  candles: Candle[],
  params: Record<string, number>,
): StrategySignal[] {
  const minRsi = params.minRsi ?? 25;
  const maxRsi = params.maxRsi ?? 75;
  const smc = analyzeSmc(candles);
  const closes = candles.map((c) => c.close);
  const rsiSeries = rsi(closes, 14);
  const signals: StrategySignal[] = [];

  for (const event of smc.events) {
    if (event.type !== 'CHoCH') continue;
    const r = rsiSeries[event.index];
    if (r === null || r === undefined) continue;

    if (event.direction === 'bullish' && r >= minRsi && r <= 55) {
      signals.push({
        action: 'long',
        index: event.index,
        price: candles[event.index]!.close,
        reason: `SMC CHoCH bullish + RSI ${r.toFixed(1)} (discount bölgesi teyidi)`,
      });
    } else if (event.direction === 'bearish' && r <= maxRsi && r >= 45) {
      signals.push({
        action: 'short',
        index: event.index,
        price: candles[event.index]!.close,
        reason: `SMC CHoCH bearish + RSI ${r.toFixed(1)} (premium bölgesi teyidi)`,
      });
    }
  }
  return signals;
}

const STRATEGIES: StrategyDefinition[] = [
  {
    id: 'ema-cross',
    name: 'EMA Cross',
    description: 'Hızlı EMA yavaş EMA kesişimi — momentum takibi',
    type: 'momentum',
    params: { fast: 9, slow: 21 },
    evaluate: emaCrossStrategy,
  },
  {
    id: 'rsi-reversal',
    name: 'RSI Reversal',
    description: 'RSI aşırı alım/satım bölgesinden dönüş — mean reversion',
    type: 'mean_reversion',
    params: { period: 14, oversold: 30, overbought: 70 },
    evaluate: rsiReversalStrategy,
  },
  {
    id: 'smc-confluence',
    name: 'SMC Confluence',
    description: 'CHoCH yapı değişimi + RSI teyidi — smart money yaklaşımı',
    type: 'smc',
    params: { minRsi: 25, maxRsi: 75 },
    evaluate: smcConfluenceStrategy,
  },
];

export function listStrategies(): StrategyInfo[] {
  return STRATEGIES.map(({ id, name, description, type, params }) => ({
    id,
    name,
    description,
    type,
    params: { ...params },
  }));
}

export function getStrategy(id: string): StrategyDefinition {
  const s = STRATEGIES.find((x) => x.id === id);
  if (!s) {
    throw new Error(
      `Bilinmeyen strateji: ${id}. Mevcut: ${STRATEGIES.map((x) => x.id).join(', ')}`,
    );
  }
  return s;
}

export function runStrategy(
  id: string,
  candles: Candle[],
  paramOverrides: Record<string, number> = {},
): StrategySignal[] {
  const strategy = getStrategy(id);
  return strategy.evaluate(candles, { ...strategy.params, ...paramOverrides });
}
