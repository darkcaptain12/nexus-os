import { Suspense } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Shield,
  Brain,
  FlaskConical,
  Bell,
  Bot,
} from 'lucide-react';
import {
  getMarketSnapshot,
  getPortfolioOverview,
  runBacktestForSymbol,
  getStrategies,
} from '@/lib/quant/services/quant-service';
import { getAlertEngine } from '@/lib/quant/alert-engine';
import { ema, rsi, vwap } from '@/lib/quant/indicators';
import { CandlestickChart, type ChartOverlay } from '@/components/trading/candlestick-chart';
import type { MarketSnapshot } from '@/lib/quant/services/quant-service';
import type { PaperAccountState, BacktestResult } from '@/lib/quant/types';

export const metadata = { title: 'APEX Quant — NEXUS OS' };
export const dynamic = 'force-dynamic';

const SYMBOL = 'BTCUSDT';
const TIMEFRAME = '1h' as const;

async function TradingContent() {
  // Borsa erişilemezse sayfa çökmez — hata kartı gösterilir
  let snapshot: MarketSnapshot | null = null;
  let portfolio: PaperAccountState | null = null;
  let backtest: BacktestResult | null = null;
  let marketError: string | null = null;

  try {
    [snapshot, portfolio, backtest] = await Promise.all([
      getMarketSnapshot('okx', SYMBOL, TIMEFRAME, 120),
      getPortfolioOverview(),
      runBacktestForSymbol('ema-cross', 'okx', SYMBOL, TIMEFRAME, 500),
    ]);
  } catch (err) {
    marketError = err instanceof Error ? err.message : String(err);
  }

  const strategies = getStrategies();
  const alerts = getAlertEngine().getAll().slice(0, 5);

  if (marketError || !snapshot || !portfolio) {
    return (
      <div className="space-y-6">
        <h1 className="text-foreground text-2xl font-bold">APEX Quant</h1>
        <div className="border-border bg-card rounded-xl border p-6">
          <p className="text-sm font-medium text-red-400">Piyasa verisi alınamadı</p>
          <p className="text-muted-foreground mt-2 text-xs">{marketError ?? 'Bilinmeyen hata'}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Borsa API'lerine ağ erişimi gerekli (OKX/Binance/MEXC/Bybit public uçları).
          </p>
        </div>
      </div>
    );
  }

  const { ticker, candles, analysis } = snapshot;
  const closes = candles.map((c) => c.close);
  const overlays: ChartOverlay[] = [
    { name: 'EMA20', colorClass: 'stroke-blue-400', values: ema(closes, 20) },
    { name: 'EMA50', colorClass: 'stroke-orange-400', values: ema(closes, 50) },
    { name: 'VWAP', colorClass: 'stroke-cyan-400/70', values: vwap(candles) },
  ];
  const rsiSeries = rsi(closes, 14);
  const pnlUp = portfolio.todayPnl >= 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">APEX Quant</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Paper Trading · {SYMBOL} {TIMEFRAME} · {ticker.exchange}
          </p>
        </div>
        <span className="rounded-full bg-orange-500/20 px-3 py-1 text-xs text-orange-400">
          PAPER MODE — gerçek para kullanılmaz
        </span>
      </div>

      {/* Üst istatistikler */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border-border bg-card rounded-xl border p-4">
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <Wallet className="h-3.5 w-3.5" /> Portföy (Equity)
          </div>
          <p className="text-foreground mt-2 text-xl font-bold">
            {portfolio.equity.toFixed(2)} USDT
          </p>
          <p className="text-muted-foreground mt-1 text-[11px]">
            Bakiye {portfolio.balance.toFixed(2)} · Gerçekleşen {portfolio.realizedPnl.toFixed(2)}
          </p>
        </div>
        <div className="border-border bg-card rounded-xl border p-4">
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            {pnlUp ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}{' '}
            Günlük PnL
          </div>
          <p className={`mt-2 text-xl font-bold ${pnlUp ? 'text-green-400' : 'text-red-400'}`}>
            {portfolio.todayPnl.toFixed(2)} USDT
          </p>
          <p className="text-muted-foreground mt-1 text-[11px]">
            Açık PnL {portfolio.unrealizedPnl.toFixed(2)} USDT
          </p>
        </div>
        <div className="border-border bg-card rounded-xl border p-4">
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <TrendingUp className="h-3.5 w-3.5" /> {SYMBOL}
          </div>
          <p className="text-foreground mt-2 text-xl font-bold">{ticker.lastPrice}</p>
          <p
            className={`mt-1 text-[11px] ${ticker.priceChangePercent24h >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            24s: %{ticker.priceChangePercent24h.toFixed(2)}
          </p>
        </div>
        <div className="border-border bg-card rounded-xl border p-4">
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <Shield className="h-3.5 w-3.5" /> Risk Skoru
          </div>
          <p
            className={`mt-2 text-xl font-bold ${analysis.riskScore > 60 ? 'text-red-400' : analysis.riskScore > 40 ? 'text-orange-400' : 'text-green-400'}`}
          >
            {analysis.riskScore}/100
          </p>
          <p className="text-muted-foreground mt-1 text-[11px]">
            Volatilite: {analysis.volatility.level} (ATR %{analysis.volatility.atrPercent})
          </p>
        </div>
      </div>

      {/* Grafik */}
      <div className="border-border bg-card rounded-xl border p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-foreground text-sm font-semibold">
            {SYMBOL} · {TIMEFRAME} · Son {candles.length} mum
          </h2>
          <div className="flex gap-3 text-[10px]">
            <span className="text-blue-400">EMA20</span>
            <span className="text-orange-400">EMA50</span>
            <span className="text-cyan-400">VWAP</span>
            <span className="text-purple-400">RSI</span>
          </div>
        </div>
        <CandlestickChart candles={candles} overlays={overlays} rsi={rsiSeries} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI Yorumu */}
        <div className="border-border bg-card rounded-xl border p-4">
          <div className="mb-3 flex items-center gap-2">
            <Brain className="text-primary h-4 w-4" />
            <h2 className="text-foreground text-sm font-semibold">
              AI Yorumu (Kural Motoru — Explainable)
            </h2>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <p className="text-foreground font-medium">
                Trend:{' '}
                {analysis.trend.direction === 'up'
                  ? '↑ Yükseliş'
                  : analysis.trend.direction === 'down'
                    ? '↓ Düşüş'
                    : '→ Yatay'}{' '}
                (güç {analysis.trend.strength})
              </p>
              {analysis.trend.evidence.map((e, i) => (
                <p key={i} className="text-muted-foreground mt-0.5">
                  • {e}
                </p>
              ))}
            </div>
            <div>
              <p className="text-foreground font-medium">
                Momentum: {analysis.momentum.state} · RSI {analysis.momentum.rsi}
              </p>
              {analysis.momentum.evidence.map((e, i) => (
                <p key={i} className="text-muted-foreground mt-0.5">
                  • {e}
                </p>
              ))}
            </div>
            <div>
              <p className="text-foreground font-medium">
                Destek: {analysis.support.map((s) => s.toFixed(0)).join(', ') || '—'} · Direnç:{' '}
                {analysis.resistance.map((r) => r.toFixed(0)).join(', ') || '—'}
              </p>
            </div>
            <div>
              <p className="text-foreground font-medium">Senaryolar</p>
              {analysis.scenarios.map((s) => (
                <div key={s.name} className="bg-muted/40 mt-1 rounded p-2">
                  <p className="text-foreground">
                    {s.name} · olasılık %{s.probability}{' '}
                    {s.riskRewardRatio > 0 && `· R/R ${s.riskRewardRatio}`}
                  </p>
                  <p className="text-muted-foreground mt-0.5">{s.reasoning}</p>
                </div>
              ))}
            </div>
            {analysis.smcSummary.length > 0 && (
              <div>
                <p className="text-foreground font-medium">Smart Money Concepts</p>
                {analysis.smcSummary.map((s, i) => (
                  <p key={i} className="text-muted-foreground mt-0.5">
                    • {s}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Backtest */}
          <div className="border-border bg-card rounded-xl border p-4">
            <div className="mb-3 flex items-center gap-2">
              <FlaskConical className="text-primary h-4 w-4" />
              <h2 className="text-foreground text-sm font-semibold">
                Backtest: EMA Cross · {SYMBOL} {TIMEFRAME}
              </h2>
            </div>
            {backtest ? (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/40 rounded p-2">
                  <p
                    className={`text-sm font-bold ${backtest.totalReturnPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    %{backtest.totalReturnPercent}
                  </p>
                  <p className="text-muted-foreground text-[10px]">
                    Getiri ({backtest.candleCount} mum)
                  </p>
                </div>
                <div className="bg-muted/40 rounded p-2">
                  <p className="text-foreground text-sm font-bold">%{backtest.winRate}</p>
                  <p className="text-muted-foreground text-[10px]">
                    Win Rate ({backtest.totalTrades} işlem)
                  </p>
                </div>
                <div className="bg-muted/40 rounded p-2">
                  <p className="text-sm font-bold text-red-400">%{backtest.maxDrawdownPercent}</p>
                  <p className="text-muted-foreground text-[10px]">Max Drawdown</p>
                </div>
                <div className="bg-muted/40 rounded p-2">
                  <p className="text-foreground text-sm font-bold">
                    {backtest.profitFactor ?? '—'}
                  </p>
                  <p className="text-muted-foreground text-[10px]">Profit Factor</p>
                </div>
                <div className="bg-muted/40 rounded p-2">
                  <p className="text-foreground text-sm font-bold">{backtest.sharpeLike ?? '—'}</p>
                  <p className="text-muted-foreground text-[10px]">Sharpe-benzeri</p>
                </div>
                <div className="bg-muted/40 rounded p-2">
                  <p className="text-foreground text-sm font-bold">{backtest.durationMs}ms</p>
                  <p className="text-muted-foreground text-[10px]">Süre</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">Backtest çalıştırılamadı</p>
            )}
          </div>

          {/* Açık Pozisyonlar + Emirler */}
          <div className="border-border bg-card rounded-xl border p-4">
            <div className="mb-3 flex items-center gap-2">
              <Bot className="text-primary h-4 w-4" />
              <h2 className="text-foreground text-sm font-semibold">
                Açık Pozisyonlar ({portfolio.openPositions.length}) · Emirler (
                {portfolio.orders.length})
              </h2>
            </div>
            {portfolio.openPositions.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                Açık pozisyon yok. Trading Agent ile başlat: hedefe "Trading analizi yap: BTCUSDT"
                yaz — emir adımı Approval Queue onayına düşer.
              </p>
            ) : (
              <div className="space-y-1">
                {portfolio.openPositions.map((p) => (
                  <div
                    key={p.id}
                    className="bg-muted/40 flex items-center justify-between rounded px-2 py-1.5 text-xs"
                  >
                    <span className="text-foreground font-medium">
                      {p.symbol} {p.direction === 'long' ? '🟢 LONG' : '🔴 SHORT'} × {p.quantity}
                    </span>
                    <span className="text-muted-foreground">
                      Giriş {p.entryPrice} · SL {p.stopLoss ?? '—'} · TP {p.takeProfit ?? '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {portfolio.orders.length > 0 && (
              <div className="mt-2 space-y-1">
                {portfolio.orders.slice(0, 5).map((o) => (
                  <div key={o.id} className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      {o.side.toUpperCase()} {o.quantity} {o.symbol} ({o.type})
                    </span>
                    <span
                      className={
                        o.status === 'filled'
                          ? 'text-green-400'
                          : o.status === 'rejected'
                            ? 'text-red-400'
                            : 'text-orange-400'
                      }
                    >
                      {o.status}
                      {o.filledPrice ? ` @ ${o.filledPrice}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stratejiler + Alarmlar */}
          <div className="border-border bg-card rounded-xl border p-4">
            <div className="mb-3 flex items-center gap-2">
              <Bell className="text-primary h-4 w-4" />
              <h2 className="text-foreground text-sm font-semibold">
                Stratejiler ({strategies.length}) · Alarmlar ({alerts.length})
              </h2>
            </div>
            <div className="space-y-1 text-xs">
              {strategies.map((s) => (
                <div key={s.id} className="flex items-center justify-between">
                  <span className="text-foreground">{s.name}</span>
                  <span className="text-muted-foreground text-[10px]">{s.type}</span>
                </div>
              ))}
            </div>
            {alerts.length > 0 && (
              <div className="border-border mt-2 space-y-1 border-t pt-2 text-[11px]">
                {alerts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{a.message}</span>
                    <span
                      className={
                        a.status === 'triggered' ? 'text-orange-400' : 'text-muted-foreground'
                      }
                    >
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TradingPage() {
  return (
    <Suspense fallback={<TradingSkeleton />}>
      <TradingContent />
    </Suspense>
  );
}

function TradingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-muted h-8 w-48 animate-pulse rounded" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-border bg-card h-24 animate-pulse rounded-xl border" />
        ))}
      </div>
      <div className="border-border bg-card h-96 animate-pulse rounded-xl border" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border-border bg-card h-64 animate-pulse rounded-xl border" />
        <div className="border-border bg-card h-64 animate-pulse rounded-xl border" />
      </div>
    </div>
  );
}
