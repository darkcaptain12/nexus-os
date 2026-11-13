import type { PaperAccountState, PaperPosition, ExchangeName } from './types';
import { getPaperTradingEngine } from './paper-trading';
import { getTicker } from './market-data';
import { getMemoryStore } from '@/lib/memory/store';

// Position Manager — açık pozisyonları gerçek fiyatlarla takip eder:
// SL/TP tetikler, unrealized PnL hesaplar, kapanışları Memory'e kaydeder.

export async function fetchOpenPositionPrices(
  exchange: ExchangeName = 'okx',
): Promise<Record<string, number>> {
  const engine = getPaperTradingEngine();
  const symbols = [...new Set(engine.getState().openPositions.map((p) => p.symbol))];
  const prices: Record<string, number> = {};
  await Promise.all(
    symbols.map(async (symbol) => {
      const ticker = await getTicker(exchange, symbol);
      prices[symbol] = ticker.lastPrice;
    }),
  );
  return prices;
}

/** Fiyatları çek, SL/TP kontrol et, güncel hesap durumunu döndür. */
export async function syncPositions(exchange: ExchangeName = 'okx'): Promise<PaperAccountState> {
  const engine = getPaperTradingEngine();
  const prices = await fetchOpenPositionPrices(exchange);
  const closed = engine.updatePrices(prices);

  for (const pos of closed) {
    getMemoryStore().addTimelineEntry({
      source: 'decision',
      title: `Pozisyon kapandı: ${pos.symbol} ${pos.direction}`,
      description: `PnL: ${pos.pnl} USDT (%${pos.pnlPercent}) — giriş ${pos.entryPrice}, çıkış ${pos.exitPrice}`,
      timestamp: pos.closedAt ?? new Date().toISOString(),
      metadata: { positionId: pos.id, symbol: pos.symbol, pnl: pos.pnl },
    });
  }

  return engine.getState(prices);
}

export async function closePosition(
  positionId: string,
  exchange: ExchangeName = 'okx',
): Promise<PaperPosition | null> {
  const engine = getPaperTradingEngine();
  const pos = engine.getState().openPositions.find((p) => p.id === positionId);
  if (!pos) return null;

  const ticker = await getTicker(exchange, pos.symbol);
  const closed = engine.closePositionAt(
    positionId,
    ticker.lastPrice,
    'Kullanıcı tarafından kapatıldı',
  );

  if (closed) {
    getMemoryStore().addTimelineEntry({
      source: 'decision',
      title: `Pozisyon manuel kapatıldı: ${closed.symbol} ${closed.direction}`,
      description: `PnL: ${closed.pnl} USDT (%${closed.pnlPercent})`,
      timestamp: closed.closedAt ?? new Date().toISOString(),
      metadata: { positionId: closed.id, symbol: closed.symbol, pnl: closed.pnl },
    });
  }
  return closed;
}
