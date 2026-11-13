import { Wrench, CheckCircle2, Circle, MinusCircle, ExternalLink } from 'lucide-react';
import { getInstallationState } from '@/lib/release/installation-wizard';

export const metadata = { title: 'Kurulum — NEXUS OS' };

const STATUS_META: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  complete: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Tamam' },
  incomplete: { icon: Circle, color: 'text-red-400', label: 'Gerekli' },
  optional: { icon: MinusCircle, color: 'text-muted-foreground', label: 'Opsiyonel' },
};

export default function SetupPage() {
  const state = getInstallationState();
  const pct = Math.round((state.completed / state.total) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wrench className="text-primary h-6 w-6" />
        <div>
          <h1 className="text-foreground text-2xl font-bold">Kurulum</h1>
          <p className="text-muted-foreground text-sm">
            {state.completed}/{state.total} adım tamam · %{pct}
            {state.minimumViable ? ' · temel kullanım hazır ✓' : ' · temel kurulum eksik'}
          </p>
        </div>
      </div>

      {/* İlerleme çubuğu */}
      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full ${pct >= 60 ? 'bg-emerald-500' : pct >= 30 ? 'bg-amber-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Adımlar */}
      <div className="space-y-3">
        {state.steps.map((step) => {
          const meta = STATUS_META[step.status] ?? STATUS_META.optional!;
          const Icon = meta.icon;
          return (
            <div key={step.id} className="border-border bg-card rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${meta.color}`} />
                  <div>
                    <p className="text-foreground flex items-center gap-2 text-sm font-semibold">
                      {step.title}
                      {step.required && (
                        <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-400">
                          Zorunlu
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">{step.instructions}</p>
                    {step.envKeys.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {step.envKeys.map((k) => (
                          <code
                            key={k}
                            className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]"
                          >
                            {k}
                          </code>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 text-xs ${meta.color}`}>{meta.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-muted-foreground text-xs">
        Environment değişkenleri Vercel Dashboard → Settings → Environment Variables üzerinden
        eklenir. Ekledikten sonra yeniden deploy gerekir.
        <a
          href="https://vercel.com/docs/projects/environment-variables"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary ml-1 inline-flex items-center gap-0.5 hover:underline"
        >
          Vercel env dokümanı <ExternalLink className="h-3 w-3" />
        </a>
      </p>
    </div>
  );
}
