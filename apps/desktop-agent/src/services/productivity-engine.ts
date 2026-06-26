import type { ActivityTimeline, FocusSession, ProductivityMetrics } from '../types';

export class ProductivityEngine {
  private focusThresholdSeconds: number;

  constructor(focusThresholdSeconds = 120) {
    this.focusThresholdSeconds = focusThresholdSeconds;
  }

  calculate(timeline: ActivityTimeline): ProductivityMetrics {
    const { entries } = timeline;

    const appTotals = new Map<string, number>();
    let contextSwitches = 0;
    let prevApp = '';

    for (const entry of entries) {
      appTotals.set(entry.app, (appTotals.get(entry.app) ?? 0) + entry.durationSeconds);
      if (prevApp && prevApp !== entry.app) {
        contextSwitches++;
      }
      prevApp = entry.app;
    }

    const focusSessions = this.detectFocusSessions(entries);
    const longestFocus = focusSessions.reduce(
      (max, s) => (s.durationSeconds > max.durationSeconds ? s : max),
      { app: '', startedAt: '', endedAt: '', durationSeconds: 0, interrupted: false },
    );

    const totalActiveSeconds = timeline.totalActiveSeconds;
    const totalTimeSeconds = totalActiveSeconds + timeline.totalIdleSeconds;
    const focusTimeSeconds = focusSessions.reduce((sum, s) => sum + s.durationSeconds, 0);

    const topApps = [...appTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([app, seconds]) => ({
        app,
        seconds,
        percentage: totalActiveSeconds > 0 ? Math.round((seconds / totalActiveSeconds) * 100) : 0,
      }));

    const score = this.calculateScore({
      focusTimeSeconds,
      totalActiveSeconds,
      contextSwitches,
      longestFocusSeconds: longestFocus.durationSeconds,
      idleTimeSeconds: timeline.totalIdleSeconds,
    });

    return {
      date: timeline.date,
      focusTimeSeconds,
      idleTimeSeconds: timeline.totalIdleSeconds,
      totalTimeSeconds,
      contextSwitches,
      longestFocusSeconds: longestFocus.durationSeconds,
      longestFocusApp: longestFocus.app,
      topApps,
      focusSessions,
      score,
    };
  }

  private detectFocusSessions(entries: { app: string; startedAt: string; endedAt?: string; durationSeconds: number }[]): FocusSession[] {
    const sessions: FocusSession[] = [];
    let currentApp = '';
    let sessionStart = '';
    let sessionDuration = 0;

    for (const entry of entries) {
      if (entry.app === currentApp) {
        sessionDuration += entry.durationSeconds;
      } else {
        if (sessionDuration >= this.focusThresholdSeconds && currentApp) {
          sessions.push({
            app: currentApp,
            startedAt: sessionStart,
            endedAt: entry.startedAt,
            durationSeconds: sessionDuration,
            interrupted: false,
          });
        }
        currentApp = entry.app;
        sessionStart = entry.startedAt;
        sessionDuration = entry.durationSeconds;
      }
    }

    if (sessionDuration >= this.focusThresholdSeconds && currentApp) {
      sessions.push({
        app: currentApp,
        startedAt: sessionStart,
        endedAt: new Date().toISOString(),
        durationSeconds: sessionDuration,
        interrupted: false,
      });
    }

    return sessions;
  }

  private calculateScore(input: {
    focusTimeSeconds: number;
    totalActiveSeconds: number;
    contextSwitches: number;
    longestFocusSeconds: number;
    idleTimeSeconds: number;
  }): number {
    if (input.totalActiveSeconds === 0) return 0;

    const focusRatio = input.focusTimeSeconds / input.totalActiveSeconds;
    const switchPenalty = Math.min(input.contextSwitches * 2, 30);
    const focusBonus = Math.min(input.longestFocusSeconds / 60, 20);
    const idleRatio = input.idleTimeSeconds / (input.totalActiveSeconds + input.idleTimeSeconds);
    const idlePenalty = idleRatio * 20;

    const raw = focusRatio * 50 + focusBonus - switchPenalty - idlePenalty + 30;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }
}
