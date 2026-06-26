import { describe, it, expect, beforeEach } from 'vitest';
import { DesktopSync } from '../src/sync/desktop-sync';

describe('DesktopSync', () => {
  let sync: DesktopSync;

  beforeEach(() => {
    sync = new DesktopSync({ batchSize: 5, maxRetries: 2 });
  });

  it('enqueues entries', () => {
    sync.enqueue({
      app: 'Code',
      title: 'main.ts',
      startedAt: new Date().toISOString(),
      durationSeconds: 120,
    });
    expect(sync.getStats().queued).toBe(1);
  });

  it('flush with no server returns 0', async () => {
    sync.enqueue({
      app: 'Chrome',
      title: 'GitHub',
      startedAt: new Date().toISOString(),
      durationSeconds: 60,
    });
    const count = await sync.flush();
    expect(count).toBe(0);
  });

  it('tracks failed count after retries exhausted', async () => {
    for (let i = 0; i < 3; i++) {
      sync.enqueue({
        app: 'Test',
        title: `Entry ${i}`,
        startedAt: new Date().toISOString(),
        durationSeconds: 10,
      });
    }

    await sync.flush();
    await sync.flush();
    await sync.flush();

    const stats = sync.getStats();
    expect(stats.failed).toBeGreaterThan(0);
  });

  it('start and stop lifecycle', () => {
    sync.start();
    sync.stop();
    expect(sync.getStats().queued).toBe(0);
  });
});
