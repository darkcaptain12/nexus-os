import type { Candle, Ticker, Timeframe, ExchangeName } from '../types';

/**
 * Borsa adapter sözleşmesi. Yeni borsa eklemek için bu arayüzü implement edip
 * registry'e kaydetmek yeterli — çekirdek quant kodu değişmez.
 * Yalnızca public market-data uçları kullanılır; emir gönderimi bu katmanda YOK
 * (gerçek emirler her zaman Approval Queue arkasında kalır).
 */
export interface ExchangeAdapter {
  name: ExchangeName;
  fetchCandles(symbol: string, timeframe: Timeframe, limit: number): Promise<Candle[]>;
  fetchTicker(symbol: string): Promise<Ticker>;
}

export class ExchangeError extends Error {
  constructor(
    public exchange: string,
    public status: number,
    message: string,
  ) {
    super(`[${exchange}] ${message}`);
    this.name = 'ExchangeError';
  }
}

export async function fetchJson(url: string, exchange: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ExchangeError(exchange, res.status, `HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}
