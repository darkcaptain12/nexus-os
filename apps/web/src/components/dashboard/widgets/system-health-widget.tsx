import { Activity } from 'lucide-react';
import type { SystemState, ModuleStatus } from '@/lib/ai/types';
import { WidgetShell, StatusRow } from './widget-shell';

export function SystemHealthWidget({ system, modules }: { system: SystemState; modules: ModuleStatus[] }) {
  const activeModules = modules.filter((m) => m.status === 'active');
  const unconfigured = modules.filter((m) => m.status === 'unconfigured');

  return (
    <WidgetShell title="Sistem Sağlığı" icon={<Activity className="h-4 w-4" />}>
      <div className="mb-3 flex items-center gap-3">
        <div className="text-3xl font-bold text-foreground">%{system.healthScore}</div>
        <div className="text-xs text-muted-foreground">
          <p>{system.servicesRunning}/{system.servicesTotal} servis aktif</p>
          <p>{activeModules.length} modül çalışıyor</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <StatusRow
          label="Kernel"
          status={system.kernelPhase === 'running' ? 'green' : 'red'}
          statusLabel={system.kernelPhase === 'running' ? 'Online' : system.kernelPhase}
        />
        <StatusRow
          label="Event Bus"
          status="green"
          statusLabel={`${system.eventsPublished} event`}
        />
        <StatusRow
          label="AI Sağlayıcı"
          status={system.aiProviderConfigured ? 'green' : 'yellow'}
          statusLabel={system.aiProviderConfigured ? 'Aktif' : 'Kural Motoru'}
        />
        <StatusRow
          label="Bellek Motoru"
          status={system.memoryEngineActive ? 'green' : 'yellow'}
          statusLabel={system.memoryEngineActive ? 'Aktif' : 'Yapılandırılmamış'}
        />
        {unconfigured.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {unconfigured.length} modül yapılandırılmamış: {unconfigured.map((m) => m.name).join(', ')}
          </p>
        )}
      </div>
    </WidgetShell>
  );
}
