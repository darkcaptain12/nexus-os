import { describe, it, expect, beforeEach } from 'vitest';
import { SyncEngine } from '../src/sync-engine';
import { EventBridge, createDefaultMappings } from '../src/event-bridge';
import { NotionProvider } from '../src/providers/notion';
import { SlackProvider } from '../src/providers/slack';

describe('SyncEngine', () => {
  let engine: SyncEngine;

  beforeEach(() => {
    engine = new SyncEngine();
  });

  it('registers sync job', () => {
    const job = engine.register('github', 300000);
    expect(job.providerId).toBe('github');
    expect(job.status).toBe('idle');
    expect(job.intervalMs).toBe(300000);
  });

  it('lists jobs', () => {
    engine.register('github', 300000);
    engine.register('gmail', 600000);
    expect(engine.listJobs()).toHaveLength(2);
  });

  it('executes sync successfully', async () => {
    engine.register('test', 60000);
    engine.onSync(async () => ({
      providerId: 'test',
      success: true,
      itemsSynced: 5,
      error: null,
      durationMs: 0,
    }));
    const result = await engine.executeSync('test', 'incremental');
    expect(result.success).toBe(true);
    expect(result.itemsSynced).toBe(5);
  });

  it('handles sync failure with retry', async () => {
    engine.register('fail', 60000, 2);
    engine.onSync(async () => {
      throw new Error('network error');
    });
    const result = await engine.executeSync('fail', 'full');
    expect(result.success).toBe(false);
    const job = engine.getJob('fail');
    expect(job?.status).toBe('retrying');
    expect(job?.retryCount).toBe(1);
  });

  it('dead-letters after max retries', async () => {
    engine.register('dead', 60000, 1);
    engine.onSync(async () => {
      throw new Error('always fails');
    });
    await engine.executeSync('dead', 'incremental');
    await engine.executeSync('dead', 'incremental');
    expect(engine.getJob('dead')?.status).toBe('failed');
  });

  it('tracks metrics', async () => {
    engine.register('m', 60000);
    engine.onSync(async () => ({
      providerId: 'm',
      success: true,
      itemsSynced: 1,
      error: null,
      durationMs: 0,
    }));
    await engine.executeSync('m', 'incremental');
    const metrics = engine.getMetrics();
    expect(metrics.totalSyncs).toBe(1);
    expect(metrics.successfulSyncs).toBe(1);
  });

  it('records token refresh', () => {
    engine.recordTokenRefresh();
    expect(engine.getMetrics().tokenRefreshes).toBe(1);
  });

  it('start and stop', () => {
    engine.register('x', 60000);
    engine.start('x');
    engine.stop('x');
    expect(engine.listJobs()).toHaveLength(1);
  });
});

describe('EventBridge', () => {
  let bridge: EventBridge;

  beforeEach(() => {
    bridge = new EventBridge();
    for (const m of createDefaultMappings()) {
      bridge.registerMapping(m);
    }
  });

  it('has default mappings', () => {
    expect(bridge.getMappings().length).toBeGreaterThanOrEqual(4);
  });

  it('processes matching event', async () => {
    let called = false;
    bridge.onAction(async () => {
      called = true;
    });

    const result = await bridge.processEvent({
      provider: 'github',
      eventType: 'issues.opened',
      payload: { title: 'Bug fix', body: 'Description' },
      timestamp: new Date().toISOString(),
    });

    expect(result.matched).toBe(true);
    expect(result.action).toBe('task.create');
    expect(called).toBe(true);
  });

  it('ignores unmatched event', async () => {
    const result = await bridge.processEvent({
      provider: 'unknown',
      eventType: 'unknown',
      payload: {},
      timestamp: new Date().toISOString(),
    });
    expect(result.matched).toBe(false);
  });

  it('tracks processed count', async () => {
    bridge.onAction(async () => {});
    await bridge.processEvent({
      provider: 'github',
      eventType: 'issues.opened',
      payload: { title: 'a' },
      timestamp: '',
    });
    expect(bridge.getProcessedCount()).toBe(1);
  });
});

describe('New Providers', () => {
  it('NotionProvider has correct metadata', () => {
    const p = new NotionProvider();
    expect(p.metadata.id).toBe('notion');
    expect(p.metadata.category).toBe('storage');
    expect(p.getActions().length).toBe(4);
  });

  it('NotionProvider fails without auth', async () => {
    const p = new NotionProvider();
    const result = await p.execute('notion.search', { query: 'test' });
    expect(result.success).toBe(false);
  });

  it('SlackProvider has correct metadata', () => {
    const p = new SlackProvider();
    expect(p.metadata.id).toBe('slack');
    expect(p.metadata.category).toBe('social');
    expect(p.getActions().length).toBe(2);
  });

  it('SlackProvider fails without auth', async () => {
    const p = new SlackProvider();
    const result = await p.execute('slack.send', { channel: 'test', text: 'hi' });
    expect(result.success).toBe(false);
  });
});
