import { describe, it, expect } from 'vitest';
import { CircularBuffer } from '../src/services/circular-buffer';
import { ActivityTimelineService } from '../src/services/activity-timeline';

describe('Benchmark — 100,000 Timeline Event (real, in-memory)', () => {
  it('pushes 100,000 items through CircularBuffer', () => {
    const buf = new CircularBuffer<{ app: string; n: number }>(10000);
    const start = performance.now();
    for (let i = 0; i < 100000; i++) {
      buf.push({ app: `App${i % 50}`, n: i });
    }
    const durationMs = Math.round(performance.now() - start);

    // eslint-disable-next-line no-console
    console.log(
      `[BENCHMARK] CircularBuffer 100,000 push (capacity 10,000, wraps 9x): ${durationMs}ms`,
    );
    expect(buf.size).toBe(10000);
    expect(durationMs).toBeLessThan(2000);
  });

  it('runs 100,000 record() calls through ActivityTimelineService end-to-end', () => {
    const timeline = new ActivityTimelineService(300, 10000, 30);
    const apps = ['Code', 'Chrome', 'Slack', 'Terminal', 'Figma'];
    const start = performance.now();
    for (let i = 0; i < 100000; i++) {
      timeline.record({ app: apps[i % apps.length]!, title: `window-${i}`, pid: i });
    }
    const durationMs = Math.round(performance.now() - start);

    // eslint-disable-next-line no-console
    console.log(
      `[BENCHMARK] ActivityTimelineService.record x100,000 (real categorization + bounded buffer): ${durationMs}ms`,
    );
    expect(timeline.getEntryCount()).toBeLessThanOrEqual(10001);
  });
});
