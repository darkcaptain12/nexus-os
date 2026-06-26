import { describe, it, expect } from 'vitest';
import { ProductivityEngine } from '../src/services/productivity-engine';
import type { ActivityTimeline } from '../src/types';

function makeTimeline(entries: { app: string; duration: number }[], idleSeconds = 0): ActivityTimeline {
  let offset = 0;
  const mapped = entries.map((e) => {
    const start = new Date(Date.now() - 3600000 + offset * 1000).toISOString();
    offset += e.duration;
    return {
      app: e.app,
      title: `${e.app} window`,
      startedAt: start,
      endedAt: new Date(Date.now() - 3600000 + offset * 1000).toISOString(),
      durationSeconds: e.duration,
    };
  });

  return {
    date: new Date().toISOString().split('T')[0]!,
    entries: mapped,
    totalActiveSeconds: mapped.reduce((s, e) => s + e.durationSeconds, 0),
    totalIdleSeconds: idleSeconds,
    sessionStart: mapped[0]?.startedAt ?? new Date().toISOString(),
  };
}

describe('ProductivityEngine', () => {
  const engine = new ProductivityEngine(60);

  it('calculates zero score for empty timeline', () => {
    const result = engine.calculate(makeTimeline([]));
    expect(result.score).toBe(0);
    expect(result.contextSwitches).toBe(0);
  });

  it('counts context switches', () => {
    const result = engine.calculate(makeTimeline([
      { app: 'Code', duration: 100 },
      { app: 'Chrome', duration: 50 },
      { app: 'Code', duration: 100 },
      { app: 'Slack', duration: 30 },
    ]));
    expect(result.contextSwitches).toBe(3);
  });

  it('detects focus sessions above threshold', () => {
    const result = engine.calculate(makeTimeline([
      { app: 'Code', duration: 300 },
      { app: 'Chrome', duration: 30 },
      { app: 'Code', duration: 200 },
    ]));
    expect(result.focusSessions.length).toBeGreaterThanOrEqual(1);
    expect(result.longestFocusApp).toBe('Code');
  });

  it('ranks top apps by usage', () => {
    const result = engine.calculate(makeTimeline([
      { app: 'Code', duration: 300 },
      { app: 'Chrome', duration: 200 },
      { app: 'Slack', duration: 50 },
    ]));
    expect(result.topApps[0]!.app).toBe('Code');
    expect(result.topApps[1]!.app).toBe('Chrome');
    expect(result.topApps[0]!.percentage).toBeGreaterThan(result.topApps[1]!.percentage);
  });

  it('calculates higher score for focused work', () => {
    const focused = engine.calculate(makeTimeline([{ app: 'Code', duration: 3600 }]));
    const scattered = engine.calculate(makeTimeline([
      { app: 'A', duration: 60 }, { app: 'B', duration: 60 },
      { app: 'C', duration: 60 }, { app: 'D', duration: 60 },
      { app: 'E', duration: 60 }, { app: 'F', duration: 60 },
    ]));
    expect(focused.score).toBeGreaterThan(scattered.score);
  });

  it('penalizes high idle time', () => {
    const active = engine.calculate(makeTimeline([{ app: 'Code', duration: 300 }], 0));
    const idle = engine.calculate(makeTimeline([{ app: 'Code', duration: 300 }], 3600));
    expect(active.score).toBeGreaterThanOrEqual(idle.score);
  });

  it('score is between 0 and 100', () => {
    const result = engine.calculate(makeTimeline([
      { app: 'Code', duration: 7200 },
    ]));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('includes total time calculation', () => {
    const result = engine.calculate(makeTimeline([{ app: 'X', duration: 100 }], 50));
    expect(result.totalTimeSeconds).toBe(150);
    expect(result.focusTimeSeconds).toBeLessThanOrEqual(result.totalTimeSeconds);
  });
});
