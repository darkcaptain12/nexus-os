import type {
  ActivityTimeline,
  FocusSession,
  DeepWorkSession,
  ProductivityMetrics,
  ProductivityScoreBreakdown,
  AppCategory,
} from '../types';
import { categorizeApp } from '../collectors/app-categorizer';

const DEEP_WORK_CATEGORIES = new Set<AppCategory>(['coding', 'writing', 'design', 'terminal']);
const DEEP_WORK_MAX_GAP_SECONDS = 90;
const DEEP_WORK_MIN_CONFIDENCE = 0.5;

export class ProductivityEngine {
  private focusThresholdSeconds: number;
  private deepWorkThresholdSeconds: number;

  constructor(focusThresholdSeconds = 120, deepWorkThresholdSeconds = 1800) {
    this.focusThresholdSeconds = focusThresholdSeconds;
    this.deepWorkThresholdSeconds = deepWorkThresholdSeconds;
  }

  calculate(timeline: ActivityTimeline): ProductivityMetrics {
    const { entries } = timeline;

    const appTotals = new Map<string, number>();
    const categoryTotals: Record<AppCategory, number> = {
      coding: 0,
      browsing: 0,
      communication: 0,
      meeting: 0,
      design: 0,
      writing: 0,
      terminal: 0,
      media: 0,
      system: 0,
      other: 0,
    };
    let contextSwitches = 0;
    let prevApp = '';

    for (const entry of entries) {
      const category = entry.category ?? categorizeApp(entry.app);
      appTotals.set(entry.app, (appTotals.get(entry.app) ?? 0) + entry.durationSeconds);
      categoryTotals[category] += entry.durationSeconds;
      if (prevApp && prevApp !== entry.app) contextSwitches++;
      prevApp = entry.app;
    }

    const focusSessions = this.detectFocusSessions(entries);
    const deepWorkSessions = this.detectDeepWork(entries);
    const deepWorkMinutes = Math.round(
      deepWorkSessions.reduce((s, d) => s + d.durationSeconds, 0) / 60,
    );

    const longestFocus = focusSessions.reduce(
      (max, s) => (s.durationSeconds > max.durationSeconds ? s : max),
      {
        app: '',
        startedAt: '',
        endedAt: '',
        durationSeconds: 0,
        interrupted: false,
        category: 'other' as AppCategory,
      },
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

    const { score, breakdown } = this.calculateScore({
      focusTimeSeconds,
      totalActiveSeconds,
      contextSwitches,
      longestFocusSeconds: longestFocus.durationSeconds,
      idleTimeSeconds: timeline.totalIdleSeconds,
      codingSeconds: categoryTotals['coding'] + categoryTotals['terminal'],
      meetingSeconds: categoryTotals['meeting'],
      deepWorkMinutes,
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
      deepWorkSessions,
      deepWorkMinutes,
      categoryBreakdown: categoryTotals,
      score,
      scoreBreakdown: breakdown,
    };
  }

  private detectFocusSessions(
    entries: { app: string; startedAt: string; endedAt?: string; durationSeconds: number }[],
  ): FocusSession[] {
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
            category: categorizeApp(currentApp),
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
        category: categorizeApp(currentApp),
      });
    }

