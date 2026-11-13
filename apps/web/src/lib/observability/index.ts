import { monitorEventLoopDelay } from 'perf_hooks';
import type { IntervalHistogram } from 'perf_hooks';

export type ObservabilityModule =
  | 'request'
  | 'db'
  | 'ai'
  | 'workflow'
  | 'action'
  | 'desktop'
  | 'integration';

export interface MetricEntry {
  name: string;
  value: number;
  unit: 'ms' | 'count' | 'percent' | 'bytes';
  tags: Record<string, string>;
  timestamp: string;
}

export interface RequestTrace {
  id: string;
  correlationId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  timestamp: string;
}

export interface PercentileStats {
  count: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
}

export interface SlowEntry {
  name: string;
  module: string;
  durationMs: number;
  timestamp: string;
}

export interface ProcessMetrics {
  memory: {
    rssBytes: number;
    heapUsedBytes: number;
    heapTotalBytes: number;
    externalBytes: number;
  };
  cpuPercent: number | null;
  eventLoopDelayMs: { mean: number; p99: number } | null;
  uptimeSeconds: number;
  activeSessions: { count: number | null; note: string };
}

class MetricsCollector {
  private metrics: MetricEntry[] = [];
  private traces: RequestTrace[] = [];
  private counters = new Map<string, number>();
  private timers = new Map<string, number>();
  private slowThresholdMs = 1000;
  private lastCpuUsage: ReturnType<typeof process.cpuUsage> | null = null;
  private lastCpuCheckedAt: number | null = null;
  private eventLoopHistogram: IntervalHistogram | null = null;

  constructor() {
    try {
      this.eventLoopHistogram = monitorEventLoopDelay({ resolution: 20 });
      this.eventLoopHistogram.enable();
    } catch {
      this.eventLoopHistogram = null;
    }
  }

