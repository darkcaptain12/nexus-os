import { describe, it, expect, afterEach } from 'vitest';
import { createKernel, NexusKernel } from '../src/runtime/impl/kernel.impl';

describe('NexusKernel', () => {
  let kernel: NexusKernel;

  afterEach(async () => {
    if (kernel?.phase === 'running') {
      await kernel.shutdown();
    }
  });

  it('creates kernel with default config', () => {
    kernel = createKernel();
    expect(kernel.config.environment).toBeDefined();
    expect(kernel.phase).toBe('stopped');
  });

  it('boots successfully', async () => {
    kernel = createKernel();
    await kernel.boot();
    expect(kernel.phase).toBe('running');
  });

  it('registers core services on boot', async () => {
    kernel = createKernel();
    await kernel.boot();
    const services = kernel.services.list();
    expect(services.length).toBeGreaterThanOrEqual(8);
    expect(services.find((s) => s.id === 'events')).toBeDefined();
    expect(services.find((s) => s.id === 'commands')).toBeDefined();
  });

  it('all core services are running after boot', async () => {
    kernel = createKernel();
    await kernel.boot();
    const services = kernel.services.list();
    for (const svc of services) {
      expect(svc.status).toBe('running');
    }
  });

  it('getStatus returns complete status', async () => {
    kernel = createKernel();
    await kernel.boot();
    const status = kernel.getStatus();
    expect(status.version).toBe('0.1.0');
    expect(status.phase).toBe('running');
    expect(status.services.total).toBeGreaterThan(0);
    expect(status.health).toBeGreaterThanOrEqual(0);
  });

  it('dispatches commands through kernel port', async () => {
    kernel = createKernel();
    kernel.getCommandBus().registerHandler('test.cmd', {
      handle: async (cmd) => cmd.payload,
    });
    await kernel.boot();

    const result = await kernel.commands.dispatch({ type: 'test.cmd', payload: { x: 1 } });
    expect(result.success).toBe(true);
  });

  it('publishes and receives events through kernel port', async () => {
    kernel = createKernel();
    await kernel.boot();

    const received: unknown[] = [];
    kernel.events.subscribe('test.event', async (e) => { received.push(e); });
    await kernel.events.publish({ type: 'test.event', payload: { y: 2 } });

    expect(received).toHaveLength(1);
  });

  it('health check returns report', async () => {
    kernel = createKernel();
    await kernel.boot();
    const report = await kernel.health.check();
    expect(report.score).toBeGreaterThan(0);
    expect(report.status).toBeDefined();
    expect(report.checks.length).toBeGreaterThan(0);
  });

  it('state manager works through kernel port', async () => {
    kernel = createKernel();
    await kernel.boot();
    kernel.state.set('test.key', 'test.value');
    expect(kernel.state.get('test.key')).toBe('test.value');
  });

  it('shuts down gracefully', async () => {
    kernel = createKernel();
    await kernel.boot();
    await kernel.shutdown();
    expect(kernel.phase).toBe('stopped');
  });

  it('restarts successfully', async () => {
    kernel = createKernel();
    await kernel.boot();
    await kernel.restart();
    expect(kernel.phase).toBe('running');
  });
});
