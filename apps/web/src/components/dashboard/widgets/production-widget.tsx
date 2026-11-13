import { ShieldCheck, Activity, RefreshCw, Database, Zap, AlertTriangle } from 'lucide-react';
import { WidgetShell } from './widget-shell';

export interface ProductionDashboardData {
  rcScore: { overall: number; grade: string; verdict: string; knownIssues: string[] };
  health: {
    status: string;
    memoryPercent: number;
    eventLoopP99: number | null;
    cacheHitRate: number;
  };
  stability: { status: string; score: number; boundedBuffers: number; leakRisks: number };
  recovery: { status: string; score: number; recoverable: number };
  performance: {
    status: string;
    heapUsedPercent: number;
    eventLoopP99: number | null;
    cacheHitRate: number;
  };
  backup: { status: string; restoreWorks: boolean; version: number | null };
  security: { score: number };
  activeAlerts: number;
}

export interface ProductionWidgetProps {
  data: ProductionDashboardData;
}

const GRADE_COLOR: Record<string, string> = {
  A: 'text-green-400',
  B: 'text-emerald-400',
  C: 'text-amber-400',
  D: 'text-orange-400',
  F: 'text-red-400',
};
const STATUS_COLOR: Record<string, string> = {
  pass: 'text-green-400',
  healthy: 'text-green-400',
  warn: 'text-amber-400',
  degraded: 'text-amber-400',
  fail: 'text-red-400',
  critical: 'text-red-400',
};
const VERDICT_LABEL: Record<string, string> = {
  ship: '✅ Ship',
  'ship-with-caveats': '⚠️ Ship (caveat)',
  'not-ready': '⛔ Not Ready',
};

export function ProductionWidget({ data }: ProductionWidgetProps) {
  const d = data;
  return (
    <WidgetShell
      title="Production Health (RC)"
      icon={<ShieldCheck className="h-4 w-4" />}
      action={
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] ${GRADE_COLOR[d.rcScore.grade] ?? 'text-foreground'} bg-muted/40`}
        >
          RC {d.rcScore.grade}
        </span>
      }
    >
      {/* RC skoru + verdict */}
      <div className="mb-3 flex items-end gap-2">
        <span className={`text-3xl font-bold ${GRADE_COLOR[d.rcScore.grade] ?? 'text-foreground'}`}>
          {d.rcScore.overall}
        </span>
        <span className="text-muted-foreground mb-1 text-[10px]">
          /100 · {VERDICT_LABEL[d.rcScore.verdict] ?? d.rcScore.verdict}
        </span>
      </div>

      {/* Audit sayaçları */}
      <div className="mb-3 grid grid-cols-4 gap-1.5">
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p
            className={`text-[13px] font-bold ${STATUS_COLOR[d.stability.status] ?? 'text-foreground'}`}
          >
            {d.stability.score}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Stability</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p
            className={`text-[13px] font-bold ${STATUS_COLOR[d.recovery.status] ?? 'text-foreground'}`}
          >
            {d.recovery.score}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Recovery</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p
            className={`text-[13px] font-bold ${d.security.score >= 70 ? 'text-green-400' : 'text-amber-400'}`}
          >
            {d.security.score}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Security</p>
        </div>
        <div className="bg-muted/30 rounded p-1.5 text-center">
          <p
            className={`text-[13px] font-bold ${d.backup.restoreWorks ? 'text-green-400' : 'text-red-400'}`}
          >
            {d.backup.restoreWorks ? '✓' : '✗'}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[9px]">Backup</p>
        </div>
      </div>

      {/* Canlı metrikler */}
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
        <span className="flex items-center gap-1">
          <Zap className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">Heap:</span>
          <span
            className={`font-medium ${d.performance.heapUsedPercent >= 85 ? 'text-red-400' : 'text-foreground'}`}
          >
            %{d.performance.heapUsedPercent}
          </span>
        </span>
        <span className="flex items-center gap-1">
          <Activity className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">EL p99:</span>
          <span className="text-foreground font-medium">{d.performance.eventLoopP99 ?? '—'}ms</span>
        </span>
        <span className="flex items-center gap-1">
          <RefreshCw className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">Cache:</span>
          <span className="text-foreground font-medium">%{d.performance.cacheHitRate}</span>
        </span>
        <span className="flex items-center gap-1">
          <Database className="text-muted-foreground h-3 w-3" />
          <span className="text-muted-foreground">Health:</span>
          <span className={`font-medium ${STATUS_COLOR[d.health.status] ?? 'text-foreground'}`}>
            {d.health.status}
          </span>
        </span>
      </div>

      {/* Known issues / alerts */}
      {d.activeAlerts > 0 || d.rcScore.knownIssues.length > 0 ? (
        <div className="space-y-1">
          {d.activeAlerts > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-400">
              <AlertTriangle className="h-2.5 w-2.5" />
              <span>{d.activeAlerts} aktif alert</span>
            </div>
          )}
          {d.rcScore.knownIssues.slice(0, 2).map((issue, i) => (
            <p key={i} className="text-muted-foreground truncate text-[10px]">
              • {issue}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-center text-[10px] text-green-400">
          Kritik sorun yok — production hazır
        </p>
      )}
    </WidgetShell>
  );
}
