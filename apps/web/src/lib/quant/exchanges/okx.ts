import type { Candle, Ticker, Timeframe } from '../types';
import type { ExchangeAdapter } from './types';
import { fetchJson, ExchangeError } from './types';

// OKX v5 public API. Türkiye'den Binance/MEXC/Bybit'e bölgesel erişim engeli
// olduğundan canlı veri için varsayılan borsa budur — registry mimarisinin
// "yeni borsa eklenebilir" kontratının uygulamadaki örneği.
const BASE = 'https://www.okx.com/api/v5/market';

const INTERVAL_MAP: Record<Timeframe, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1H',
  '4h': '4H',
  '1d': '1D',
  '1w': '1W',
};

/** BTCUSDT → BTC-USDT (OKX instId formatı). Zaten tireli gelirse dokunma. */
export function toOkxInstId(symbol: string): string {
  if (symbol.includes('-')) return symbol;
  for (const quote of ['USDT', 'USDC', 'USD', 'TRY', 'BTC', 'ETH']) {
    if (symbol.endsWith(quote) && symbol.length > quote.length) {
      return `${symbol.slice(0, -quote.length)}-${quote}`;
    }
  }
  return symbol;
}

interface OkxCandleResponse {
  code: string;
  msg: string;
  data?: string[][];
}

export function parseOkxCandles(raw: unknown): Candle[] {
  const r = raw as OkxCandleResponse;
  if (!r || r.code !== '0' || !Array.isArray(r.data)) {
    throw new ExchangeError('okx', Number(r?.code ?? 0), r?.msg ?? 'Beklenmeyen candle yanıtı');
  }
  // OKX yeniden-eskiye döner; eskiden-yeniye çevir
  return r.data
    .map((k) => {
      const openTime = parseInt(k[0]!, 10);
      return {
        openTime,
        open: parseFloat(k[1]!),
        high: parseFloat(k[2]!),
        low: parseFloat(k[3]!),
        close: parseFloat(k[4]!),
        volume: parseFloat(k[5]!),
        closeTime: openTime,
      };
    })
    .reverse();
}

interface OkxTickerResponse {
  code: string;
  msg: string;
  data?: {
    instId: string;
    last: string;
    open24h: string;
    high24h: string;
    low24h: string;
    vol24h: string;
  }[];
}

export function parseOkxTicker(raw: unknown): Omit<Ticker, 'exchange' | 'fetchedAt'> {
  const r = raw as OkxTickerResponse;
  const t = r?.data?.[0];
  if (!r || r.code !== '0' || !t) {
    throw new ExchangeError('okx', Number(r?.code ?? 0), r?.msg ?? 'Beklenmeyen ticker yanıtı');
  }
  const last = parseFloat(t.last);
  const open24h = parseFloat(t.open24h);
  return {
    symbol: t.instId.replace('-', ''),
    lastPrice: last,
    priceChangePercent24h: open24h > 0 ? ((last - open24h) / open24h) * 100 : 0,
    high24h: parseFloat(t.high24h),
    low24h: parseFloat(t.low24h),
    volume24h: parseFloat(t.vol24h),
  };
}

export const okxAdapter: ExchangeAdapter = {
  name: 'okx',

  async fetchCandles(symbol, timeframe, limit) {
    const url = `${BASE}/candles?instId=${encodeURIComponent(toOkxInstId(symbol))}&bar=${INTERVAL_MAP[timeframe]}&limit=${Math.min(limit, 300)}`;
    return parseOkxCandles(await fetchJson(url, 'okx'));
  },

  async fetchTicker(symbol) {
    const url = `${BASE}/ticker?instId=${encodeURIComponent(toOkxInstId(symbol))}`;
    return {
      ...parseOkxTicker(await fetchJson(url, 'okx')),
      exchange: 'okx',
      fetchedAt: new Date().toISOString(),
    };
  },
};
