import { Suspense } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { getDailyPlanData } from '@/lib/ai/executive';

export const metadata = { title: 'Takvim — NEXUS OS' };

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'border-l-red-400',
  high: 'border-l-orange-400',
  normal: 'border-l-blue-400',
  low: 'border-l-muted-foreground',
  background: 'border-l-muted-foreground',
};

function hourLabel(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

async function CalendarContent() {
  const plan = await getDailyPlanData();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="text-primary h-6 w-6" />
        <div>
          <h1 className="text-foreground text-2xl font-bold">Takvim — Günlük Plan</h1>
          <p className="text-muted-foreground text-sm">
            {plan.date} · {plan.slots.length} blok · ~{Math.round(plan.totalEstimatedMinutes / 60)}{' '}
            saat
          </p>
        </div>
      </div>

      {plan.slots.length === 0 ? (
        <div className="border-border bg-card flex flex-col items-center justify-center rounded-xl border py-20 text-center">
          <Clock className="text-muted-foreground/30 mb-3 h-10 w-10" />
          <p className="text-muted-foreground text-sm">Bugün için planlanmış görev yok.</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Görevler eklendikçe enerji planına göre otomatik zamanlanır.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {plan.slots.map((s, i) => (
            <div
              key={i}
              className={`border-border bg-card rounded-lg border border-l-4 p-3.5 ${PRIORITY_COLOR[s.priority] ?? 'border-l-muted-foreground'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-foreground flex items-center gap-2 text-sm font-medium">
                  <Clock className="text-muted-foreground h-3.5 w-3.5" />
                  {hourLabel(s.startHour)}–{hourLabel(s.endHour)}
                </span>
                <span className="text-muted-foreground text-xs">{s.priority}</span>
              </div>
              <p className="text-foreground mt-1.5 text-sm">{s.taskTitle}</p>
              {s.reasoning && <p className="text-muted-foreground mt-0.5 text-xs">{s.reasoning}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground p-8 text-sm">Plan yükleniyor…</div>}>
      <CalendarContent />
    </Suspense>
  );
}
