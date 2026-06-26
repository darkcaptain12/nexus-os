import os from 'os';
import { getKernel } from '@/lib/kernel';
import { getActionEngine } from '@/lib/actions/engine-instance';
import { getIntegrationHub } from '@/lib/integrations/hub-instance';
import { getWorkflowRuntime } from '@/lib/workflows/engine-instance';
import { isSupabaseConfigured } from '@/lib/supabase/health';
import { fetchDesktopAgent } from '@/lib/desktop-client';

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  latencyMs: number;
  details?: Record<string, unknown>;
}

export interface SystemHealthReport {
  score: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheckResult[];
  system: {
    cpu: number;
    memoryPercent: number;
    memoryUsedMb: number;
    uptime: number;
    nodeVersion: string;
    platform: string;
  };
  timestamp: string;
}

export async function generateHealthReport(): Promise<SystemHealthReport> {
  const checks: HealthCheckResult[] = [];

  checks.push(await checkKernel());
  checks.push(await checkDatabase());
  checks.push(checkActionEngine());
  checks.push(checkIntegrationHub());
  checks.push(checkWorkflowRuntime());
  checks.push(checkMemory());
  checks.push(checkCPU());
  checks.push(await checkDesktopAgent());

  const score = calculateScore(checks);
  const mem = process.memoryUsage();
  const totalMem = os.totalmem();

  return {
    score,
    status: score >= 80 ? 'healthy' : score >= 50 ? 'degraded' : 'unhealthy',
    checks,
    system: {
      cpu: getCpuUsage(),
      memoryPercent: Math.round((mem.heapUsed / totalMem) * 100),
      memoryUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      platform: os.platform(),
    },
    timestamp: new Date().toISOString(),
  };
}

async function checkKernel(): Promise<HealthCheckResult> {
  const start = performance.now();
  try {
    const { kernel, ready } = getKernel();
    await ready;
    const status = kernel.getStatus();
    return {
      name: 'Kernel',
      status: status.phase === 'running' ? 'healthy' : 'degraded',
      latencyMs: Math.round(performance.now() - start),
      details: { phase: status.phase, services: status.services },
    };
  } catch {
    return { name: 'Kernel', status: 'unhealthy', latencyMs: Math.round(performance.now() - start) };
  }
}

async function checkDatabase(): Promise<HealthCheckResult> {
  return {
    name: 'Database',
    status: isSupabaseConfigured() ? 'healthy' : 'degraded',
    latencyMs: 0,
    details: { configured: isSupabaseConfigured() },
  };
}

function checkActionEngine(): HealthCheckResult {
  const engine = getActionEngine();
  const stats = engine.getStats();
  return {
    name: 'Action Engine',
    status: 'healthy',
    latencyMs: 0,
    details: { registeredActions: stats.registeredActions, queued: stats.queued },
  };
}

function checkIntegrationHub(): HealthCheckResult {
  const hub = getIntegrationHub();
  const stats = hub.getStats();
  return {
    name: 'Integration Hub',
    status: 'healthy',
    latencyMs: 0,
    details: { providers: stats.totalProviders, connected: stats.connectedProviders },
  };
}

function checkWorkflowRuntime(): HealthCheckResult {
  const runtime = getWorkflowRuntime();
  const stats = runtime.getStats();
  return {
    name: 'Workflow Runtime',
    status: 'healthy',
    latencyMs: 0,
    details: { workflows: stats.totalWorkflows, running: stats.running },
  };
}

function checkMemory(): HealthCheckResult {
  const mem = process.memoryUsage();
  const percent = (mem.heapUsed / mem.heapTotal) * 100;
  return {
    name: 'Memory',
    status: percent < 90 ? 'healthy' : percent < 98 ? 'degraded' : 'unhealthy',
    latencyMs: 0,
    details: { heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024), percent: Math.round(percent) },
  };
}

function checkCPU(): HealthCheckResult {
  const usage = getCpuUsage();
  return {
    name: 'CPU',
    status: usage < 80 ? 'healthy' : usage < 95 ? 'degraded' : 'unhealthy',
    latencyMs: 0,
    details: { usage, cores: os.cpus().length },
  };
}

async function checkDesktopAgent(): Promise<HealthCheckResult> {
  const start = performance.now();
  const data = await fetchDesktopAgent('/health');
  return {
    name: 'Desktop Agent',
    status: data ? 'healthy' : 'unknown',
    latencyMs: Math.round(performance.now() - start),
    details: { connected: !!data },
  };
}

function getCpuUsage(): number {
  const cpus = os.cpus();
  let idle = 0, total = 0;
  for (const cpu of cpus) {
    idle += cpu.times.idle;
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
  }
  return Math.round((1 - idle / total) * 100);
}

function calculateScore(checks: HealthCheckResult[]): number {
  if (checks.length === 0) return 100;
  const weights: Record<string, number> = { healthy: 100, degraded: 50, unhealthy: 0, unknown: 25 };
  const total = checks.reduce((sum, c) => sum + (weights[c.status] ?? 0), 0);
  return Math.round(total / checks.length);
}
