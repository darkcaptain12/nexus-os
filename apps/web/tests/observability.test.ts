import { describe, it, expect, beforeEach } from 'vitest';
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
    m.traceRequest({ correlationId: '123', method: 'GET', path: '/test', status: 200, durationMs: 50 });
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
