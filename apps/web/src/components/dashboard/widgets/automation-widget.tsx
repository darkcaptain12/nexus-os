'use client';

import { useState, useEffect, useCallback } from 'react';
import { Zap, GitBranch } from 'lucide-react';
import { WidgetShell, StatusRow } from './widget-shell';
import { useRealtime } from '@/hooks/use-realtime';

interface AutomationData {
  actions: {
    registered: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    pendingApproval: number;
  };
  workflows: { total: number; enabled: number; running: number; todayExecutions: number };
  health: string;
  healthScore: number;
}

export function AutomationWidget() {
  const [data, setData] = useState<AutomationData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [actionsRes, workflowsRes] = await Promise.all([
        fetch('/api/actions/history'),
        fetch('/api/workflows'),
      ]);
      const actionsData = await actionsRes.json();
      const workflowsData = await workflowsRes.json();

      setData({
        actions: actionsData.stats ?? {
          registered: 0,
          queued: 0,
          running: 0,
          completed: 0,
          failed: 0,
          pendingApproval: 0,
        },
        workflows: workflowsData.stats ?? { total: 0, enabled: 0, running: 0, todayExecutions: 0 },
        health: 'healthy',
        healthScore: 100,
      });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useRealtime(
    { table: 'notifications' },
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  if (loading) {
    return (
      <WidgetShell title="Otomasyon" icon={<Zap className="h-4 w-4" />}>
        <div className="flex items-center justify-center py-6">
          <div className="border-muted-foreground h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      </WidgetShell>
    );
  }

  if (!data) {
    return (
      <WidgetShell title="Otomasyon" icon={<Zap className="h-4 w-4" />}>
        <p className="text-muted-foreground text-sm">Veri yüklenemedi</p>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell title="Otomasyon" icon={<Zap className="h-4 w-4" />}>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <Zap className="text-muted-foreground mx-auto mb-1 h-3 w-3" />
          <p className="text-foreground text-lg font-bold">{data.actions.registered}</p>
          <p className="text-muted-foreground text-[10px]">Eylem</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <GitBranch className="text-muted-foreground mx-auto mb-1 h-3 w-3" />
          <p className="text-foreground text-lg font-bold">{data.workflows.enabled}</p>
          <p className="text-muted-foreground text-[10px]">Aktif İş Akışı</p>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <StatusRow
          label="Eylemler"
          status={data.actions.failed > 0 ? 'yellow' : 'green'}
          statusLabel={`${data.actions.completed} tamamlandı`}
        />
        <StatusRow
          label="İş Akışları"
          status="green"
          statusLabel={`${data.workflows.todayExecutions} bugün`}
        />
        {data.actions.pendingApproval > 0 && (
          <StatusRow
            label="Onay Bekleyen"
            status="yellow"
            statusLabel={`${data.actions.pendingApproval} bekliyor`}
          />
        )}
      </div>
    </WidgetShell>
  );
}
