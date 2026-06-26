import { describe, it, expect, beforeEach } from 'vitest';
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
