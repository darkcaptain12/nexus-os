import type { Candle, Ticker, Timeframe, ExchangeName } from './types';
import { getExchange } from './exchanges/registry';
import { withCache } from '@/lib/cache';

// Market Data Engine — mevcut TTL cache üstünde adapter çağrıları.
// Candle TTL timeframe'e göre ölçeklenir; ticker 10s.

const TICKER_TTL_MS = 10_000;

const CANDLE_TTL_MS: Record<Timeframe, number> = {
  '1m': 20_000,
  '5m': 60_000,
  '15m': 120_000,
  '30m': 180_000,
  '1h': 300_000,
  '4h': 600_000,
  '1d': 1_800_000,
  '1w': 3_600_000,
};

export async function getCandles(
  exchange: ExchangeName,
  symbol: string,
  timeframe: Timeframe,
  limit = 200,
): Promise<Candle[]> {
  const key = `quant:candles:${exchange}:${symbol}:${timeframe}:${limit}`;
  return withCache(key, CANDLE_TTL_MS[timeframe], () =>
    getExchange(exchange).fetchCandles(symbol, timeframe, limit),
  );
}

export async function getTicker(exchange: ExchangeName, symbol: string): Promise<Ticker> {
  const key = `quant:ticker:${exchange}:${symbol}`;
  return withCache(key, TICKER_TTL_MS, () => getExchange(exchange).fetchTicker(symbol));
}
