import { Puzzle, CheckCircle, XCircle, Activity, Store, Webhook } from 'lucide-react';
import type { DeveloperDashboard } from '@/lib/plugins/types';
import { WidgetShell } from './widget-shell';

export interface DeveloperWidgetProps {
  dashboard: DeveloperDashboard;
}

export function DeveloperWidget({ dashboard }: DeveloperWidgetProps) {
  const d = dashboard;
  return (
    <WidgetShell
      title="Developer Platform"
      icon={<Puzzle className="h-4 w-4" />}
      action={
        <span className="bg-primary/20 text-primary rounded-full px-2 py-0.5 text-[10px]">
          {d.totalPlugins} plugin
        </span>
      }
    >
      {/* Plugin sayaçları */}
      <div className="mb-3 grid grid-cols-4 gap-1.5">
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className="text-[13px] font-bold text-green-400">{d.enabledPlugins}</p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Aktif</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className="text-muted-foreground text-[13px] font-bold">{d.disabledPlugins}</p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Disabled</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p
            className={`text-[13px] font-bold ${d.errorPlugins > 0 ? 'text-red-400' : 'text-foreground'}`}
          >
            {d.errorPlugins}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Hata</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className="text-foreground text-[13px] font-bold">{d.apiUsageTotal}</p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">API Usage</p>
        </div>
      </div>

      {/* Event rate + webhook + marketplace */}
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
        <span className="flex items-center gap-1">
          <Activity className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">Event:</span>
          <span className="text-foreground font-medium">{d.eventRate}/s</span>
        </span>
        <span className="flex items-center gap-1">
          <Webhook className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">Webhook:</span>
          <span className="text-foreground font-medium">{d.webhookQueueLength}</span>
        </span>
        <span className="flex items-center gap-1">
          <Store className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">Market:</span>
          <span className="text-foreground font-medium">{d.marketplaceCount}</span>
        </span>
      </div>

      {/* Top plugins */}
      {d.topPlugins.length === 0 ? (
        <p className="text-muted-foreground text-center text-[10px]">
          Marketplace'ten plugin kur — {d.marketplaceCount} official plugin
        </p>
      ) : (
        <div className="space-y-1">
          {d.topPlugins.slice(0, 4).map((p) => (
            <div key={p.id} className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1.5">
                {p.health === 'healthy' ? (
                  <CheckCircle className="h-2.5 w-2.5 text-green-400" />
                ) : (
                  <XCircle className="h-2.5 w-2.5 text-red-400" />
                )}
                <span className="text-foreground">{p.name}</span>
              </span>
              <span className="text-muted-foreground">{p.invocations} çağrı</span>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
