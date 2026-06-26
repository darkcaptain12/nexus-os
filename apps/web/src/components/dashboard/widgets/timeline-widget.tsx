'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock } from 'lucide-react';
import { WidgetShell, WidgetEmpty } from './widget-shell';
import { useRealtime } from '@/hooks/use-realtime';

interface TimelineEntry {
  id: string;
  source: string;
  title: string;
  description: string;
  timestamp: string;
}

const SOURCE_COLORS: Record<string, string> = {
  desktop: 'bg-blue-500',
  task: 'bg-green-500',
  decision: 'bg-purple-500',
  note: 'bg-amber-500',
  ai: 'bg-cyan-500',
  system: 'bg-red-500',
  goal: 'bg-pink-500',
  calendar: 'bg-orange-500',
};

const SOURCE_LABELS: Record<string, string> = {
  desktop: 'Masaüstü',
  task: 'Görev',
  decision: 'Karar',
  note: 'Not',
  ai: 'AI',
  system: 'Sistem',
  goal: 'Hedef',
  calendar: 'Takvim',
  journal: 'Günlük',
  project: 'Proje',
  notification: 'Bildirim',
};

export function TimelineWidget() {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTimeline = useCallback(async () => {
    try {
      const res = await fetch('/api/memory/timeline?limit=8');
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimeline();
    const interval = setInterval(fetchTimeline, 60000);
    return () => clearInterval(interval);
  }, [fetchTimeline]);

  useRealtime({ table: 'desktop_activity_logs' }, () => {
    fetchTimeline();
  });

  if (loading) {
    return (
      <WidgetShell title="Bugünkü Zaman Çizelgesi" icon={<Clock className="h-4 w-4" />}>
        <div className="flex items-center justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell title="Bugünkü Zaman Çizelgesi" icon={<Clock className="h-4 w-4" />}>
      {entries.length === 0 ? (
        <WidgetEmpty
          icon={<Clock className="h-8 w-8" />}
          message="Henüz kayıt yok"
          submessage="Aktiviteler otomatik olarak kaydedilecek"
        />
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`h-2 w-2 rounded-full ${SOURCE_COLORS[entry.source] ?? 'bg-muted-foreground'}`} />
                <div className="w-px flex-1 bg-border" />
              </div>
              <div className="flex-1 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                    {SOURCE_LABELS[entry.source] ?? entry.source}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-foreground">{entry.title}</p>
                {entry.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{entry.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
