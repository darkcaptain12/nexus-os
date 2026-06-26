import Link from 'next/link';
import { Lightbulb, ArrowRight } from 'lucide-react';
import type { Recommendation } from '@/lib/ai/types';
import { WidgetShell, WidgetEmpty } from './widget-shell';

const CATEGORY_COLORS: Record<string, string> = {
  task: 'bg-blue-500/20 text-blue-400',
  goal: 'bg-purple-500/20 text-purple-400',
  health: 'bg-green-500/20 text-green-400',
  productivity: 'bg-amber-500/20 text-amber-400',
  system: 'bg-red-500/20 text-red-400',
  learning: 'bg-cyan-500/20 text-cyan-400',
};

const CATEGORY_LABELS: Record<string, string> = {
  task: 'Görev',
  goal: 'Hedef',
  health: 'Sağlık',
  productivity: 'Verimlilik',
  system: 'Sistem',
  learning: 'Öğrenme',
};

export function RecommendationsWidget({ recommendations }: { recommendations: Recommendation[] }) {
  return (
    <WidgetShell
      title="AI Önerileri"
      icon={<Lightbulb className="h-4 w-4" />}
    >
      {recommendations.length === 0 ? (
        <WidgetEmpty
          icon={<Lightbulb className="h-8 w-8" />}
          message="Öneri yok"
          submessage="Görev ve hedef ekledikçe öneriler oluşacak"
        />
      ) : (
        <div className="space-y-2">
          {recommendations.slice(0, 5).map((rec) => (
            <div key={rec.id} className="rounded-lg bg-muted/50 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${CATEGORY_COLORS[rec.category] ?? 'bg-muted text-muted-foreground'}`}>
                      {CATEGORY_LABELS[rec.category] ?? rec.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Puan: {rec.score}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-foreground">{rec.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{rec.description}</p>
                </div>
                {rec.actionUrl && (
                  <Link href={rec.actionUrl} className="mt-1 shrink-0 text-muted-foreground hover:text-foreground">
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}
