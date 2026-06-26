import Link from 'next/link';
import { Target } from 'lucide-react';
import type { GoalSummary } from '@/lib/ai/types';
import { WidgetShell, WidgetEmpty } from './widget-shell';

export function GoalsWidget({ goals }: { goals: GoalSummary }) {
  if (goals.total === 0) {
    return (
      <WidgetShell
        title="Bugünkü Hedefler"
        icon={<Target className="h-4 w-4" />}
        action={
          <Link href="/projeler" className="text-xs text-primary hover:underline">
            Hedef Ekle
          </Link>
        }
      >
        <WidgetEmpty
          icon={<Target className="h-8 w-8" />}
          message="Henüz hedef yok"
          submessage="Hedefler ilerlemenizi takip etmenizi sağlar"
        />
      </WidgetShell>
    );
  }

  return (
    <WidgetShell
      title="Bugünkü Hedefler"
      icon={<Target className="h-4 w-4" />}
      action={
        <Link href="/projeler" className="text-xs text-primary hover:underline">
          Tümünü Gör
        </Link>
      }
    >
      <div className="space-y-3">
        <div className="flex items-end gap-3">
          <p className="text-3xl font-bold text-foreground">{goals.active}</p>
          <p className="pb-1 text-sm text-muted-foreground">aktif hedef</p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(goals.averageProgress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Ortalama ilerleme</span>
          <span>%{Math.round(goals.averageProgress)}</span>
        </div>
      </div>
    </WidgetShell>
  );
}
