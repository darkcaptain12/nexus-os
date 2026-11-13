'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  Shield,
  Zap,
  Clock,
  AlertTriangle,
  Server,
  ListOrdered,
  Database,
  Flame,
  Bug,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface HealthCheck {
  name: string;
  status: string;
  latencyMs: number;
  details?: Record<string, unknown>;
}

interface SystemData {
  summary: {
    totalRequests: number;
    errorRate: number;
    avgLatencyMs: number;
    slowRequests: number;
    uptime: number;
  };
  health: {
    score: number;
    status: string;
    system: {
      cpu: number;
      memoryPercent: number;
      memoryUsedMb: number;
      uptime: number;
      nodeVersion: string;
      platform: string;
    };
  };
  production: { score: number; ready: boolean };
  process?: {
    memory: { rssBytes: number; heapUsedBytes: number; heapTotalBytes: number };
    cpuPercent: number | null;
    eventLoopDelayMs: { mean: number; p99: number } | null;
  };
  cache?: { hits: number; misses: number; hitRate: number; size: number };
  rateLimits?: { invocations: number; rejections: number };
}

interface WorkerHealth {
  name: string;
  hasData: boolean;
  lastRunAt: string | null;
  successRate: number | null;
  failureCount: number;
  queueLength: number | null;
}

interface RepositoryHeatmapEntry {
  table: string;
  queryCount: number;
  avgDurationMs: number;
  p95Ms: number;
  p99Ms: number;
  slowQueryCount: number;
}

interface PerformanceData {
  slowest: { all: { name: string; module: string; durationMs: number }[] };
  queryAudit: {
    slowQueryCount: number;
    avgDurationMs: number;
    slowQueries: { table: string; operation: string; durationMs: number }[];
  };
  repositoryHeatmap: RepositoryHeatmapEntry[];
  top20SlowestQueries: { table: string; operation: string; durationMs: number }[];
}

interface AuditCriteria {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  score: number;
  message: string;
}

interface AuditSection {
  name: string;
  score: number;
  criteria: AuditCriteria[];
}

interface ProductionAudit {
  overallScore: number;
  productionReady: boolean;
  readinessJustification: string;
  sections: AuditSection[];
  sprintSummary: {
    sprint: string;
    circularDependencies: number;
    orphanFilesDeleted: number;
    routesProtected: number;
    testsPassing: number;
  };
}

interface ErrorRegistryEntry {
  classification: string;
  count: number;
  lastOccurredAt: string;
  lastMessage: string;
}

interface FullHealth {
  score: number;
  status: string;
  checks: HealthCheck[];
  system: Record<string, unknown>;
}

const STATUS_COLORS: Record<string, string> = {
  healthy: 'bg-green-500/20 text-green-400',
  degraded: 'bg-yellow-500/20 text-yellow-400',
  unhealthy: 'bg-red-500/20 text-red-400',
  unknown: 'bg-muted text-muted-foreground',
};

