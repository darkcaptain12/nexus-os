import { isSupabaseConfigured } from '@/lib/supabase/health';
import { getActionEngine } from '@/lib/actions/engine-instance';
import { getIntegrationHub } from '@/lib/integrations/hub-instance';
import { getWorkflowRuntime } from '@/lib/workflows/engine-instance';
import { getConfiguredProvider } from '@/lib/ai/providers';
import { fetchDesktopAgent } from '@/lib/desktop-client';
import type { HealthCheckResult } from './types';

/**
 * Domain-level health checks, run directly by the web app. Note: the
 * kernel's HealthMonitor (memory/event-runtime/command-bus checks) is NOT
 * extensible from here — Kernel.health is typed as the narrow
 * HealthMonitorPort ({check, getScore}), deliberately hiding
 * registerCheck() from consumers. So these checks are combined with
 * kernel.health.check()'s own checks inside generateHealthReport(), rather
 * than being registered into the kernel's internal registry.
 */

export async function checkDatabase(): Promise<HealthCheckResult> {
  const start = performance.now();
  const configured = isSupabaseConfigured();
  return {
    name: 'Database',
    status: configured ? 'healthy' : 'degraded',
    latencyMs: Math.round(performance.now() - start),
    details: { configured },
  };
}

export async function checkMemoryEngine(): Promise<HealthCheckResult> {
  return {
    name: 'Memory Engine',
    status: isSupabaseConfigured() ? 'healthy' : 'degraded',
    latencyMs: 0,
    message:
      'Reachability check only (no auth context in health checks) — does not verify embeddings/RLS',
    details: { configured: isSupabaseConfigured() },
  };
}

export function checkAIProvider(): HealthCheckResult {
  const provider = getConfiguredProvider();
  return {
    name: 'AI Provider',
    status: provider ? 'healthy' : 'degraded',
    latencyMs: 0,
    message: provider ? undefined : 'No AI provider configured — running on rule-engine fallback',
    details: { provider: provider?.provider ?? null, model: provider?.model ?? null },
  };
}

export function checkActionEngine(): HealthCheckResult {
  const stats = getActionEngine().getStats();
  return {
    name: 'Action Engine',
    status: 'healthy',
    latencyMs: 0,
    details: {
      registeredActions: stats.registeredActions,
      queued: stats.queued,
      failed: stats.failed,
    },
  };
}

export function checkIntegrationHub(): HealthCheckResult {
  const stats = getIntegrationHub().getStats();
  return {
    name: 'Integration Hub',
    status: 'healthy',
    latencyMs: 0,
    details: { providers: stats.totalProviders, connected: stats.connectedProviders },
  };
}

export function checkWorkflowRuntime(): HealthCheckResult {
  const stats = getWorkflowRuntime().getStats();
  return {
    name: 'Workflow Runtime',
    status: 'healthy',
    latencyMs: 0,
    details: { workflows: stats.totalWorkflows, running: stats.running },
  };
}

export async function checkDesktopAgent(): Promise<HealthCheckResult> {
  const start = performance.now();
  const data = await fetchDesktopAgent('/health');
  return {
    name: 'Desktop Agent',
    status: data ? 'healthy' : 'unknown',
    latencyMs: Math.round(performance.now() - start),
    message: data ? undefined : 'Desktop Agent not reachable — likely not running on this machine',
    details: { connected: !!data },
  };
}

export async function runAllDomainChecks(): Promise<HealthCheckResult[]> {
  const [database, memoryEngine, desktopAgent] = await Promise.all([
    checkDatabase(),
    checkMemoryEngine(),
    checkDesktopAgent(),
  ]);
  return [
    database,
    memoryEngine,
    checkAIProvider(),
    checkActionEngine(),
    checkIntegrationHub(),
    checkWorkflowRuntime(),
    desktopAgent,
  ];
}
