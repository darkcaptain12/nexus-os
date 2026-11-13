import type { Candle, Timeframe, BacktestResult, BacktestTrade, PositionDirection } from './types';
import { runStrategy } from './strategy-engine';

// Backtest Engine — sinyalleri tarihsel mumlar üzerinde yürütür.
// Tek pozisyon modeli: sinyal ters dönerse mevcut pozisyon kapanıp yenisi açılır.

const BACKTEST_FEE_RATE = 0.001;

export interface BacktestInput {
  strategyId: string;
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[];
  startingBalance?: number;
  positionPercent?: number; // her işlemde kullanılacak bakiye yüzdesi
  paramOverrides?: Record<string, number>;
}

export function runBacktest(input: BacktestInput): BacktestResult {
  const start = performance.now();
  const startingBalance = input.startingBalance ?? 10_000;
  const positionPercent = input.positionPercent ?? 100;
  const { candles } = input;

  const signals = runStrategy(input.strategyId, candles, input.paramOverrides ?? {});

  let balance = startingBalance;
  let open: {
    direction: PositionDirection;
    entryIndex: number;
    entryPrice: number;
    value: number;
  } | null = null;
  const trades: BacktestTrade[] = [];
  const equityCurve: number[] = [startingBalance];

  const closeAt = (index: number, price: number, reason: string): void => {
    if (!open) return;
    const gross =
      open.direction === 'long'
        ? (price / open.entryPrice - 1) * open.value
        : (1 - price / open.entryPrice) * open.value;
    const fees = open.value * BACKTEST_FEE_RATE * 2;
    const net = gross - fees;
    balance += net;
    trades.push({
      direction: open.direction,
      entryIndex: open.entryIndex,
      exitIndex: index,
      entryPrice: open.entryPrice,
      exitPrice: price,
      pnl: Number(net.toFixed(2)),
      pnlPercent: Number(((net / open.value) * 100).toFixed(4)),
      reason,
    });
    equityCurve.push(balance);
    open = null;
  };

  for (const signal of signals) {
    const price = signal.price;
    if (signal.action === 'long') {
      if (open?.direction === 'short')
        closeAt(signal.index, price, `Ters sinyal: ${signal.reason}`);
      if (!open) {
        open = {
          direction: 'long',
          entryIndex: signal.index,
          entryPrice: price,
          value: balance * (positionPercent / 100),
        };
      }
    } else if (signal.action === 'short') {
      if (open?.direction === 'long') closeAt(signal.index, price, `Ters sinyal: ${signal.reason}`);
      if (!open) {
        open = {
          direction: 'short',
          entryIndex: signal.index,
          entryPrice: price,
          value: balance * (positionPercent / 100),
        };
      }
    } else if (signal.action === 'exit' && open) {
      closeAt(signal.index, price, signal.reason);
    }
  }

  // Açık kalan pozisyonu son mumda kapat
  if (open !== null && candles.length > 0) {
    closeAt(
      candles.length - 1,
      candles[candles.length - 1]!.close,
      'Backtest sonu — pozisyon kapatıldı',
    );
  }

  const winning = trades.filter((t) => t.pnl > 0);
  const losing = trades.filter((t) => t.pnl <= 0);
  const grossProfit = winning.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losing.reduce((s, t) => s + t.pnl, 0));

  // Max drawdown — equity eğrisi üzerinden
  let peak = equityCurve[0]!;
  let maxDrawdown = 0;
  for (const eq of equityCurve) {
    if (eq > peak) peak = eq;
    const dd = ((peak - eq) / peak) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Sharpe-benzeri: işlem getirilerinin ortalaması / std sapması
  let sharpeLike: number | null = null;
  if (trades.length >= 2) {
    const returns = trades.map((t) => t.pnlPercent);
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
    const std = Math.sqrt(variance);
    sharpeLike = std > 0 ? Number((mean / std).toFixed(2)) : null;
  }

  return {
    strategyId: input.strategyId,
    symbol: input.symbol,
    timeframe: input.timeframe,
    candleCount: candles.length,
    startingBalance,
    endingBalance: Number(balance.toFixed(2)),
    totalReturnPercent: Number((((balance - startingBalance) / startingBalance) * 100).toFixed(2)),
    trades,
    totalTrades: trades.length,
    winningTrades: winning.length,
    losingTrades: losing.length,
    winRate: trades.length > 0 ? Number(((winning.length / trades.length) * 100).toFixed(1)) : 0,
    maxDrawdownPercent: Number(maxDrawdown.toFixed(2)),
    profitFactor: grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : null,
    sharpeLike,
    averageTradePercent:
      trades.length > 0
        ? Number((trades.reduce((s, t) => s + t.pnlPercent, 0) / trades.length).toFixed(4))
        : 0,
    durationMs: Math.round(performance.now() - start),
    generatedAt: new Date().toISOString(),
  };
}
