import { validateEnvironment, isSupabaseConfigured, checkSupabaseHealth } from './health';
import type { SupabaseHealth } from './health';

export interface StartupCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  message: string;
  critical: boolean;
}

export interface StartupReport {
  checks: StartupCheck[];
  ready: boolean;
  mode: 'production' | 'development-mock';
  timestamp: string;
}

export async function runStartupChecks(
  createClient: () => Promise<{ from: Function; auth: unknown; storage: unknown }>,
): Promise<StartupReport> {
  const checks: StartupCheck[] = [];

  const env = validateEnvironment();
  checks.push({
    name: 'environment',
    status: env.valid ? 'pass' : 'fail',
    message: env.valid ? 'All required env vars set' : `Missing: ${env.missing.join(', ')}`,
    critical: true,
  });

  if (!isSupabaseConfigured()) {
    checks.push({
      name: 'supabase',
      status: 'warn',
      message: 'Supabase not configured — running in development mock mode',
      critical: false,
    });

    return {
      checks,
      ready: true,
      mode: 'development-mock',
      timestamp: new Date().toISOString(),
    };
  }

  let health: SupabaseHealth | null = null;
  try {
    const db = await createClient();
    health = await checkSupabaseHealth(db as Parameters<typeof checkSupabaseHealth>[0]);
  } catch (e) {
    checks.push({
      name: 'connection',
      status: 'fail',
      message: `Connection failed: ${e instanceof Error ? e.message : String(e)}`,
      critical: true,
    });
  }

  if (health) {
    checks.push({
      name: 'connection',
      status: health.connected ? 'pass' : 'fail',
      message: health.connected ? `Connected (${health.latencyMs}ms)` : 'Connection failed',
      critical: true,
    });

    checks.push({
      name: 'tables',
      status: health.tablesFound > 0 ? 'pass' : 'warn',
      message: `${health.tablesFound} tables found`,
      critical: false,
    });

    checks.push({
      name: 'auth',
      status: health.authEnabled ? 'pass' : 'warn',
      message: health.authEnabled ? 'Auth enabled' : 'Auth not verified',
      critical: false,
    });

    checks.push({
      name: 'storage',
      status: health.storageEnabled ? 'pass' : 'warn',
      message: health.storageEnabled ? 'Storage accessible' : 'Storage not accessible',
      critical: false,
    });

    checks.push({
      name: 'realtime',
      status: health.realtimeEnabled ? 'pass' : 'warn',
      message: health.realtimeEnabled ? 'Realtime enabled' : 'Realtime not verified',
      critical: false,
    });

    checks.push({
      name: 'rls',
      status: health.rlsEnabled ? 'pass' : 'fail',
      message: health.rlsEnabled ? 'RLS enabled' : 'RLS not verified — security risk',
      critical: true,
    });

    for (const error of health.errors) {
      checks.push({
        name: 'error',
        status: 'fail',
        message: error,
        critical: false,
      });
    }
  }

  const criticalFails = checks.filter((c) => c.critical && c.status === 'fail');

  return {
    checks,
    ready: criticalFails.length === 0,
    mode: 'production',
    timestamp: new Date().toISOString(),
  };
}
