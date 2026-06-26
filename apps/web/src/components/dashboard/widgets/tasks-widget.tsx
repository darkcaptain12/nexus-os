import Link from 'next/link';
import { CheckSquare } from 'lucide-react';
import type { TaskSummary } from '@/lib/ai/types';
import { WidgetShell, WidgetEmpty } from './widget-shell';

export function TasksWidget({ tasks }: { tasks: TaskSummary }) {
  if (tasks.total === 0) {
    return (
      <WidgetShell
        title="Görevler"
        icon={<CheckSquare className="h-4 w-4" />}
        action={
          <Link href="/gorevler" className="text-xs text-primary hover:underline">
            Görev Ekle
          </Link>
        }
      >
        <WidgetEmpty
          icon={<CheckSquare className="h-8 w-8" />}
          message="Henüz görev yok"
          submessage="İlk görevinizi oluşturun"
        />
      </WidgetShell>
    );
  }

  return (
    <WidgetShell
      title="Görevler"
      icon={<CheckSquare className="h-4 w-4" />}
      action={
        <Link href="/gorevler" className="text-xs text-primary hover:underline">
          Tümünü Gör
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{tasks.pending}</p>
          <p className="text-xs text-muted-foreground">Bekleyen</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{tasks.inProgress}</p>
          <p className="text-xs text-muted-foreground">Devam Eden</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{tasks.completed}</p>
          <p className="text-xs text-muted-foreground">Tamamlanan</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className={`text-2xl font-bold ${tasks.overdue > 0 ? 'text-red-400' : 'text-foreground'}`}>{tasks.overdue}</p>
          <p className="text-xs text-muted-foreground">Gecikmiş</p>
        </div>
      </div>
      {tasks.dueToday > 0 && (
        <p className="mt-3 text-xs text-amber-400">⚡ Bugün {tasks.dueToday} görev teslim edilmeli</p>
      )}
    </WidgetShell>
  );
}
