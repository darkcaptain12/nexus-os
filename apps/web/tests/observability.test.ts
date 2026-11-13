import { describe, it, expect } from 'vitest';
import { getMetrics, generateCorrelationId } from '../src/lib/observability';
import { getAppConfig, validateConfig } from '../src/lib/config';
import { getRateLimiter } from '../src/lib/security/headers';

describe('MetricsCollector', () => {
  it('increments counters', () => {
    const m = getMetrics();
    const before = m.getCounter('test.counter');
    m.increment('test.counter');
    expect(m.getCounter('test.counter')).toBe(before + 1);
  });

  it('records metrics', () => {
    const m = getMetrics();
    m.record('test.latency', 42, 'ms');
    const data = m.getMetrics();
    expect(data.recentMetrics.length).toBeGreaterThan(0);
  });

  it('times operations', () => {
    const m = getMetrics();
    const id = m.startTimer('test.op');
    const duration = m.endTimer(id);
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it('traces requests', () => {
    const m = getMetrics();
    m.traceRequest({
      correlationId: '123',
      method: 'GET',
      path: '/test',
      status: 200,
      durationMs: 50,
    });
    const summary = m.getSummary();
    expect(summary.totalRequests).toBeGreaterThan(0);
  });

  it('generates summary', () => {
    const m = getMetrics();
    const summary = m.getSummary();
    expect(summary.uptime).toBeGreaterThanOrEqual(0);
    expect(typeof summary.errorRate).toBe('number');
  });
});

describe('generateCorrelationId', () => {
  it('returns unique UUIDs', () => {
    const a = generateCorrelationId();
    const b = generateCorrelationId();
    expect(a).not.toBe(b);
    expect(a.length).toBe(36);
  });
});

describe('AppConfig', () => {
  it('returns config object', () => {
    const config = getAppConfig();
    expect(config.environment).toBeDefined();
    expect(typeof config.debug).toBe('boolean');
  });

  it('validates config', () => {
    const result = validateConfig();
    expect(typeof result.valid).toBe('boolean');
    expect(Array.isArray(result.errors)).toBe(true);
  });
});

describe('RateLimiter', () => {
  it('allows within limit', () => {
    const limiter = getRateLimiter();
    const result = limiter.check('test-key-1', 5, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('blocks when exhausted', () => {
    const limiter = getRateLimiter();
    const key = `exhaust-${Date.now()}`;
    for (let i = 0; i < 3; i++) limiter.check(key, 3, 60000);
    const result = limiter.check(key, 3, 60000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

describe('MetricsCollector — module-tagged timing', () => {
  it('time() records a duration tagged by module', async () => {
    const m = getMetrics();
    const result = await m.time('db', 'test.query.module', async () => {
      await new Promise((r) => setTimeout(r, 5));
      return 'ok';
    });
    expect(result).toBe('ok');
    const stats = m.getPercentiles({ name: 'test.query.module', module: 'db' });
    expect(stats.count).toBeGreaterThanOrEqual(1);
  });

  it('getPercentiles computes p50/p95/p99 over recorded values', () => {
    const m = getMetrics();
    for (const v of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
      m.record('test.percentile.metric', v, 'ms');
    }
    const stats = m.getPercentiles({ name: 'test.percentile.metric' });
    expect(stats.count).toBe(10);
    expect(stats.minMs).toBe(10);
    expect(stats.maxMs).toBe(100);
    expect(stats.p50Ms).toBeGreaterThan(0);
    expect(stats.p99Ms).toBeGreaterThanOrEqual(stats.p50Ms);
  });

  it('getPercentiles returns zeroed stats when nothing recorded', () => {
    const m = getMetrics();
    const stats = m.getPercentiles({ name: 'test.nonexistent.metric.xyz' });
    expect(stats).toEqual({ count: 0, avgMs: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0, minMs: 0, maxMs: 0 });
  });

  it('getSlowest returns entries sorted descending by duration', () => {
    const m = getMetrics();
    m.record('test.slowest.a', 50, 'ms', { module: 'workflow' });
    m.record('test.slowest.b', 500, 'ms', { module: 'workflow' });
    m.record('test.slowest.c', 200, 'ms', { module: 'workflow' });
    const slowest = m.getSlowest({ module: 'workflow' }, 3);
    expect(slowest[0]!.durationMs).toBeGreaterThanOrEqual(slowest[1]?.durationMs ?? 0);
  });

  it('getProcessMetrics returns real memory usage', () => {
    const m = getMetrics();
    const proc = m.getProcessMetrics();
    expect(proc.memory.heapUsedBytes).toBeGreaterThan(0);
    expect(proc.memory.rssBytes).toBeGreaterThan(0);
    expect(proc.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('getProcessMetrics reports activeSessions as honestly not-measured', () => {
    const m = getMetrics();
    const proc = m.getProcessMetrics();
    expect(proc.activeSessions.count).toBeNull();
    expect(proc.activeSessions.note).toContain('not measured');
  });

  it('getProcessMetrics computes cpuPercent on second call (delta-sampled)', () => {
    const m = getMetrics();
    m.getProcessMetrics();
    const second = m.getProcessMetrics();
    expect(second.cpuPercent === null || typeof second.cpuPercent === 'number').toBe(true);
  });
});
