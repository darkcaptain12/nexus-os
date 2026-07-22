import type { Candle, Ticker, Timeframe } from '../types';
import type { ExchangeAdapter } from './types';
import { fetchJson, ExchangeError } from './types';

const BASE = 'https://api.binance.com/api/v3';

const INTERVAL_MAP: Record<Timeframe, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
  '1w': '1w',
};

type BinanceKline = [number, string, string, string, string, string, number, ...unknown[]];

export function parseBinanceKlines(raw: unknown): Candle[] {
  if (!Array.isArray(raw)) throw new ExchangeError('binance', 0, 'Beklenmeyen kline yanıtı');
  return (raw as BinanceKline[]).map((k) => ({
    openTime: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
    closeTime: k[6],
  }));
}

interface BinanceTicker24h {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
}

export function parseBinanceTicker(raw: unknown): Omit<Ticker, 'exchange' | 'fetchedAt'> {
  const t = raw as BinanceTicker24h;
  if (!t || typeof t.lastPrice !== 'string') {
    throw new ExchangeError('binance', 0, 'Beklenmeyen ticker yanıtı');
  }
  return {
    symbol: t.symbol,
    lastPrice: parseFloat(t.lastPrice),
    priceChangePercent24h: parseFloat(t.priceChangePercent),
    high24h: parseFloat(t.highPrice),
    low24h: parseFloat(t.lowPrice),
    volume24h: parseFloat(t.volume),
  };
}

export const binanceAdapter: ExchangeAdapter = {
  name: 'binance',

  async fetchCandles(symbol, timeframe, limit) {
    const url = `${BASE}/klines?symbol=${encodeURIComponent(symbol)}&interval=${INTERVAL_MAP[timeframe]}&limit=${limit}`;
    return parseBinanceKlines(await fetchJson(url, 'binance'));
  },

  async fetchTicker(symbol) {
    const url = `${BASE}/ticker/24hr?symbol=${encodeURIComponent(symbol)}`;
    return {
      ...parseBinanceTicker(await fetchJson(url, 'binance')),
      exchange: 'binance',
      fetchedAt: new Date().toISOString(),
    };
  },
};
