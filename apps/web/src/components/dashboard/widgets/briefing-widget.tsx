import { Sparkles } from 'lucide-react';
import type { DailyBriefing } from '@/lib/ai/types';

export function BriefingWidget({ briefing }: { briefing: DailyBriefing }) {
  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-card to-card/80 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Günlük Brifing
        </span>
        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {briefing.generatedBy === 'rule-engine' ? 'Kural Motoru' : 'AI'}
        </span>
      </div>
      <div className="space-y-1.5">
        {briefing.summary.map((line, i) => (
          <p key={i} className={`text-sm ${i === 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
            {line}
          </p>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground">
        {briefing.durationMs}ms · {new Date(briefing.generatedAt).toLocaleTimeString('tr-TR')}
      </p>
    </div>
  );
}
