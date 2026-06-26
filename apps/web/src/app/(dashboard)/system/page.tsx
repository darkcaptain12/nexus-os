'use client';

import { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Wifi, Shield, Zap, Clock, AlertTriangle } from 'lucide-react';

interface HealthCheck {
  name: string;
  status: string;
  latencyMs: number;
  details?: Record<string, unknown>;
}

interface SystemData {
  summary: { totalRequests: number; errorRate: number; avgLatencyMs: number; slowRequests: number; uptime: number };
  health: { score: number; status: string; system: { cpu: number; memoryPercent: number; memoryUsedMb: number; uptime: number; nodeVersion: string; platform: string } };
  production: { score: number; ready: boolean };
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

  useEffect(() => {
    Promise.all([
      fetch('/api/system/metrics').then((r) => r.json()),
      fetch('/api/system/health').then((r) => r.json()),
    ]).then(([metrics, health]) => {
      setData(metrics);
      setHealthData(health);
    }).catch(() => {});

    const interval = setInterval(() => {
      fetch('/api/system/metrics').then((r) => r.json()).then(setData).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sistem</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform durumu ve metrikleri</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatBox icon={<Activity className="h-4 w-4" />} label="Sağlık Puanı" value={`%${data.health.score}`} sub={data.health.status} />
        <StatBox icon={<Shield className="h-4 w-4" />} label="Üretim Hazırlık" value={`%${data.production.score}`} sub={data.production.ready ? 'Hazır' : 'Eksikler var'} />
        <StatBox icon={<Cpu className="h-4 w-4" />} label="CPU" value={`%${data.health.system.cpu}`} sub={`${data.health.system.platform}`} />
        <StatBox icon={<HardDrive className="h-4 w-4" />} label="Bellek" value={`${data.health.system.memoryUsedMb}MB`} sub={`%${data.health.system.memoryPercent}`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatBox icon={<Zap className="h-4 w-4" />} label="İstek" value={data.summary.totalRequests} sub={`%${data.summary.errorRate} hata`} />
        <StatBox icon={<Clock className="h-4 w-4" />} label="Ort. Gecikme" value={`${data.summary.avgLatencyMs}ms`} sub={`${data.summary.slowRequests} yavaş`} />
        <StatBox icon={<Wifi className="h-4 w-4" />} label="Çalışma Süresi" value={formatUptime(data.health.system.uptime)} sub={data.health.system.nodeVersion} />
        <StatBox icon={<AlertTriangle className="h-4 w-4" />} label="Yavaş İstek" value={data.summary.slowRequests} sub=">1000ms" />
      </div>

      {healthData && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-medium text-foreground">Servis Durumları</h2>
          <div className="space-y-2">
            {healthData.checks.map((check) => (
              <div key={check.name} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-sm text-foreground">{check.name}</span>
                <div className="flex items-center gap-2">
                  {check.latencyMs > 0 && <span className="text-xs text-muted-foreground">{check.latencyMs}ms</span>}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${STATUS_COLORS[check.status] ?? ''}`}>
                    {check.status === 'healthy' ? 'Sağlıklı' : check.status === 'degraded' ? 'Zayıf' : check.status === 'unhealthy' ? 'Sorunlu' : 'Bilinmiyor'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatBox({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
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
