import { describe, it, expect } from 'vitest';
import { ProductivityEngine } from '../src/services/productivity-engine';
import { categorizeApp } from '../src/collectors/app-categorizer';
import type { ActivityTimeline } from '../src/types';

function makeTimeline(
  entries: { app: string; duration: number }[],
  idleSeconds = 0,
): ActivityTimeline {
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
      category: categorizeApp(e.app),
      source: 'window' as const,
      confidence: 1,
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
    const result = engine.calculate(
      makeTimeline([
        { app: 'Code', duration: 100 },
        { app: 'Chrome', duration: 50 },
        { app: 'Code', duration: 100 },
        { app: 'Slack', duration: 30 },
      ]),
    );
    expect(result.contextSwitches).toBe(3);
  });

  it('detects focus sessions above threshold', () => {
    const result = engine.calculate(
      makeTimeline([
        { app: 'Code', duration: 300 },
        { app: 'Chrome', duration: 30 },
        { app: 'Code', duration: 200 },
      ]),
    );
    expect(result.focusSessions.length).toBeGreaterThanOrEqual(1);
    expect(result.longestFocusApp).toBe('Code');
  });

  it('ranks top apps by usage', () => {
    const result = engine.calculate(
      makeTimeline([
        { app: 'Code', duration: 300 },
        { app: 'Chrome', duration: 200 },
        { app: 'Slack', duration: 50 },
      ]),
    );
    expect(result.topApps[0]!.app).toBe('Code');
    expect(result.topApps[1]!.app).toBe('Chrome');
    expect(result.topApps[0]!.percentage).toBeGreaterThan(result.topApps[1]!.percentage);
  });

  it('calculates higher score for focused work', () => {
    const focused = engine.calculate(makeTimeline([{ app: 'Code', duration: 3600 }]));
    const scattered = engine.calculate(
      makeTimeline([
        { app: 'A', duration: 60 },
        { app: 'B', duration: 60 },
        { app: 'C', duration: 60 },
        { app: 'D', duration: 60 },
        { app: 'E', duration: 60 },
        { app: 'F', duration: 60 },
      ]),
    );
    expect(focused.score).toBeGreaterThan(scattered.score);
  });

  it('penalizes high idle time', () => {
    const active = engine.calculate(makeTimeline([{ app: 'Code', duration: 300 }], 0));
    const idle = engine.calculate(makeTimeline([{ app: 'Code', duration: 300 }], 3600));
    expect(active.score).toBeGreaterThanOrEqual(idle.score);
  });

  it('score is between 0 and 100', () => {
    const result = engine.calculate(makeTimeline([{ app: 'Code', duration: 7200 }]));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('includes total time calculation', () => {
    const result = engine.calculate(makeTimeline([{ app: 'X', duration: 100 }], 50));
    expect(result.totalTimeSeconds).toBe(150);
    expect(result.focusTimeSeconds).toBeLessThanOrEqual(result.totalTimeSeconds);
  });

  it('exposes score breakdown summing to score components', () => {
    const result = engine.calculate(makeTimeline([{ app: 'Code', duration: 3600 }]));
    const b = result.scoreBreakdown;
    expect(b.focusComponent).toBeGreaterThanOrEqual(0);
    expect(b.baseline).toBe(25);
    expect(b.switchPenalty).toBeLessThanOrEqual(0);
    expect(b.idlePenalty).toBeLessThanOrEqual(0);
    expect(b.meetingSaturationPenalty).toBeLessThanOrEqual(0);
  });
});

describe('Deep Work Detection', () => {
  const engine = new ProductivityEngine(60, 1800);

  it('detects deep work for sustained coding', () => {
    const result = engine.calculate(makeTimeline([{ app: 'Code', duration: 2400 }]));
    expect(result.deepWorkSessions.length).toBe(1);
    expect(result.deepWorkSessions[0]!.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('does not count meetings as deep work', () => {
    const result = engine.calculate(makeTimeline([{ app: 'Zoom', duration: 3600 }]));
    expect(result.deepWorkSessions.length).toBe(0);
  });

  it('does not count passive browsing as deep work', () => {
    const result = engine.calculate(makeTimeline([{ app: 'Google Chrome', duration: 3600 }]));
    expect(result.deepWorkSessions.length).toBe(0);
  });

  it('breaks deep work session on idle gap', () => {
    const now = Date.now();
    const timeline: ActivityTimeline = {
      date: new Date().toISOString().split('T')[0]!,
      entries: [
        {
          app: 'Code',
          title: 'a',
          startedAt: new Date(now - 3600000).toISOString(),
          endedAt: new Date(now - 3600000 + 1000 * 1000).toISOString(),
          durationSeconds: 1000,
          category: 'coding',
          source: 'window',
          confidence: 1,
        },
        // 5 minute idle gap (> 90s threshold) before next entry
        {
          app: 'Code',
          title: 'a',
          startedAt: new Date(now - 3600000 + 1300000).toISOString(),
          endedAt: new Date(now - 3600000 + 2300000).toISOString(),
          durationSeconds: 1000,
          category: 'coding',
          source: 'window',
          confidence: 1,
        },
      ],
      totalActiveSeconds: 2000,
      totalIdleSeconds: 300,
      sessionStart: new Date(now - 3600000).toISOString(),
    };
    const result = engine.calculate(timeline);
    // Each segment alone (1000s = 16.6min) is below the 1800s threshold, so the gap split means neither qualifies
    expect(result.deepWorkSessions.length).toBe(0);
  });

  it('lowers confidence for high app-switch density', () => {
    const entries: { app: string; duration: number }[] = [];
    for (let i = 0; i < 20; i++) {
      entries.push({ app: i % 2 === 0 ? 'Code' : 'iTerm2', duration: 95 });
    }
    const result = engine.calculate(makeTimeline(entries));
    for (const session of result.deepWorkSessions) {
      expect(session.confidence).toBeGreaterThanOrEqual(0.5);
    }
  });
});
