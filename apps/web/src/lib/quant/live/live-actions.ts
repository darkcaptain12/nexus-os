import type { ActionHandler } from '@apex-os/action-engine';
import type { ExchangeName, OrderSide } from '../types';
import { getTicker } from '../market-data';
import { getPaperTradingEngine } from '../paper-trading';
import { markOrderFilled, getLiveOrder } from './live-order-engine';
import { journalOpen } from './trade-journal';
import { raiseAlert } from './live-alerts';
import { isLiveTradingEnabled } from './kill-switch';
import { okxPlaceLiveOrder } from '../exchanges/okx-trade';

// trade.liveOrder handler — YALNIZCA Approval Queue onayı sonrası çalışır
// (Action Engine critical risk → onaysız execute edilmez). Onaydan sonra:
// paper engine ile fill takibi + (kill-switch açıksa) GERÇEK OKX emri.
//
// GÜVENLİK ZİNCİRİ (hepsi geçmeli): Risk Engine v2 → Approval Queue onayı →
// kill-switch (env LIVE_TRADING_ENABLED + runtime armed). Kill-switch KAPALIYSA
// yalnız paper tracking (gerçek emir GİTMEZ) — bu varsayılan davranıştır.

export const liveOrderHandler: ActionHandler = {
  async execute(params: Record<string, unknown>) {
    const orderId = params['orderId'] as string;
    const symbol = params['symbol'] as string;
    const side = (params['side'] as OrderSide) ?? 'buy';
    const quantity = Number(params['quantity'] ?? 0);
    const exchange = (params['exchange'] as ExchangeName) ?? 'okx';

    // Gerçek fiyat
    const ticker = await getTicker(exchange, symbol);
    const fillPrice = Number(params['marketPrice'] ?? ticker.lastPrice);

    // Paper engine ile pozisyon takibi (SL/TP/PnL) — her zaman (canlıda da PnL takibi için)
    const engine = getPaperTradingEngine();
    const paperOrder = engine.placeOrder({
      symbol,
      side,
      type: 'market',
      quantity,
      marketPrice: fillPrice,
      stopLoss: side === 'buy' ? fillPrice * 0.97 : fillPrice * 1.03,
      takeProfit: side === 'buy' ? fillPrice * 1.06 : fillPrice * 0.94,
      source: 'agent',
    });

    if (paperOrder.status === 'rejected') {
      throw new Error(`Live emir takip hesabında reddedildi: ${paperOrder.error}`);
    }

    // ── SON GÜVENLİK KAPISI: kill-switch açıksa GERÇEK OKX emri ──
    // Kapalıysa (varsayılan) exchangeOrderId placeholder kalır, gerçek emir gitmez.
    let exchangeOrderId = `PAPER-${exchange}-${Date.now()}`;
    let liveExecuted = false;
    if (isLiveTradingEnabled() && exchange === 'okx') {
      const live = await okxPlaceLiveOrder({ symbol, side, quantity, ordType: 'market' });
      exchangeOrderId = live.exchangeOrderId;
      liveExecuted = true;
      raiseAlert(
        'position_opened',
        symbol,
        `GERÇEK OKX emri: ${side.toUpperCase()} ${quantity} ${symbol} (ordId ${live.exchangeOrderId})`,
      );
    }

    markOrderFilled(orderId, exchangeOrderId, fillPrice);

    const liveOrder = getLiveOrder(orderId);
    // Trade Journal + Knowledge Graph (reuse recordTrade)
    journalOpen({
      symbol,
      direction: side === 'buy' ? 'long' : 'short',
      entryPrice: fillPrice,
      quantity,
      reason: liveOrder?.input.reason ?? 'Live emir (onaylı)',
      aiRationale: liveOrder?.input.strategy
        ? `Strateji: ${liveOrder.input.strategy}`
        : 'Manuel/agent kararı',
      riskScore: 40,
      exchange,
      strategy: liveOrder?.input.strategy,
    });

    if (!liveExecuted) {
      raiseAlert(
        'position_opened',
        symbol,
        `${side.toUpperCase()} ${quantity} ${symbol} @ ${fillPrice} (onaylı, paper takip — kill-switch kapalı)`,
      );
    }

    return { orderId, exchangeOrderId, fillPrice, liveExecuted, tracked: true };
  },
};
