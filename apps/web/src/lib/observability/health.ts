import os from 'os';
import { getKernel } from '@/lib/kernel';
import { runAllDomainChecks } from './health-checks';
import { getMetrics } from './index';
import type { HealthCheckResult, Severity } from './types';
import { getModuleHealthTracker } from './module-health-tracker';

export type { HealthCheckResult, Severity } from './types';

export interface SystemHealthReport {
  score: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  severity: Severity;
  checks: HealthCheckResult[];
  system: {
    cpu: number;
    memoryPercent: number;
    memoryUsedMb: number;
    uptime: number;
    nodeVersion: string;
    platform: string;
    eventLoopDelayMs: { mean: number; p99: number } | null;
  };
  timestamp: string;
}

const STATUS_WEIGHTS: Record<HealthCheckResult['status'], number> = {
  healthy: 100,
  degraded: 50,
  unhealthy: 0,
  unknown: 25,
};

/**
 * Single consolidated health source. Kernel.health is publicly typed as
 * HealthMonitorPort ({check, getScore}) — it deliberately does not expose
 * registerCheck() to consumers, so domain checks can't be pushed into the
 * kernel's internal registry from here. Instead this function PULLS
 * kernel.health.check() (which covers memory/event-runtime/command-bus)
 * and MERGES it with the 7 domain-level checks (database, AI provider,
 * action engine, integration hub, workflow runtime, desktop agent, memory
 * engine) into one combined checks[] array and one recalculated score —
 * that combined array is the single source every endpoint/page reads.
 */
export async function generateHealthReport(): Promise<SystemHealthReport> {
  const { kernel, ready } = getKernel();
  await ready;

  const [kernelReport, domainChecks] = await Promise.all([
    kernel.health.check(),
    runAllDomainChecks(),
  ]);

  const kernelChecks: HealthCheckResult[] = kernelReport.checks.map((c) => ({
    name: c.name,
    // kernel's public HealthReport types `status` as plain `string`, but its
    // InMemoryHealthMonitor implementation only ever produces these 4 values.
    status: c.status as HealthCheckResult['status'],
    latencyMs: Math.round(c.latencyMs),
    message: c.error,
  }));

  const checks = getModuleHealthTracker().trackAll([...kernelChecks, ...domainChecks]);
  const score =
    checks.length > 0
      ? Math.round(checks.reduce((sum, c) => sum + STATUS_WEIGHTS[c.status], 0) / checks.length)
      : 100;
  const status = score >= 80 ? 'healthy' : score >= 50 ? 'degraded' : 'unhealthy';
  const severity: Severity = score >= 80 ? 'Healthy' : score >= 50 ? 'Warning' : 'Critical';

  const mem = process.memoryUsage();
  const totalMem = os.totalmem();
  const processMetrics = getMetrics().getProcessMetrics();

  return {
    score,
    status,
    severity,
    checks,
    system: {
      cpu: getCpuUsage(),
      memoryPercent: Math.round((mem.heapUsed / totalMem) * 100),
      memoryUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      platform: os.platform(),
      eventLoopDelayMs: processMetrics.eventLoopDelayMs,
    },
    timestamp: new Date().toISOString(),
  };
}

function getCpuUsage(): number {
  const cpus = os.cpus();
  let idle = 0,
    total = 0;
  for (const cpu of cpus) {
    idle += cpu.times.idle;
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
  }
  return Math.round((1 - idle / total) * 100);
}