export default function SystemPage() {
  const [data, setData] = useState<SystemData | null>(null);
  const [healthData, setHealthData] = useState<FullHealth | null>(null);
  const [workers, setWorkers] = useState<WorkerHealth[]>([]);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [errors, setErrors] = useState<{ total: number; byClassification: ErrorRegistryEntry[] }>({
    total: 0,
    byClassification: [],
  });
  const [audit, setAudit] = useState<ProductionAudit | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/system/metrics').then((r) => r.json()),
      fetch('/api/system/health').then((r) => r.json()),
      fetch('/api/system/workers').then((r) => r.json()),
      fetch('/api/system/performance').then((r) => r.json()),
      fetch('/api/system/errors').then((r) => r.json()),
      fetch('/api/system/audit').then((r) => r.json()),
    ])
      .then(([metrics, health, workersRes, perf, errorsRes, auditRes]) => {
        setData(metrics);
        setHealthData(health);
        setWorkers(workersRes.workers ?? []);
        setPerformance(perf);
        setErrors(errorsRes);
        setAudit(auditRes);
      })
      .catch(() => {});

    const interval = setInterval(() => {
      fetch('/api/system/metrics')
        .then((r) => r.json())
        .then(setData)
        .catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="border-muted-foreground h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Sistem</h1>
        <p className="text-muted-foreground mt-1 text-sm">Platform durumu ve metrikleri</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatBox
          icon={<Activity className="h-4 w-4" />}
          label="Sağlık Puanı"
          value={`%${data.health.score}`}
          sub={data.health.status}
        />
        <StatBox
          icon={<Shield className="h-4 w-4" />}
          label="Üretim Hazırlık"
          value={`%${data.production.score}`}
          sub={data.production.ready ? 'Hazır' : 'Eksikler var'}
        />
        <StatBox
          icon={<Cpu className="h-4 w-4" />}
          label="CPU"
          value={`%${data.health.system.cpu}`}
          sub={`${data.health.system.platform}`}
        />
        <StatBox
          icon={<HardDrive className="h-4 w-4" />}
          label="Bellek"
          value={`${data.health.system.memoryUsedMb}MB`}
          sub={`%${data.health.system.memoryPercent}`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatBox
          icon={<Zap className="h-4 w-4" />}
          label="İstek"
          value={data.summary.totalRequests}
          sub={`%${data.summary.errorRate} hata`}
        />
        <StatBox
          icon={<Clock className="h-4 w-4" />}
          label="Ort. Gecikme"
          value={`${data.summary.avgLatencyMs}ms`}
          sub={`${data.summary.slowRequests} yavaş`}
        />
        <StatBox
          icon={<Wifi className="h-4 w-4" />}
          label="Çalışma Süresi"
          value={formatUptime(data.health.system.uptime)}
          sub={data.health.system.nodeVersion}
        />
        <StatBox
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Yavaş İstek"
          value={data.summary.slowRequests}
          sub=">1000ms"
        />
      </div>

      {healthData && (
        <section className="border-border bg-card rounded-xl border p-5">
          <h2 className="text-foreground mb-4 text-sm font-medium">Servis Durumları</h2>
          <div className="space-y-2">
            {healthData.checks.map((check) => (
              <div
                key={check.name}
                className="bg-muted/50 flex items-center justify-between rounded-lg px-3 py-2"
              >
                <span className="text-foreground text-sm">{check.name}</span>
                <div className="flex items-center gap-2">
                  {check.latencyMs > 0 && (
                    <span className="text-muted-foreground text-xs">{check.latencyMs}ms</span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${STATUS_COLORS[check.status] ?? ''}`}
                  >
                    {check.status === 'healthy'
                      ? 'Sağlıklı'
                      : check.status === 'degraded'
                        ? 'Zayıf'
                        : check.status === 'unhealthy'
                          ? 'Sorunlu'
                          : 'Bilinmiyor'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.process && (
        <section className="border-border bg-card rounded-xl border p-5">
          <h2 className="text-foreground mb-4 flex items-center gap-2 text-sm font-medium">
            <Database className="h-4 w-4" /> Heap &amp; Process
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground text-xs">Heap Used / Total</p>
              <p className="text-foreground text-lg font-semibold">
                {(data.process.memory.heapUsedBytes / 1024 / 1024).toFixed(1)}MB /{' '}
                {(data.process.memory.heapTotalBytes / 1024 / 1024).toFixed(1)}MB
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">RSS</p>
              <p className="text-foreground text-lg font-semibold">
                {(data.process.memory.rssBytes / 1024 / 1024).toFixed(1)}MB
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Event Loop Delay (p99)</p>
              <p className="text-foreground text-lg font-semibold">
                {data.process.eventLoopDelayMs
                  ? `${data.process.eventLoopDelayMs.p99}ms`
                  : 'ölçülemedi'}
              </p>
            </div>
          </div>
        </section>
      )}

      {(data.cache || data.rateLimits) && (
        <section className="border-border bg-card rounded-xl border p-5">
          <h2 className="text-foreground mb-4 flex items-center gap-2 text-sm font-medium">
            <Zap className="h-4 w-4" /> Üretim Diagnostiği
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.cache && (
              <>
                <div>
                  <p className="text-muted-foreground text-xs">Cache Hit Oranı</p>
                  <p className="text-foreground text-lg font-semibold">%{data.cache.hitRate}</p>
                  <p className="text-muted-foreground text-xs">
                    {data.cache.hits} hit / {data.cache.misses} miss
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Cache Boyutu</p>
                  <p className="text-foreground text-lg font-semibold">{data.cache.size} giriş</p>
                  <p className="text-muted-foreground text-xs">Bellek önbellekte</p>
                </div>
              </>
            )}
            {data.rateLimits && (
              <>
                <div>
                  <p className="text-muted-foreground text-xs">Rate Limit Kontrolleri</p>
                  <p className="text-foreground text-lg font-semibold">
                    {data.rateLimits.invocations}
                  </p>
                  <p className="text-muted-foreground text-xs">Bu process ömründe</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Rate Limit Redler</p>
                  <p
                    className={`text-lg font-semibold ${data.rateLimits.rejections > 0 ? 'text-yellow-400' : 'text-foreground'}`}
                  >
                    {data.rateLimits.rejections}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {data.rateLimits.invocations > 0
                      ? `%${Math.round((data.rateLimits.rejections / data.rateLimits.invocations) * 100)} red oranı`
                      : 'trafik yok'}
                  </p>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <section className="border-border bg-card rounded-xl border p-5">
        <h2 className="text-foreground mb-4 flex items-center gap-2 text-sm font-medium">
          <Server className="h-4 w-4" /> Background Workers
        </h2>
        <div className="space-y-2">
          {workers.map((w) => (
            <div
              key={w.name}
              className="bg-muted/50 flex items-center justify-between rounded-lg px-3 py-2"
            >
              <span className="text-foreground text-sm">{w.name}</span>
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                {w.hasData ? (
                  <>
                    <span>%{w.successRate} başarı</span>
                    <span>{w.failureCount} hata</span>
                    {w.queueLength !== null && <span>{w.queueLength} kuyrukta</span>}
                  </>
                ) : (
                  <span>veri yok — worker henüz rapor göndermedi</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {performance && (
        <section className="border-border bg-card rounded-xl border p-5">
          <h2 className="text-foreground mb-4 flex items-center gap-2 text-sm font-medium">
            <Flame className="h-4 w-4" /> Repository Heatmap
          </h2>
          {performance.repositoryHeatmap.length === 0 ? (
            <p className="text-muted-foreground text-sm">Henüz sorgu kaydedilmedi.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground text-left">
                    <th className="pb-2 pr-4">Repository</th>
                    <th className="pb-2 pr-4">Sorgu</th>
                    <th className="pb-2 pr-4">Ort.</th>
                    <th className="pb-2 pr-4">P95</th>
                    <th className="pb-2 pr-4">P99</th>
                    <th className="pb-2">Yavaş</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.repositoryHeatmap.map((h) => (
                    <tr key={h.table} className="border-border border-t">
                      <td className="text-foreground py-1.5 pr-4">{h.table}</td>
                      <td className="text-muted-foreground py-1.5 pr-4">{h.queryCount}</td>
                      <td className="text-muted-foreground py-1.5 pr-4">{h.avgDurationMs}ms</td>
                      <td className="text-muted-foreground py-1.5 pr-4">{h.p95Ms}ms</td>
                      <td className="text-muted-foreground py-1.5 pr-4">{h.p99Ms}ms</td>
                      <td
                        className={`py-1.5 ${h.slowQueryCount > 0 ? 'text-red-400' : 'text-muted-foreground'}`}
                      >
                        {h.slowQueryCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {performance && (
        <section className="border-border bg-card rounded-xl border p-5">
          <h2 className="text-foreground mb-4 flex items-center gap-2 text-sm font-medium">
            <ListOrdered className="h-4 w-4" /> Top 20 En Yavaş Sorgu
          </h2>
          {performance.top20SlowestQueries.length === 0 ? (
            <p className="text-muted-foreground text-sm">Henüz sorgu kaydedilmedi.</p>
          ) : (
            <div className="space-y-1.5">
              {performance.top20SlowestQueries.map((q, i) => (
                <div
                  key={i}
                  className="bg-muted/50 flex items-center justify-between rounded-lg px-3 py-1.5 text-xs"
                >
                  <span className="text-foreground">
                    {q.table}.{q.operation}
                  </span>
                  <span className={q.durationMs > 200 ? 'text-red-400' : 'text-muted-foreground'}>
                    {q.durationMs}ms
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {audit && (
        <section className="border-border bg-card rounded-xl border p-5">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-foreground flex items-center gap-2 text-sm font-medium">
                <Shield className="h-4 w-4" /> Üretim Denetim Raporu
              </h2>
              <p className="text-muted-foreground mt-0.5 text-xs">{audit.sprintSummary.sprint}</p>
            </div>
            <div className="text-right">
              <p className="text-foreground text-3xl font-bold">
                {audit.overallScore}
                <span className="text-muted-foreground text-base font-normal">/100</span>
              </p>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${audit.productionReady ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
              >
                {audit.productionReady ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                {audit.productionReady ? 'Üretime Hazır' : 'Hazır Değil'}
              </span>
            </div>
          </div>
          <p className="text-muted-foreground mb-4 text-xs">{audit.readinessJustification}</p>
          <div className="bg-muted/30 mb-4 grid grid-cols-4 gap-3 rounded-lg p-3 text-xs">
            <div className="text-center">
              <p className="text-muted-foreground">Circular Dep</p>
              <p className="text-foreground font-semibold">
                {audit.sprintSummary.circularDependencies}
              </p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Orphan Silindi</p>
              <p className="text-foreground font-semibold">
                {audit.sprintSummary.orphanFilesDeleted}
              </p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Route Koruması</p>
              <p className="text-foreground font-semibold">{audit.sprintSummary.routesProtected}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Test Geçer</p>
              <p className="text-foreground font-semibold">{audit.sprintSummary.testsPassing}</p>
            </div>
          </div>
          <div className="space-y-4">
            {audit.sections.map((section) => (
              <div key={section.name}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-foreground text-xs font-medium">{section.name}</span>
                  <span
                    className={`text-xs font-bold ${section.score >= 80 ? 'text-green-400' : section.score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}
                  >
                    {section.score}/100
                  </span>
                </div>
                <div className="bg-muted mb-2 h-1.5 w-full rounded-full">
                  <div
                    className={`h-1.5 rounded-full ${section.score >= 80 ? 'bg-green-500' : section.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${section.score}%` }}
                  />
                </div>
                <div className="space-y-1">
                  {section.criteria.map((c) => (
                    <div
                      key={c.name}
                      className="bg-muted/30 flex items-start gap-2 rounded-md px-2.5 py-1.5 text-xs"
                    >
                      {c.status === 'pass' ? (
                        <CheckCircle className="mt-0.5 h-3 w-3 shrink-0 text-green-400" />
                      ) : c.status === 'warn' ? (
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-yellow-400" />
                      ) : (
                        <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
                      )}
                      <div className="min-w-0">
                        <span className="text-foreground font-medium">{c.name}</span>
                        <span className="text-muted-foreground ml-1">— {c.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="border-border bg-card rounded-xl border p-5">
        <h2 className="text-foreground mb-4 flex items-center gap-2 text-sm font-medium">
          <Bug className="h-4 w-4" /> Hata Sınıflandırması ({errors.total} toplam)
        </h2>
        {errors.byClassification.length === 0 ? (
          <p className="text-muted-foreground text-sm">Henüz hata kaydedilmedi.</p>
        ) : (
          <div className="space-y-1.5">
            {errors.byClassification.map((e) => (
              <div
                key={e.classification}
                className="bg-muted/50 flex items-center justify-between rounded-lg px-3 py-1.5 text-xs"
              >
                <span className="text-foreground">{e.classification}</span>
                <span className="text-muted-foreground">{e.count}x</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="border-border bg-card rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="text-foreground mt-2 text-2xl font-bold">{value}</p>
      {sub && <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>}
    </div>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}sa ${m % 60}dk`;
  return `${Math.floor(h / 24)}g ${h % 24}sa`;
}
