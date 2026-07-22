import { Rocket, Package, CheckCircle2, GitBranch, AlertCircle } from 'lucide-react';
import type { ReleaseDashboard } from '@/lib/release/types';
import { WidgetShell } from './widget-shell';

export interface ReleaseWidgetProps {
  data: ReleaseDashboard;
}

const GRADE_COLOR: Record<string, string> = {
  A: 'text-green-400',
  B: 'text-emerald-400',
  C: 'text-amber-400',
  D: 'text-orange-400',
  F: 'text-red-400',
};
const STATUS_LABEL: Record<string, string> = {
  released: '🚀 Released',
  'release-candidate': '🟡 RC',
  'not-ready': '⛔ Not Ready',
};
const HEALTH_COLOR: Record<string, string> = {
  healthy: 'text-green-400',
  degraded: 'text-amber-400',
  critical: 'text-red-400',
};

export function ReleaseWidget({ data }: ReleaseWidgetProps) {
  const d = data;
  const p = d.productionScore;
  return (
    <WidgetShell
      title="APEX OS Release"
      icon={<Rocket className="h-4 w-4" />}
      action={
        <span className="bg-primary/20 text-primary rounded-full px-2 py-0.5 text-[10px]">
          v{d.version.version}
        </span>
      }
    >
      {/* Production Score + release status */}
      <div className="mb-3 flex items-end gap-2">
        <span className={`text-3xl font-bold ${GRADE_COLOR[p.grade] ?? 'text-foreground'}`}>
          {p.overall}
        </span>
        <span className="text-muted-foreground mb-1 text-[10px]">
          /100 · {STATUS_LABEL[p.releaseStatus] ?? p.releaseStatus}
        </span>
      </div>

      {/* Version + build meta */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
        <span className="flex items-center gap-1">
          <GitBranch className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">Build:</span>
          <span className="text-foreground font-medium">{d.version.buildNumber}</span>
        </span>
        <span className="flex items-center gap-1">
          <Package className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">RC:</span>
          <span className="text-foreground font-medium">{d.rcScore}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="text-muted-foreground">Health:</span>
          <span className={`font-medium ${HEALTH_COLOR[d.health] ?? 'text-foreground'}`}>
            {d.health}
          </span>
        </span>
      </div>

      {/* Entegrasyon + kurulum */}
      <div className="mb-3 grid grid-cols-3 gap-1.5">
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p
            className={`text-[13px] font-bold ${d.releaseAudit.integrated === d.releaseAudit.total ? 'text-green-400' : 'text-amber-400'}`}
          >
            {d.releaseAudit.integrated}/{d.releaseAudit.total}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Entegrasyon</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p
            className={`text-[13px] font-bold ${d.installation.minimumViable ? 'text-green-400' : 'text-amber-400'}`}
          >
            {d.installation.completed}/{d.installation.total}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Kurulum</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p
            className={`text-[13px] font-bold ${d.environment.blockers === 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {d.environment.blockers}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Blocker</p>
        </div>
      </div>

      {/* Known issues / operasyonel */}
      {p.operationalRequirements.length > 0 || d.knownIssues.length > 0 ? (
        <div className="space-y-1">
          {p.operationalRequirements.slice(0, 2).map((req, i) => (
            <div key={`op-${i}`} className="flex items-center gap-1.5 text-[10px] text-amber-400">
              <AlertCircle className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{req}</span>
            </div>
          ))}
          {d.knownIssues.slice(0, 1).map((issue, i) => (
            <p key={`ki-${i}`} className="text-muted-foreground truncate text-[10px]">
              • {issue}
            </p>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-green-400">
          <CheckCircle2 className="h-3 w-3" />
          <span>Kurulum tam — üretime hazır</span>
        </div>
      )}
    </WidgetShell>
  );
}
