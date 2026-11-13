import { TrendingUp, TrendingDown, Shield, Activity, AlertTriangle } from 'lucide-react';
import type { PortfolioIntelligence, LiveTradingAlert } from '@/lib/quant/live/types';
import { WidgetShell } from './widget-shell';

export interface LiveTradingWidgetProps {
  portfolio: PortfolioIntelligence;
  journalStats: { total: number; wins: number; losses: number; winRate: number; totalPnl: number };
  pendingOrders: number;
  alerts: LiveTradingAlert[];
}

export function LiveTradingWidget({
  portfolio,
  journalStats,
  pendingOrders,
  alerts,
}: LiveTradingWidgetProps) {
  const p = portfolio;
  const pnlUp = p.dailyPnl >= 0;

  return (
    <WidgetShell
      title="Live Trading"
      icon={<Activity className="h-4 w-4" />}
      action={
        <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] text-orange-400">
          Approval korumalı
        </span>
      }
    >
      {/* Equity / PnL / Exposure / Drawdown */}
      <div className="mb-3 grid grid-cols-4 gap-1.5">
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className="text-foreground text-[12px] font-bold">{p.equity.toFixed(0)}</p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Equity</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className={`text-[12px] font-bold ${pnlUp ? 'text-green-400' : 'text-red-400'}`}>
            {pnlUp ? '+' : ''}
            {p.dailyPnl.toFixed(0)}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Günlük</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className="text-foreground text-[12px] font-bold">%{p.exposurePercent}</p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Exposure</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p
            className={`text-[12px] font-bold ${p.maxDrawdownPercent > 15 ? 'text-red-400' : 'text-foreground'}`}
          >
            %{p.maxDrawdownPercent}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Drawdown</p>
        </div>
      </div>

      {/* Journal + pozisyon + emir */}
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
        <span className="flex items-center gap-1">
          {pnlUp ? (
            <TrendingUp className="h-3 w-3 text-green-400" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-400" />
          )}
          <span className="text-muted-foreground">Açık:</span>
          <span className="text-foreground font-medium">{p.openPositionCount}</span>
        </span>
        <span className="flex items-center gap-1">
          <Shield className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">Win rate:</span>
          <span className="text-foreground font-medium">%{journalStats.winRate}</span>
        </span>
        {pendingOrders > 0 && (
          <span className="text-orange-400">{pendingOrders} onay bekliyor</span>
        )}
      </div>

      {/* Allocation */}
      {p.allocation.length > 0 && (
        <div className="mb-2 space-y-0.5">
          {p.allocation.slice(0, 3).map((a) => (
            <div key={a.symbol} className="flex items-center gap-1.5 text-[10px]">
              <span className="text-foreground w-16 shrink-0">{a.symbol}</span>
              <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full"
                  style={{ width: `${Math.min(100, a.percent)}%` }}
                />
              </div>
              <span className="text-muted-foreground w-8 shrink-0 text-right">%{a.percent}</span>
            </div>
          ))}
        </div>
      )}

      {/* Alerts */}
      {alerts.length === 0 ? (
        <p className="text-muted-foreground text-center text-[10px]">
          Canlı emir Approval Queue'dan geçer — Risk v2 korumalı
        </p>
      ) : (
        <div className="space-y-1">
          {alerts.slice(0, 3).map((a) => (
            <div key={a.id} className="flex items-center gap-1.5 text-[10px]">
              {a.severity === 'critical' ? (
                <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-red-400" />
              ) : (
                <span className={a.severity === 'warning' ? 'text-orange-400' : 'text-blue-400'}>
                  ●
                </span>
              )}
              <span className="text-muted-foreground truncate">{a.message}</span>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