  increment(name: string, amount = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + amount);
  }

  startTimer(name: string): string {
    const id = `${name}-${Date.now()}`;
    this.timers.set(id, performance.now());
    return id;
  }

  endTimer(id: string): number {
    const start = this.timers.get(id);
    if (!start) return 0;
    this.timers.delete(id);
    const duration = Math.round(performance.now() - start);

    const name = id.split('-')[0]!;
    this.record(name, duration, 'ms');

    if (duration > this.slowThresholdMs) {
      this.record(`${name}.slow`, duration, 'ms');
    }

    return duration;
  }

  record(
    name: string,
    value: number,
    unit: MetricEntry['unit'],
    tags: Record<string, string> = {},
  ): void {
    this.metrics.push({ name, value, unit, tags, timestamp: new Date().toISOString() });
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-5000);
    }
  }

  /** Times an async operation and records it tagged by module, for cross-cutting duration tracking. */
  async time<T>(module: ObservabilityModule, name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const durationMs = Math.round(performance.now() - start);
      this.record(name, durationMs, 'ms', { module });
    }
  }

  traceRequest(trace: Omit<RequestTrace, 'id' | 'timestamp'>): void {
    this.traces.push({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...trace,
    });
    this.increment('requests.total');
    if (trace.status >= 400) this.increment('requests.errors');
    if (trace.durationMs > this.slowThresholdMs) this.increment('requests.slow');

    if (this.traces.length > 5000) {
      this.traces = this.traces.slice(-2500);
    }
  }

  getMetrics(): {
    counters: Record<string, number>;
    recentMetrics: MetricEntry[];
    recentTraces: RequestTrace[];
  } {
    return {
      counters: Object.fromEntries(this.counters),
      recentMetrics: this.metrics.slice(-100),
      recentTraces: this.traces.slice(-50),
    };
  }

  getCounter(name: string): number {
    return this.counters.get(name) ?? 0;
  }

  getSummary(): {
    totalRequests: number;
    errorRate: number;
    avgLatencyMs: number;
    slowRequests: number;
    uptime: number;
  } {
    const total = this.getCounter('requests.total');
    const errors = this.getCounter('requests.errors');
    const slow = this.getCounter('requests.slow');
    const latencies = this.traces.map((t) => t.durationMs);
    const avg =
      latencies.length > 0
        ? Math.round(latencies.reduce((s, l) => s + l, 0) / latencies.length)
        : 0;

    return {
      totalRequests: total,
      errorRate: total > 0 ? Math.round((errors / total) * 100) : 0,
      avgLatencyMs: avg,
      slowRequests: slow,
      uptime: Math.round(process.uptime()),
    };
  }

  /** Percentile stats over recorded ms-unit metrics, optionally filtered by name and/or module tag. */
  getPercentiles(filter?: { name?: string; module?: string }): PercentileStats {
    const values = this.metrics
      .filter((m) => m.unit === 'ms')
      .filter((m) => !filter?.name || m.name === filter.name)
      .filter((m) => !filter?.module || m.tags['module'] === filter.module)
      .map((m) => m.value)
      .sort((a, b) => a - b);

    if (values.length === 0) {
      return { count: 0, avgMs: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0, minMs: 0, maxMs: 0 };
    }

    const percentile = (p: number) =>
      values[Math.min(values.length - 1, Math.floor((p / 100) * values.length))]!;

    return {
      count: values.length,
      avgMs: Math.round(values.reduce((s, v) => s + v, 0) / values.length),
      p50Ms: percentile(50),
      p95Ms: percentile(95),
      p99Ms: percentile(99),
      minMs: values[0]!,
      maxMs: values[values.length - 1]!,
    };
  }

  /** Slowest recorded operations, optionally filtered by module, for performance profiling. */
  getSlowest(filter?: { module?: string }, limit = 10): SlowEntry[] {
    return this.metrics
      .filter((m) => m.unit === 'ms')
      .filter((m) => !filter?.module || m.tags['module'] === filter.module)
      .sort((a, b) => b.value - a.value)
      .slice(0, limit)
      .map((m) => ({
        name: m.name,
        module: m.tags['module'] ?? 'unknown',
        durationMs: m.value,
        timestamp: m.timestamp,
      }));
  }

  /**
   * Real Node.js process metrics. CPU% is delta-sampled (process.cpuUsage()
   * since the previous call), so the first call in a process's lifetime
   * returns null for cpuPercent — there's no prior sample to diff against.
   * activeSessions is intentionally null: there is no server-side session
   * registry in this app (Supabase auth is stateless JWT, no session store),
   * so it cannot be measured — reported honestly rather than guessed.
   */
  getProcessMetrics(): ProcessMetrics {
    const mem = process.memoryUsage();
    const now = Date.now();

    let cpuPercent: number | null = null;
    const currentCpu = process.cpuUsage();
    if (this.lastCpuUsage && this.lastCpuCheckedAt) {
      const elapsedMs = now - this.lastCpuCheckedAt;
      if (elapsedMs > 0) {
        const deltaUserMs = (currentCpu.user - this.lastCpuUsage.user) / 1000;
        const deltaSysMs = (currentCpu.system - this.lastCpuUsage.system) / 1000;
        cpuPercent = Math.round(((deltaUserMs + deltaSysMs) / elapsedMs) * 100 * 100) / 100;
      }
    }
    this.lastCpuUsage = currentCpu;
    this.lastCpuCheckedAt = now;

    let eventLoopDelayMs: ProcessMetrics['eventLoopDelayMs'] = null;
    if (this.eventLoopHistogram) {
      eventLoopDelayMs = {
        mean: Math.round((this.eventLoopHistogram.mean / 1e6) * 100) / 100,
        p99: Math.round((this.eventLoopHistogram.percentile(99) / 1e6) * 100) / 100,
      };
    }

    return {
      memory: {
        rssBytes: mem.rss,
        heapUsedBytes: mem.heapUsed,
        heapTotalBytes: mem.heapTotal,
        externalBytes: mem.external,
      },
      cpuPercent,
      eventLoopDelayMs,
      uptimeSeconds: Math.round(process.uptime()),
      activeSessions: {
        count: null,
        note: 'not measured — no server-side session registry (stateless JWT auth)',
      },
    };
  }
}

let instance: MetricsCollector | null = null;

export function getMetrics(): MetricsCollector {
  if (!instance) instance = new MetricsCollector();
  return instance;
}

export function generateCorrelationId(): string {
  return crypto.randomUUID();
}
