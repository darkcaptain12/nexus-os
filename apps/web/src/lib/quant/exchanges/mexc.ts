import type { ExchangeAdapter } from './types';
import type { Timeframe } from '../types';
import { fetchJson } from './types';
import { parseBinanceKlines, parseBinanceTicker } from './binance';

// MEXC spot API'si Binance v3 şemasıyla uyumludur — parser'lar paylaşılır,
// yalnızca base URL ve desteklenen interval isimleri farklıdır.
const BASE = 'https://api.mexc.com/api/v3';

const INTERVAL_MAP: Record<Timeframe, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '60m',
  '4h': '4h',
  '1d': '1d',
  '1w': '1W',
};

export const mexcAdapter: ExchangeAdapter = {
  name: 'mexc',

  async fetchCandles(symbol, timeframe, limit) {
    const url = `${BASE}/klines?symbol=${encodeURIComponent(symbol)}&interval=${INTERVAL_MAP[timeframe]}&limit=${limit}`;
    return parseBinanceKlines(await fetchJson(url, 'mexc'));
  },

  async fetchTicker(symbol) {
    const url = `${BASE}/ticker/24hr?symbol=${encodeURIComponent(symbol)}`;
    return {
      ...parseBinanceTicker(await fetchJson(url, 'mexc')),
      exchange: 'mexc',
      fetchedAt: new Date().toISOString(),
    };
  },
};
