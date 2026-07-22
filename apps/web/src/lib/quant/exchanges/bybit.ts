import type { Candle, Ticker, Timeframe } from '../types';
import type { ExchangeAdapter } from './types';
import { fetchJson, ExchangeError } from './types';

const BASE = 'https://api.bybit.com/v5/market';

const INTERVAL_MAP: Record<Timeframe, string> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1h': '60',
  '4h': '240',
  '1d': 'D',
  '1w': 'W',
};

interface BybitKlineResponse {
  retCode: number;
  retMsg: string;
  result?: { list?: [string, string, string, string, string, string, string][] };
}

export function parseBybitKlines(raw: unknown): Candle[] {
  const r = raw as BybitKlineResponse;
  if (!r || r.retCode !== 0 || !r.result?.list) {
    throw new ExchangeError('bybit', r?.retCode ?? 0, r?.retMsg ?? 'Beklenmeyen kline yanıtı');
  }
  // Bybit yeniden-eskiye döner; eskiden-yeniye çevir
  return r.result.list
    .map((k) => {
      const openTime = parseInt(k[0], 10);
      return {
        openTime,
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        closeTime: openTime,
      };
    })
    .reverse();
}

interface BybitTickerResponse {
  retCode: number;
  retMsg: string;
  result?: {
    list?: {
      symbol: string;
      lastPrice: string;
      price24hPcnt: string;
      highPrice24h: string;
      lowPrice24h: string;
      volume24h: string;
    }[];
  };
}

export function parseBybitTicker(raw: unknown): Omit<Ticker, 'exchange' | 'fetchedAt'> {
  const r = raw as BybitTickerResponse;
  const t = r?.result?.list?.[0];
  if (!r || r.retCode !== 0 || !t) {
    throw new ExchangeError('bybit', r?.retCode ?? 0, r?.retMsg ?? 'Beklenmeyen ticker yanıtı');
  }
  return {
    symbol: t.symbol,
    lastPrice: parseFloat(t.lastPrice),
    priceChangePercent24h: parseFloat(t.price24hPcnt) * 100,
    high24h: parseFloat(t.highPrice24h),
    low24h: parseFloat(t.lowPrice24h),
    volume24h: parseFloat(t.volume24h),
  };
}

export const bybitAdapter: ExchangeAdapter = {
  name: 'bybit',

  async fetchCandles(symbol, timeframe, limit) {
    const url = `${BASE}/kline?category=spot&symbol=${encodeURIComponent(symbol)}&interval=${INTERVAL_MAP[timeframe]}&limit=${limit}`;
    return parseBybitKlines(await fetchJson(url, 'bybit'));
  },

  async fetchTicker(symbol) {
    const url = `${BASE}/tickers?category=spot&symbol=${encodeURIComponent(symbol)}`;
    return {
      ...parseBybitTicker(await fetchJson(url, 'bybit')),
      exchange: 'bybit',
      fetchedAt: new Date().toISOString(),
    };
  },
};
