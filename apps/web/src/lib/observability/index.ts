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

class MetricsCollector {
  private metrics: MetricEntry[] = [];
  private traces: RequestTrace[] = [];
  private counters = new Map<string, number>();
  private timers = new Map<string, number>();
  private slowThresholdMs = 1000;

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

  record(name: string, value: number, unit: MetricEntry['unit'], tags: Record<string, string> = {}): void {
    this.metrics.push({ name, value, unit, tags, timestamp: new Date().toISOString() });
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-5000);
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

  getMetrics(): { counters: Record<string, number>; recentMetrics: MetricEntry[]; recentTraces: RequestTrace[] } {
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
    const avg = latencies.length > 0 ? Math.round(latencies.reduce((s, l) => s + l, 0) / latencies.length) : 0;

    return {
      totalRequests: total,
      errorRate: total > 0 ? Math.round((errors / total) * 100) : 0,
      avgLatencyMs: avg,
      slowRequests: slow,
      uptime: Math.round(process.uptime()),
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
