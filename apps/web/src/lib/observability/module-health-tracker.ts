import type { HealthCheckResult } from './types';

interface ModuleState {
  firstSeenAt: Date;
  lastCheck: Date;
  lastFailure: Date | null;
  errorCount: number;
}

class ModuleHealthTracker {
  private readonly modules = new Map<string, ModuleState>();

  track(result: HealthCheckResult): HealthCheckResult {
    const now = new Date();
    const prev = this.modules.get(result.name);

    const isFailure = result.status === 'unhealthy' || result.status === 'degraded';

    const next: ModuleState = {
      firstSeenAt: prev?.firstSeenAt ?? now,
      lastCheck: now,
      lastFailure: isFailure ? now : (prev?.lastFailure ?? null),
      errorCount: (prev?.errorCount ?? 0) + (isFailure ? 1 : 0),
    };

    this.modules.set(result.name, next);

    return {
      ...result,
      lastCheck: now.toISOString(),
      lastFailure: next.lastFailure?.toISOString() ?? null,
      errorCount: next.errorCount,
      uptimeSeconds: Math.round((now.getTime() - next.firstSeenAt.getTime()) / 1000),
    };
  }

  trackAll(results: HealthCheckResult[]): HealthCheckResult[] {
    return results.map((r) => this.track(r));
  }
}

let _tracker: ModuleHealthTracker | null = null;

export function getModuleHealthTracker(): ModuleHealthTracker {
  if (!_tracker) _tracker = new ModuleHealthTracker();
  return _tracker;
}
