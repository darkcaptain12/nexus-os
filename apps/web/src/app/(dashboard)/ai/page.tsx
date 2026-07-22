import { Suspense } from 'react';
import { Brain, Lightbulb, AlertTriangle, Activity, CheckCircle2 } from 'lucide-react';
import { getExecutiveSummary, getAIExecutiveStatus } from '@/lib/ai/executive';

export const metadata = { title: 'Yapay Zeka — NEXUS OS' };

const LEVEL_COLOR: Record<string, string> = {
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
};

async function AIContent() {
  const [summary, status] = await Promise.all([getExecutiveSummary(), getAIExecutiveStatus()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="text-primary h-6 w-6" />
        <div>
          <h1 className="text-foreground text-2xl font-bold">Yapay Zeka — Executive</h1>
          <p className="text-muted-foreground text-sm">
            Mod:{' '}
            {status.mode === 'ai-provider'
              ? `AI Provider (${status.provider ?? '—'}${status.model ? ' · ' + status.model : ''})`
              : 'Kural Motoru (fallback)'}
            {' · '}Sağlık %{status.healthScore}
          </p>
        </div>
      </div>

      {/* Özet satırları */}
      <div className="border-border bg-card rounded-xl border p-4">
        <h2 className="text-foreground mb-3 flex items-center gap-2 text-sm font-semibold">
          <Activity className="h-4 w-4" /> Bugünkü Durum
        </h2>
        <ul className="space-y-1.5">
          {summary.briefingSummary.map((line, i) => (
            <li key={i} className="text-muted-foreground flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Öneriler */}
        <div className="border-border bg-card rounded-xl border p-4">
          <h2 className="text-foreground mb-3 flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="h-4 w-4 text-amber-400" /> Öneriler (
            {summary.recommendations.length})
          </h2>
          {summary.recommendations.length === 0 ? (
            <p className="text-muted-foreground text-sm">Şu an öneri yok — sistem dengeli.</p>
          ) : (
            <ul className="space-y-2">
              {summary.recommendations.slice(0, 8).map((r) => (
                <li key={r.id} className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-foreground text-sm font-medium">{r.title}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">{r.description}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Riskler */}
        <div className="border-border bg-card rounded-xl border p-4">
          <h2 className="text-foreground mb-3 flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-orange-400" /> Riskler ({summary.risks.length}) ·
            Skor {summary.riskScore}
          </h2>
          {summary.risks.length === 0 ? (
            <p className="text-muted-foreground text-sm">Kritik risk tespit edilmedi.</p>
          ) : (
            <ul className="space-y-2">
              {summary.risks.slice(0, 8).map((r) => (
                <li key={r.id} className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-foreground flex items-center justify-between text-sm font-medium">
                    {r.title}
                    <span className={`text-xs ${LEVEL_COLOR[r.level] ?? 'text-muted-foreground'}`}>
                      {r.level}
                    </span>
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">{r.description}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {status.fallbackMode && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-400">
          AI Provider anahtarı bulunamadı — kural motoru modunda çalışıyor. Tam AI özellikleri için
          Kurulum ekranından API key ekleyin.
        </div>
      )}
    </div>
  );
}

export default function AIPage() {
  return (
    <Suspense
      fallback={<div className="text-muted-foreground p-8 text-sm">Executive yükleniyor…</div>}
    >
      <AIContent />
    </Suspense>
  );
}
