'use client';

import { useState, useEffect } from 'react';
import { Monitor, Clock, Zap, AppWindow } from 'lucide-react';
import { WidgetShell, StatusRow, WidgetEmpty } from './widget-shell';

interface DesktopData {
  connected: boolean;
  activeWindow?: { app: string; title: string } | null;
  productivity?: {
    score: number;
    focusTimeSeconds: number;
    contextSwitches: number;
    longestFocusApp: string;
    longestFocusSeconds: number;
    topApps: { app: string; seconds: number; percentage: number }[];
  };
  uptime?: number;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}dk`;
  const h = Math.floor(m / 60);
  return `${h}sa ${m % 60}dk`;
}

export function DesktopWidget() {
  const [data, setData] = useState<DesktopData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/desktop/status');
        const json = await res.json();
        setData(json);
      } catch {
        setData({ connected: false });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <WidgetShell title="Masaüstü" icon={<Monitor className="h-4 w-4" />}>
        <div className="flex items-center justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      </WidgetShell>
    );
  }

  if (!data?.connected) {
    return (
      <WidgetShell title="Masaüstü" icon={<Monitor className="h-4 w-4" />}>
        <WidgetEmpty
          icon={<Monitor className="h-8 w-8" />}
          message="Desktop Agent bağlı değil"
          submessage="Desktop Agent'ı başlatın: pnpm --filter @apex-os/desktop-agent dev"
        />
      </WidgetShell>
    );
  }

  const { activeWindow, productivity } = data;

  return (
    <WidgetShell title="Masaüstü" icon={<Monitor className="h-4 w-4" />}>
      <div className="space-y-3">
        {activeWindow && (
          <StatusRow
            label={activeWindow.app}
            status="green"
            statusLabel="Aktif"
          />
        )}

        {productivity && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-muted/50 p-2 text-center">
                <Zap className="mx-auto mb-1 h-3 w-3 text-muted-foreground" />
                <p className="text-lg font-bold text-foreground">{productivity.score}</p>
                <p className="text-[10px] text-muted-foreground">Verimlilik</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2 text-center">
                <Clock className="mx-auto mb-1 h-3 w-3 text-muted-foreground" />
                <p className="text-lg font-bold text-foreground">{formatDuration(productivity.focusTimeSeconds)}</p>
                <p className="text-[10px] text-muted-foreground">Odak</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2 text-center">
                <AppWindow className="mx-auto mb-1 h-3 w-3 text-muted-foreground" />
                <p className="text-lg font-bold text-foreground">{productivity.contextSwitches}</p>
                <p className="text-[10px] text-muted-foreground">Geçiş</p>
              </div>
            </div>

            {productivity.topApps.length > 0 && (
              <div className="space-y-1">
                {productivity.topApps.slice(0, 3).map((app) => (
                  <div key={app.app} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{app.app}</span>
                    <span className="text-foreground">{formatDuration(app.seconds)} ({app.percentage}%)</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </WidgetShell>
  );
}
