import { Bot, CheckCircle, Clock, AlertTriangle, RefreshCw, Activity } from 'lucide-react';
import type { AgentRecord } from '@/lib/agents/types';
import { WidgetShell } from './widget-shell';

const STATE_COLORS: Record<string, string> = {
  RUNNING: 'text-green-400',
  WAITING_APPROVAL: 'text-orange-400',
  RETRYING: 'text-yellow-400',
  PAUSED: 'text-muted-foreground',
  COMPLETED: 'text-blue-400',
  FAILED: 'text-red-400',
  CANCELLED: 'text-muted-foreground',
  CREATED: 'text-muted-foreground',
  READY: 'text-cyan-400',
  WAITING_EVENT: 'text-purple-400',
};

const STATE_LABELS: Record<string, string> = {
  RUNNING: 'Çalışıyor',
  WAITING_APPROVAL: 'Onay Bekliyor',
  RETRYING: 'Yeniden Deneniyor',
  PAUSED: 'Duraklatıldı',
  COMPLETED: 'Tamamlandı',
  FAILED: 'Başarısız',
  CANCELLED: 'İptal',
  CREATED: 'Oluşturuldu',
  READY: 'Hazır',
  WAITING_EVENT: 'Olay Bekliyor',
};

export interface AgentsWidgetProps {
  agents: AgentRecord[];
  metrics: {
    total: number;
    byState: Record<string, number>;
    successRate: number;
    averageRuntimeMs: number;
  };
}

export function AgentsWidget({ agents, metrics }: AgentsWidgetProps) {
  const running = agents.filter((a) => a.state === 'RUNNING');
  const waiting = agents.filter((a) => a.state === 'WAITING_APPROVAL');
  const retrying = agents.filter((a) => a.state === 'RETRYING');
  const recent = agents.slice(0, 4);

  return (
    <WidgetShell
      title="AI Agents"
      icon={<Bot className="h-4 w-4" />}
      action={
        <span className="bg-primary/20 text-primary rounded-full px-2 py-0.5 text-[10px]">
          {metrics.total} agent
        </span>
      }
    >
      {/* Stats Row */}
      <div className="mb-3 grid grid-cols-4 gap-1.5">
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className="text-[13px] font-bold text-green-400">{running.length}</p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Çalışıyor</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className="text-[13px] font-bold text-orange-400">{waiting.length}</p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Onay</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className="text-[13px] font-bold text-yellow-400">{retrying.length}</p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Yeniden</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p className="text-foreground text-[13px] font-bold">{metrics.successRate}%</p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Başarı</p>
        </div>
      </div>

      {/* Avg Runtime */}
      {metrics.averageRuntimeMs > 0 && (
        <div className="mb-2 flex items-center gap-1 text-[10px]">
          <Activity className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">Ort. süre:</span>
          <span className="text-foreground font-medium">{metrics.averageRuntimeMs}ms</span>
        </div>
      )}

      {/* Approval Warnings */}
      {waiting.length > 0 && (
        <div className="mb-2 flex items-center gap-1.5 rounded bg-orange-500/10 px-2 py-1.5">
          <AlertTriangle className="h-3 w-3 text-orange-400" />
          <p className="text-[10px] text-orange-400">{waiting.length} agent onay bekliyor</p>
        </div>
      )}

      {/* Recent Agents */}
      {recent.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-[10px]">Henüz agent yok</p>
      ) : (
        <div className="space-y-1">
          {recent.map((agent) => (
            <div key={agent.id} className="bg-muted/40 rounded px-2 py-1.5">
              <div className="flex items-start justify-between gap-1">
                <p className="text-foreground flex-1 truncate text-[10px] font-medium">
                  {agent.name}
                </p>
                <span
                  className={`shrink-0 text-[9px] font-medium ${STATE_COLORS[agent.state] ?? 'text-muted-foreground'}`}
                >
                  {STATE_LABELS[agent.state] ?? agent.state}
                </span>
              </div>
              <p className="text-muted-foreground mt-0.5 truncate text-[9px]">{agent.goal}</p>
              {agent.currentTask && (
                <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[9px]">
                  {agent.state === 'RUNNING' && <RefreshCw className="h-2.5 w-2.5 animate-spin" />}
                  {agent.state === 'COMPLETED' && (
                    <CheckCircle className="h-2.5 w-2.5 text-blue-400" />
                  )}
                  {agent.state === 'WAITING_APPROVAL' && (
                    <Clock className="h-2.5 w-2.5 text-orange-400" />
                  )}
                  {agent.currentTask}
                </p>
              )}
              {agent.plan && (
                <div className="mt-1 flex items-center gap-1">
                  <div className="bg-muted h-1 flex-1 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full transition-all"
                      style={{
                        width: `${agent.plan.totalSteps === 0 ? 0 : Math.round((agent.plan.currentStepIndex / agent.plan.totalSteps) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-muted-foreground shrink-0 text-[9px]">
                    {agent.plan.currentStepIndex}/{agent.plan.totalSteps}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
