import { Cloud, Smartphone, RefreshCw, Archive, HeartPulse, GitMerge } from 'lucide-react';
import type { CloudStatus } from '@/lib/cloud/types';
import { WidgetShell } from './widget-shell';

export interface CloudWidgetProps {
  status: CloudStatus;
}

const PRESENCE_COLOR: Record<string, string> = {
  online: 'text-green-400',
  busy: 'text-amber-400',
  idle: 'text-blue-400',
  sleeping: 'text-purple-400',
  offline: 'text-muted-foreground',
};

export function CloudWidget({ status }: CloudWidgetProps) {
  const s = status;
  return (
    <WidgetShell
      title="Cloud Sync"
      icon={<Cloud className="h-4 w-4" />}
      action={
        <span className="bg-primary/20 text-primary rounded-full px-2 py-0.5 text-[10px]">
          {s.connectedDevices}/{s.totalDevices} cihaz
        </span>
      }
    >
      {/* Kuyruk + backup + health sayaçları */}
      <div className="mb-3 grid grid-cols-4 gap-1.5">
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className="text-foreground text-[13px] font-bold">{s.syncQueueLength}</p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Sync Log</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p
            className={`text-[13px] font-bold ${s.offlineQueueLength > 0 ? 'text-amber-400' : 'text-foreground'}`}
          >
            {s.offlineQueueLength}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Offline Kuyruk</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p
            className={`text-[13px] font-bold ${s.conflictQueueLength > 0 ? 'text-red-400' : 'text-green-400'}`}
          >
            {s.conflictQueueLength}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Conflict</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p
            className={`text-[13px] font-bold ${s.fleetHealthAvg >= 80 ? 'text-green-400' : s.fleetHealthAvg >= 50 ? 'text-amber-400' : 'text-red-400'}`}
          >
            {s.fleetHealthAvg}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Filo Sağlık</p>
        </div>
      </div>

      {/* Sync + backup + handoff satırı */}
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
        <span className="flex items-center gap-1">
          <RefreshCw className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">Son sync:</span>
          <span className="text-foreground font-medium">
            {s.lastSyncAt
              ? new Date(s.lastSyncAt).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'}
          </span>
        </span>
        <span className="flex items-center gap-1">
          <Archive className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">Backup:</span>
          <span className="text-foreground font-medium">
            {s.lastBackup ? `v${s.lastBackup.version}` : 'yok'}
          </span>
        </span>
        <span className="flex items-center gap-1">
          <GitMerge className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">Handoff:</span>
          <span className="text-foreground font-medium">{s.pendingHandoffs}</span>
        </span>
        <span className="flex items-center gap-1">
          <HeartPulse className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">Trusted:</span>
          <span className="text-foreground font-medium">{s.trustedDevices}</span>
        </span>
      </div>

      {/* Cihaz presence listesi */}
      {s.presence.length === 0 ? (
        <p className="text-muted-foreground text-center text-[10px]">
          Cihaz kaydı yok — mobil/masaüstü uygulamadan eşleştir
        </p>
      ) : (
        <div className="space-y-1">
          {s.presence.slice(0, 5).map((p) => (
            <div key={p.deviceId} className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1.5">
                <Smartphone className="text-muted-foreground h-2.5 w-2.5" />
                <span className="text-foreground">{p.name}</span>
                <span className="text-muted-foreground">({p.type})</span>
              </span>
              <span className={PRESENCE_COLOR[p.status] ?? 'text-muted-foreground'}>
                {p.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