    return sessions;
  }

  /**
   * Deep work = sustained focus in a productive category (coding/writing/design/terminal),
   * never interrupted by an idle gap > 90s, never meeting/passive-browsing categories.
   * Sessions with high app-switch density (fragmented attention) get a lower confidence
   * score and are dropped below DEEP_WORK_MIN_CONFIDENCE — "30 min same app" alone is
   * not sufficient if the user bounced between 10 windows to get there.
   */
  private detectDeepWork(
    entries: { app: string; startedAt: string; endedAt?: string; durationSeconds: number }[],
  ): DeepWorkSession[] {
    const sessions: DeepWorkSession[] = [];

    let sessionStart = '';
    let sessionEnd = '';
    let sessionDuration = 0;
    let sessionApps = new Set<string>();
    let sessionCategory: AppCategory = 'coding';
    let switchCount = 0;
    let prevApp = '';
    let prevEndMs: number | null = null;

    const entryEndMs = (entry: { startedAt: string; endedAt?: string; durationSeconds: number }) =>
      entry.endedAt
        ? new Date(entry.endedAt).getTime()
        : new Date(entry.startedAt).getTime() + entry.durationSeconds * 1000;

    const closeSession = () => {
      if (sessionDuration >= this.deepWorkThresholdSeconds) {
        const durationMinutes = sessionDuration / 60;
        const switchDensity = switchCount / Math.max(durationMinutes, 1);
        const confidence = Math.max(0, Math.min(1, 1 - switchDensity * 0.15));
        if (confidence >= DEEP_WORK_MIN_CONFIDENCE) {
          sessions.push({
            startedAt: sessionStart,
            endedAt: sessionEnd,
            durationSeconds: sessionDuration,
            apps: [...sessionApps],
            category: sessionCategory,
            switchCount,
            confidence: Math.round(confidence * 100) / 100,
          });
        }
      }
      sessionStart = '';
      sessionEnd = '';
      sessionDuration = 0;
      sessionApps = new Set();
      switchCount = 0;
      prevApp = '';
    };

    for (const entry of entries) {
      const category = categorizeApp(entry.app);
      const entryStartMs = new Date(entry.startedAt).getTime();
      const gapSeconds = prevEndMs !== null ? (entryStartMs - prevEndMs) / 1000 : 0;
      const endMs = entryEndMs(entry);

      if (!DEEP_WORK_CATEGORIES.has(category)) {
        closeSession();
        prevEndMs = null;
        continue;
      }

      if (sessionStart && gapSeconds > DEEP_WORK_MAX_GAP_SECONDS) {
        closeSession();
      }

      if (!sessionStart) {
        sessionStart = entry.startedAt;
        sessionCategory = category;
      }

      sessionDuration += entry.durationSeconds;
      if (prevApp && prevApp !== entry.app) switchCount++;
      sessionApps.add(entry.app);
      prevApp = entry.app;
      sessionEnd = entry.endedAt ?? new Date(endMs).toISOString();
      prevEndMs = endMs;
    }

    closeSession();
    return sessions;
  }

  private calculateScore(input: {
    focusTimeSeconds: number;
    totalActiveSeconds: number;
    contextSwitches: number;
    longestFocusSeconds: number;
    idleTimeSeconds: number;
    codingSeconds: number;
    meetingSeconds: number;
    deepWorkMinutes: number;
  }): { score: number; breakdown: ProductivityScoreBreakdown } {
    const emptyBreakdown: ProductivityScoreBreakdown = {
      focusComponent: 0,
      longestFocusBonus: 0,
      deepWorkBonus: 0,
      codingBonus: 0,
      baseline: 0,
      switchPenalty: 0,
      idlePenalty: 0,
      meetingSaturationPenalty: 0,
    };
    if (input.totalActiveSeconds === 0) return { score: 0, breakdown: emptyBreakdown };

    const focusRatio = input.focusTimeSeconds / input.totalActiveSeconds;
    const focusComponent = Math.round(focusRatio * 40 * 100) / 100;

    const longestFocusBonus = Math.round(Math.min(input.longestFocusSeconds / 60, 20) * 100) / 100;
    const deepWorkBonus = Math.round(Math.min(input.deepWorkMinutes / 30, 15) * 100) / 100;
    const codingRatio = input.codingSeconds / input.totalActiveSeconds;
    const codingBonus = Math.round(Math.min(codingRatio * 10, 10) * 100) / 100;
    const baseline = 25;

    const switchPenalty = Math.round(Math.min(input.contextSwitches * 2, 30) * 100) / 100;

    const idleRatio = input.idleTimeSeconds / (input.totalActiveSeconds + input.idleTimeSeconds);
    const idlePenalty = Math.round(idleRatio * 20 * 100) / 100;

    const meetingRatio = input.meetingSeconds / input.totalActiveSeconds;
    const meetingSaturationPenalty =
      meetingRatio > 0.4 ? Math.round((meetingRatio - 0.4) * 30 * 100) / 100 : 0;

    const raw =
      focusComponent +
      longestFocusBonus +
      deepWorkBonus +
      codingBonus +
      baseline -
      switchPenalty -
      idlePenalty -
      meetingSaturationPenalty;

    const score = Math.max(0, Math.min(100, Math.round(raw)));

    return {
      score,
      breakdown: {
        focusComponent,
        longestFocusBonus,
        deepWorkBonus,
        codingBonus,
        baseline,
        switchPenalty: -switchPenalty,
        idlePenalty: -idlePenalty,
        meetingSaturationPenalty: -meetingSaturationPenalty,
      },
    };
  }
}
