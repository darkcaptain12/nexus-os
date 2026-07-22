import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ActivityTimelineService } from '../src/services/activity-timeline';

describe('ActivityTimelineService', () => {
  let timeline: ActivityTimelineService;

  beforeEach(() => {
    timeline = new ActivityTimelineService(300);
  });

  it('records window activity', () => {
    timeline.record({ app: 'Code', title: 'main.ts', pid: 1 });
    expect(timeline.getEntryCount()).toBe(1);
    const result = timeline.getTimeline();
    expect(result.entries.length).toBe(1);
  });

  it('tracks app switch as new entry', () => {
    timeline.record({ app: 'Code', title: 'main.ts', pid: 1 });
    timeline.record({ app: 'Chrome', title: 'Google', pid: 2 });
    expect(timeline.getEntryCount()).toBe(2);
  });

  it('merges consecutive same-app entries', () => {
    timeline.record({ app: 'Code', title: 'file.ts', pid: 1 });
    timeline.record({ app: 'Code', title: 'file.ts', pid: 1 });
    expect(timeline.getEntryCount()).toBe(1);
  });

  it('tracks session start', () => {
    const result = timeline.getTimeline();
    expect(result.sessionStart).toBeDefined();
    expect(result.date).toBeDefined();
  });

  it('getRecentEntries returns last N entries', () => {
    timeline.record({ app: 'A', title: '1', pid: 1 });
    timeline.record({ app: 'B', title: '2', pid: 2 });
    timeline.record({ app: 'C', title: '3', pid: 3 });
    const recent = timeline.getRecentEntries(2);
    expect(recent.length).toBe(2);
  });

  it('handles null window as idle', () => {
    timeline.record({ app: 'Code', title: 'x', pid: 1 });
    timeline.record(null);
    expect(timeline.getEntryCount()).toBe(1);
  });

  it('reset clears state', () => {
    timeline.record({ app: 'A', title: '1', pid: 1 });
    timeline.reset();
    expect(timeline.getEntryCount()).toBe(0);
  });
});

describe('ActivityTimelineService — bounded memory', () => {
  it('caps entries at maxEntries (ring buffer)', () => {
    const bounded = new ActivityTimelineService(300, 5);
    for (let i = 0; i < 10; i++) {
      bounded.record({ app: `App${i}`, title: `t${i}`, pid: i });
    }
    // +1 allowed: the currently-open entry hasn't been pushed into the
    // bounded array yet, so closed-entry count stays <= maxEntries.
    expect(bounded.getEntryCount()).toBeLessThanOrEqual(6);
  });

  it('evicts oldest entries first', () => {
    const bounded = new ActivityTimelineService(300, 3);
    for (let i = 0; i < 6; i++) {
      bounded.record({ app: `App${i}`, title: `t${i}`, pid: i });
    }
    const recent = bounded.getRecentEntries(10);
    expect(recent.some((e) => e.app === 'App0')).toBe(false);
    expect(recent.some((e) => e.app === 'App5')).toBe(true);
  });

  it('exposes memory stats', () => {
    const bounded = new ActivityTimelineService(300, 100, 30);
    bounded.record({ app: 'Code', title: 'a', pid: 1 });
    bounded.record({ app: 'Chrome', title: 'b', pid: 2 });
    const stats = bounded.getMemoryStats();
    expect(stats.maxEntries).toBe(100);
    expect(stats.retentionDays).toBe(30);
    expect(stats.entryCount).toBeGreaterThan(0);
    expect(stats.estimatedBytes).toBeGreaterThan(0);
  });

  it('starts with zero daily summaries', () => {
    const bounded = new ActivityTimelineService();
    expect(bounded.getDailySummaries()).toHaveLength(0);
  });

  it('defaults to 10000 max entries when unspecified', () => {
    const defaultTimeline = new ActivityTimelineService(300);
    const stats = defaultTimeline.getMemoryStats();
    expect(stats.maxEntries).toBe(10000);
  });
});

describe('ActivityTimelineService — daily rotation', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('rotates entries into a daily summary at midnight boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-30T23:55:00.000Z'));

    const timeline = new ActivityTimelineService(300, 1000, 30);
    timeline.record({ app: 'Code', title: 'a', pid: 1 });

    vi.setSystemTime(new Date('2026-06-30T23:59:50.000Z'));
    timeline.record({ app: 'Chrome', title: 'b', pid: 2 });

    // Cross midnight
    vi.setSystemTime(new Date('2026-07-01T00:05:00.000Z'));
    timeline.record({ app: 'Slack', title: 'c', pid: 3 });

    const summaries = timeline.getDailySummaries();
    expect(summaries.length).toBe(1);
    expect(summaries[0]!.date).toBe('2026-06-30');
    expect(summaries[0]!.entryCount).toBeGreaterThan(0);

    const today = timeline.getTimeline();
    expect(today.date).toBe('2026-07-01');
    expect(today.entries.every((e) => e.app !== 'Code')).toBe(true);
  });

  it('caps daily summaries at retentionDays', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));
    const timeline = new ActivityTimelineService(300, 1000, 3);

    for (let day = 1; day <= 6; day++) {
      timeline.record({ app: 'Code', title: `day${day}`, pid: 1 });
      vi.setSystemTime(new Date(`2026-01-0${day + 1}T12:00:00.000Z`));
    }

    expect(timeline.getDailySummaries().length).toBeLessThanOrEqual(3);
  });
});
