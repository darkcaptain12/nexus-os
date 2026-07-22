import { ShoppingBag, TrendingUp, Package, Target, Truck, Sparkles } from 'lucide-react';
import type { CommerceIntelligenceDashboard } from '@/lib/commerce/intelligence/types';
import { WidgetShell } from './widget-shell';

export interface CommerceWidgetProps {
  dashboard: CommerceIntelligenceDashboard;
}

export function CommerceWidget({ dashboard }: CommerceWidgetProps) {
  const d = dashboard;
  const roasColor =
    d.ads.averageRoas >= 2
      ? 'text-green-400'
      : d.ads.averageRoas >= 1
        ? 'text-orange-400'
        : 'text-red-400';

  return (
    <WidgetShell
      title="Commerce Intelligence"
      icon={<ShoppingBag className="h-4 w-4" />}
      action={
        <span className="bg-primary/20 text-primary rounded-full px-2 py-0.5 text-[10px]">
          {d.revenue.currency} {d.revenue.revenue.toFixed(0)}
        </span>
      }
    >
      {/* Revenue / Profit / ROAS / Hunter */}
      <div className="mb-3 grid grid-cols-4 gap-1.5">
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className="text-foreground text-[13px] font-bold">{d.revenue.profit.toFixed(0)}</p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Kâr</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className={`text-[13px] font-bold ${roasColor}`}>{d.ads.averageRoas}x</p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">ROAS</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className="text-foreground text-[13px] font-bold">{d.orders.total}</p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Sipariş</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p
            className={`text-[13px] font-bold ${d.hunterQueue.topScore >= 75 ? 'text-green-400' : 'text-foreground'}`}
          >
            {d.hunterQueue.topScore}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">En İyi Skor</p>
        </div>
      </div>

      {/* Metrikler satırı */}
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
        <span className="flex items-center gap-1">
          <TrendingUp className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">AOV:</span>
          <span className="text-foreground font-medium">{d.revenue.aov}</span>
        </span>
        <span className="flex items-center gap-1">
          <Target className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">CAC:</span>
          <span className="text-foreground font-medium">{d.revenue.cac}</span>
        </span>
        <span className="flex items-center gap-1">
          <Package className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">Kuyruk:</span>
          <span className="text-foreground font-medium">{d.hunterQueue.pending}</span>
        </span>
        <span className="flex items-center gap-1">
          <Truck className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">Tedarikçi:</span>
          <span className="text-foreground font-medium">{d.supplierHealth.averageRating}★</span>
        </span>
      </div>

      {/* Executive önerisi */}
      <div className="bg-primary/10 mb-2 flex items-start gap-1.5 rounded px-2 py-1.5">
        <Sparkles className="text-primary mt-0.5 h-3 w-3 shrink-0" />
        <p className="text-foreground text-[10px]">{d.executiveRecommendation}</p>
      </div>

      {/* Alerts */}
      {d.alerts.length === 0 ? (
        <p className="text-muted-foreground text-center text-[10px]">
          Uyarı yok — Hunter ile ürün avı başlat
        </p>
      ) : (
        <div className="space-y-1">
          {d.alerts.slice(0, 3).map((a, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              <span
                className={
                  a.severity === 'critical'
                    ? 'text-red-400'
                    : a.severity === 'warning'
                      ? 'text-orange-400'
                      : 'text-blue-400'
                }
              >
                ●
              </span>
              <span className="text-muted-foreground">{a.message}</span>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
