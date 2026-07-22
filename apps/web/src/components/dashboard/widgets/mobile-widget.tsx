import { Smartphone, Watch, Battery, Bell, CloudOff, RefreshCw } from 'lucide-react';
import type { MobileSystemHealth } from '@/lib/mobile/types';
import { WidgetShell } from './widget-shell';

const PLATFORM_LABELS: Record<string, string> = {
  ios: 'iPhone',
  ipad: 'iPad',
  android: 'Android',
  'apple-watch': 'Watch',
  'wear-os': 'Wear OS',
};

export interface MobileWidgetProps {
  health: MobileSystemHealth;
}

export function MobileWidget({ health }: MobileWidgetProps) {
  return (
    <WidgetShell
      title="Mobile Platform"
      icon={<Smartphone className="h-4 w-4" />}
      action={
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] ${health.connectedDevices > 0 ? 'bg-green-500/20 text-green-400' : 'bg-muted/40 text-muted-foreground'}`}
        >
          {health.connectedDevices} bağlı
        </span>
      }
    >
      {/* Kuyruk + watch durumu */}
      <div className="mb-3 grid grid-cols-4 gap-1.5">
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className="text-foreground text-[13px] font-bold">{health.connectedDevices}</p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Cihaz</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className="text-foreground text-[13px] font-bold">{health.pushDeliveredTotal}</p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Push</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p
            className={`text-[13px] font-bold ${health.offlineQueueLength > 0 ? 'text-orange-400' : 'text-foreground'}`}
          >
            {health.offlineQueueLength}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Offline</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p
            className={`text-[13px] font-bold ${health.watchConnected ? 'text-green-400' : 'text-muted-foreground'}`}
          >
            {health.watchConnected ? '✓' : '—'}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Watch</p>
        </div>
      </div>

      {/* Push + sync durumu */}
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
        <span className="flex items-center gap-1">
          <Bell className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">Kuyruk:</span>
          <span className="text-foreground font-medium">{health.pushQueueLength}</span>
        </span>
        <span className="flex items-center gap-1">
          <RefreshCw className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">Sync:</span>
          <span className="text-foreground font-medium">{health.syncQueueLength}</span>
        </span>
        {health.eventDriven && <span className="text-green-400">event-driven</span>}
      </div>

      {/* Bağlı cihazlar */}
      {health.devices.length === 0 ? (
        <div className="text-muted-foreground flex items-center justify-center gap-1.5 py-3 text-[10px]">
          <CloudOff className="h-3 w-3" />
          Cihaz bağlı değil — mobil uygulama kaydolmalı
        </div>
      ) : (
        <div className="space-y-1">
          {health.devices.slice(0, 4).map((d, i) => (
            <div
              key={i}
              className="bg-muted/40 flex items-center justify-between rounded px-2 py-1 text-[10px]"
            >
              <span className="flex items-center gap-1.5">
                {d.platform === 'apple-watch' || d.platform === 'wear-os' ? (
                  <Watch className="text-muted-foreground h-3 w-3" />
                ) : (
                  <Smartphone className="text-muted-foreground h-3 w-3" />
                )}
                <span className="text-foreground">{d.name}</span>
                <span className="text-muted-foreground">
                  {PLATFORM_LABELS[d.platform] ?? d.platform}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                {d.battery !== null && (
                  <span className="text-muted-foreground flex items-center gap-0.5">
                    <Battery className="h-3 w-3" />
                    {d.battery}%
                  </span>
                )}
                <span className={d.online ? 'text-green-400' : 'text-muted-foreground'}>
                  {d.online ? '●' : '○'}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
