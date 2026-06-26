import os from 'os';
import type { HealthCheck, SystemHealth, ResourceMetrics, HealthAlert } from '../../health/types';
import type { HealthMonitor, HealthChecker } from '../../health/interfaces';
import type { HealthReport } from '../../core/interfaces';
import type { Logger } from '@apex-os/logger';

interface RegisteredCheck {
  name: string;
  checker: HealthChecker;
  interval: number;
  lastResult?: HealthCheck;
}

export class InMemoryHealthMonitor implements HealthMonitor {
  private checks = new Map<string, RegisteredCheck>();
  private alerts: HealthAlert[] = [];
  private intervalHandle?: ReturnType<typeof setInterval>;
  private startedAt = Date.now();
  private score = 100;
  private log: Logger;
  private defaultInterval: number;

  constructor(log: Logger, defaultInterval = 30000) {
    this.log = log;
    this.defaultInterval = defaultInterval;
  }

  registerCheck(name: string, checker: HealthChecker, interval?: number): void {
    this.checks.set(name, { name, checker, interval: interval ?? this.defaultInterval });
    this.log.debug(`Health check registered: ${name}`);
  }

  unregisterCheck(name: string): void {
    this.checks.delete(name);
  }

  async check(): Promise<SystemHealth> {
    const results: HealthCheck[] = [];

    for (const [name, registered] of this.checks) {
      const start = performance.now();
      try {
        const result = await registered.checker.check();
        const check: HealthCheck = {
          name,
          ...result,
          lastCheckedAt: new Date().toISOString(),
        };
        registered.lastResult = check;
        results.push(check);
      } catch (err) {
        const check: HealthCheck = {
          name,
          status: 'unhealthy',
          latencyMs: performance.now() - start,
          message: err instanceof Error ? err.message : String(err),
          lastCheckedAt: new Date().toISOString(),
        };
        registered.lastResult = check;
        results.push(check);
      }
    }

    this.score = this.calculateScore(results);
    const status = this.score >= 80 ? 'healthy' : this.score >= 50 ? 'degraded' : 'unhealthy';

    this.checkAlerts(results);

    return {
      status,
      score: this.score,
      checks: results,
      uptime: (Date.now() - this.startedAt) / 1000,
      timestamp: new Date().toISOString(),
    };
  }

  async checkOne(name: string): Promise<HealthCheck> {
    const registered = this.checks.get(name);
    if (!registered) {
      return { name, status: 'unknown', latencyMs: 0, message: 'Check not found', lastCheckedAt: new Date().toISOString() };
    }
    const result = await registered.checker.check();
    const check: HealthCheck = { name, ...result, lastCheckedAt: new Date().toISOString() };
    registered.lastResult = check;
    return check;
  }

  getScore(): number {
    return this.score;
  }

  getAlerts(): HealthAlert[] {
    return [...this.alerts];
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledgedAt = new Date().toISOString();
    }
  }

  async getMetrics(): Promise<ResourceMetrics> {
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    return {
      cpu: { usage: 0, cores: os.cpus().length },
      memory: {
        used: mem.heapUsed,
        total: totalMem,
        percentage: (mem.heapUsed / totalMem) * 100,
      },
      disk: { used: 0, total: 0, percentage: 0 },
      network: { latencyMs: 0, connections: 0 },
    };
  }

  start(): void {
    if (this.intervalHandle) return;
    this.intervalHandle = setInterval(async () => {
      try {
        await this.check();
      } catch (err) {
        this.log.error('Health check cycle failed', { error: err instanceof Error ? err.message : String(err) });
      }
    }, this.defaultInterval);
    this.log.info('Health monitor started', { interval: this.defaultInterval });
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
      this.log.info('Health monitor stopped');
    }
  }

  async toReport(): Promise<HealthReport> {
    const health = await this.check();
    return {
      score: health.score,
      status: health.status === 'unknown' ? 'degraded' : health.status,
      checks: health.checks.map((c) => ({
        name: c.name,
        status: c.status,
        latencyMs: c.latencyMs,
        error: c.message,
      })),
      timestamp: health.timestamp,
    };
  }

  private calculateScore(checks: HealthCheck[]): number {
    if (checks.length === 0) return 100;
    const weights: Record<string, number> = { healthy: 100, degraded: 50, unhealthy: 0, unknown: 25 };
    const total = checks.reduce((sum, c) => sum + (weights[c.status] ?? 0), 0);
    return Math.round(total / checks.length);
  }

  private checkAlerts(checks: HealthCheck[]): void {
    for (const check of checks) {
      if (check.status === 'unhealthy') {
        const existing = this.alerts.find((a) => a.check === check.name && !a.resolvedAt);
        if (!existing) {
          this.alerts.push({
            id: crypto.randomUUID(),
            check: check.name,
            severity: 'critical',
            message: check.message ?? `${check.name} is unhealthy`,
            triggeredAt: new Date().toISOString(),
          });
          this.log.warn(`Health alert: ${check.name} is unhealthy`);
        }
      } else {
        const existing = this.alerts.find((a) => a.check === check.name && !a.resolvedAt);
        if (existing) {
          existing.resolvedAt = new Date().toISOString();
        }
      }
    }
  }
}
