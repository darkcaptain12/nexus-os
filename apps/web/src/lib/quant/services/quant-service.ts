import type {
  ExchangeName,
  Timeframe,
  Candle,
  Ticker,
  MarketAnalysis,
  PaperAccountState,
  BacktestResult,
  StrategyInfo,
} from '../types';
import { getCandles, getTicker } from '../market-data';
import { analyzeMarket } from '../analysis-engine';
import { getPaperTradingEngine } from '../paper-trading';
import { syncPositions } from '../position-manager';
import { runBacktest } from '../backtest-engine';
import { listStrategies } from '../strategy-engine';
import { getAlertEngine } from '../alert-engine';

/**
 * Quant Service — mobil-hazır servis katmanı.
 *
 * Kural: bu katman yalnızca düz JSON-serileştirilebilir veri döner; UI, cookie,
 * framework tipi sızmaz. Web API route'ları, ileride iPhone/Android/iPad/
 * Apple Watch/Wear OS istemcileri ve APEX Voice aynı fonksiyonları çağırır.
 */

export interface MarketSnapshot {
  ticker: Ticker;
  candles: Candle[];
  analysis: MarketAnalysis;
}

export async function getMarketSnapshot(
  exchange: ExchangeName,
  symbol: string,
  timeframe: Timeframe,
  limit = 200,
): Promise<MarketSnapshot> {
  const [ticker, candles] = await Promise.all([
    getTicker(exchange, symbol),
    getCandles(exchange, symbol, timeframe, limit),
  ]);
  return { ticker, candles, analysis: analyzeMarket(symbol, timeframe, exchange, candles) };
}

export async function getPortfolioOverview(
  exchange: ExchangeName = 'okx',
): Promise<PaperAccountState> {
  return syncPositions(exchange);
}

export interface TradingStatusSummary {
  equity: number;
  balance: number;
  todayPnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
  openPositionCount: number;
  openPositions: { symbol: string; direction: string; pnl: number }[];
  activeAlerts: number;
  generatedAt: string;
}

/** Sesli asistan ve watch-widget'lar için kompakt durum özeti. */
export async function getTradingStatusSummary(
  exchange: ExchangeName = 'okx',
): Promise<TradingStatusSummary> {
  const state = await syncPositions(exchange);
  const unrealizedBySymbol = state.openPositions.map((p) => ({
    symbol: p.symbol,
    direction: p.direction,
    pnl: p.pnl,
  }));
  return {
    equity: state.equity,
    balance: state.balance,
    todayPnl: state.todayPnl,
    realizedPnl: state.realizedPnl,
    unrealizedPnl: state.unrealizedPnl,
    openPositionCount: state.openPositions.length,
    openPositions: unrealizedBySymbol,
    activeAlerts: getAlertEngine().getActive().length,
    generatedAt: new Date().toISOString(),
  };
}

export async function runBacktestForSymbol(
  strategyId: string,
  exchange: ExchangeName,
  symbol: string,
  timeframe: Timeframe,
  limit = 500,
  paramOverrides: Record<string, number> = {},
): Promise<BacktestResult> {
  const candles = await getCandles(exchange, symbol, timeframe, limit);
  return runBacktest({ strategyId, symbol, timeframe, candles, paramOverrides });
}

export function getStrategies(): StrategyInfo[] {
  return listStrategies();
}

export function resetPaperAccount(startingBalance?: number): PaperAccountState {
  const engine = getPaperTradingEngine();
  engine.reset(startingBalance);
  return engine.getState();
}
