import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemoryHealthMonitor } from '../src/runtime/impl/health-monitor.impl';
import { createLogger } from '@apex-os/logger';

describe('InMemoryHealthMonitor', () => {
  let monitor: InMemoryHealthMonitor;

  beforeEach(() => {
    monitor = new InMemoryHealthMonitor(createLogger({ service: 'test', module: 'health' }), 60000);
  });

  afterEach(() => {
    monitor.stop();
  });

  it('returns healthy with no checks', async () => {
    const health = await monitor.check();
    expect(health.score).toBe(100);
    expect(health.status).toBe('healthy');
  });

  it('registers and runs a healthy check', async () => {
    monitor.registerCheck('db', {
      check: async () => ({ status: 'healthy', latencyMs: 5 }),
    });

    const health = await monitor.check();
    expect(health.checks).toHaveLength(1);
    expect(health.checks[0]!.name).toBe('db');
    expect(health.checks[0]!.status).toBe('healthy');
    expect(health.score).toBe(100);
  });

  it('degrades score on unhealthy check', async () => {
    monitor.registerCheck('failing', {
      check: async () => ({ status: 'unhealthy', latencyMs: 0, message: 'down' }),
    });

    const health = await monitor.check();
    expect(health.score).toBe(0);
    expect(health.status).toBe('unhealthy');
  });

  it('creates alert on unhealthy check', async () => {
    monitor.registerCheck('bad', {
      check: async () => ({ status: 'unhealthy', latencyMs: 0, message: 'error' }),
    });

    await monitor.check();
    const alerts = monitor.getAlerts();
    expect(alerts.length).toBe(1);
    expect(alerts[0]!.severity).toBe('critical');
  });

  it('resolves alert when check recovers', async () => {
    let healthy = false;
    monitor.registerCheck('flaky', {
      check: async () => ({
        status: healthy ? 'healthy' : 'unhealthy',
        latencyMs: 0,
      }),
    });

    await monitor.check();
    expect(monitor.getAlerts().filter((a) => !a.resolvedAt)).toHaveLength(1);

    healthy = true;
    await monitor.check();
    expect(monitor.getAlerts().filter((a) => !a.resolvedAt)).toHaveLength(0);
  });

  it('unregisters check', async () => {
    monitor.registerCheck('temp', {
      check: async () => ({ status: 'healthy', latencyMs: 0 }),
    });
    monitor.unregisterCheck('temp');
    const health = await monitor.check();
    expect(health.checks).toHaveLength(0);
  });

  it('getScore returns last score', async () => {
    expect(monitor.getScore()).toBe(100);
    monitor.registerCheck('x', {
      check: async () => ({ status: 'degraded', latencyMs: 0 }),
    });
    await monitor.check();
    expect(monitor.getScore()).toBe(50);
  });
});
