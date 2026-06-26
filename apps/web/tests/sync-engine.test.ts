import { describe, it, expect, beforeEach } from 'vitest';
import { SyncEngine } from '../src/lib/sync/sync-engine';

describe('SyncEngine', () => {
  let engine: SyncEngine;

  beforeEach(() => {
    engine = new SyncEngine(null, 10);
  });

  it('enqueues items', () => {
    engine.enqueue('memories', 'insert', { content: 'test' });
    expect(engine.getQueueSize()).toBe(1);
  });

  it('tracks stats', () => {
    engine.enqueue('memories', 'insert', { content: 'a' });
    engine.enqueue('tasks', 'update', { id: '1', status: 'done' });
    const stats = engine.getStats();
    expect(stats.queued).toBe(2);
    expect(stats.synced).toBe(0);
    expect(stats.online).toBe(true);
  });

  it('flush with null db returns 0', async () => {
    engine.enqueue('memories', 'insert', { content: 'test' });
    const count = await engine.flush();
    expect(count).toBe(0);
  });

  it('setOnline updates status', () => {
    engine.setOnline(false);
    expect(engine.getStats().online).toBe(false);
  });

  it('clear resets state', () => {
    engine.enqueue('memories', 'insert', { content: 'a' });
    engine.enqueue('memories', 'insert', { content: 'b' });
    engine.clear();
    expect(engine.getQueueSize()).toBe(0);
    expect(engine.getStats().synced).toBe(0);
  });

  it('start and stop lifecycle', () => {
    engine.start(60000);
    engine.stop();
    expect(engine.getQueueSize()).toBe(0);
  });
});
