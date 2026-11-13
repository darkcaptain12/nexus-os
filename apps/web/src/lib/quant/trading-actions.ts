import type { ActionHandler } from '@apex-os/action-engine';
import type { ExchangeName, Timeframe, OrderSide } from './types';
import { getCandles, getTicker } from './market-data';
import { analyzeMarket } from './analysis-engine';
import { getPaperTradingEngine } from './paper-trading';
import { checkOrderRisk } from './risk-engine';
import { getMemoryStore } from '@/lib/memory/store';
import { recordTrade, recordMarketAnalysis } from '@/lib/knowledge/auto-linker';

// Trading action handler'ları — Action Engine'e kayıt edilir.
// trade.paperOrder yalnızca PAPER hesaba emir basar; gerçek borsaya emir gönderen
// bir action YOKTUR. Approval Queue son kontrol noktasıdır (agent planner
// order adımını requiresApproval:true işaretler).

export const tradeAnalyzeHandler: ActionHandler = {
  async execute(params: Record<string, unknown>) {
    const symbol = (params['symbol'] as string) ?? 'BTCUSDT';
    const exchange = ((params['exchange'] as string) ?? 'okx') as ExchangeName;
    const timeframe = ((params['timeframe'] as string) ?? '1h') as Timeframe;

    const candles = await getCandles(exchange, symbol, timeframe, 200);
    const analysis = analyzeMarket(symbol, timeframe, exchange, candles);

    recordMarketAnalysis(
      symbol,
      exchange,
      `Trend ${analysis.trend.direction} güç ${analysis.trend.strength}, RSI ${analysis.momentum.rsi}, risk ${analysis.riskScore}`,
    );

    getMemoryStore().addTimelineEntry({
      source: 'decision',
      title: `Piyasa analizi: ${symbol} ${timeframe}`,
      description: `Trend ${analysis.trend.direction} (güç ${analysis.trend.strength}), RSI ${analysis.momentum.rsi}, risk ${analysis.riskScore}`,
      timestamp: analysis.generatedAt,
      metadata: { symbol, timeframe, riskScore: analysis.riskScore },
    });
    return analysis;
  },
};

export const tradeRiskCheckHandler: ActionHandler = {
  async execute(params: Record<string, unknown>) {
    const symbol = (params['symbol'] as string) ?? 'BTCUSDT';
    const exchange = ((params['exchange'] as string) ?? 'okx') as ExchangeName;
    const quantity = Number(params['quantity'] ?? 0.001);
    const stopLoss = params['stopLoss'] !== undefined ? Number(params['stopLoss']) : null;

    const ticker = await getTicker(exchange, symbol);
    const engine = getPaperTradingEngine();
    const positionValue = quantity * ticker.lastPrice;
    const result = checkOrderRisk(
      engine.getState({ [symbol]: ticker.lastPrice }),
      { positionValue, stopLoss: stopLoss ?? ticker.lastPrice * 0.97 },
      engine.getRiskProfile(),
    );
    return { ...result, positionValue, lastPrice: ticker.lastPrice };
  },
};

export const tradePaperOrderHandler: ActionHandler = {
  async execute(params: Record<string, unknown>) {
    const symbol = (params['symbol'] as string) ?? 'BTCUSDT';
    const exchange = ((params['exchange'] as string) ?? 'okx') as ExchangeName;
    const side = ((params['side'] as string) ?? 'buy') as OrderSide;
    const quantity = Number(params['quantity'] ?? 0.001);

    const ticker = await getTicker(exchange, symbol);
    const marketPrice = ticker.lastPrice;
    const stopLoss =
      params['stopLoss'] !== undefined
        ? Number(params['stopLoss'])
        : side === 'buy'
          ? marketPrice * 0.97
          : marketPrice * 1.03;
    const takeProfit =
      params['takeProfit'] !== undefined
        ? Number(params['takeProfit'])
        : side === 'buy'
          ? marketPrice * 1.06
          : marketPrice * 0.94;

    const order = getPaperTradingEngine().placeOrder({
      symbol,
      side,
      type: 'market',
      quantity,
      marketPrice,
      stopLoss,
      takeProfit,
      source: 'agent',
      strategy: params['strategy'] as string | undefined,
    });

    if (order.status === 'rejected') {
      throw new Error(`Paper emir reddedildi: ${order.error}`);
    }

    recordTrade({
      symbol,
      side,
      quantity,
      price: order.filledPrice,
      exchange,
      strategy: params['strategy'] as string | undefined,
      agentName: params['agentName'] as string | undefined,
    });

    getMemoryStore().addTimelineEntry({
      source: 'decision',
      title: `Paper emir: ${side.toUpperCase()} ${quantity} ${symbol}`,
      description: `Fill: ${order.filledPrice} | SL: ${stopLoss.toFixed(2)} | TP: ${takeProfit.toFixed(2)}`,
      timestamp: order.filledAt ?? order.createdAt,
      metadata: { orderId: order.id, symbol, side, quantity },
    });
    return order;
  },
};
