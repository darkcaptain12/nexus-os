import type { AgentConfig, DesktopStatus, ActiveWindow } from '../types';
import { DEFAULT_CONFIG } from '../types';
import { getActiveWindow } from '../collectors/window-collector';
import { getSystemInfo } from '../collectors/system-collector';
import { detectIDE } from '../collectors/ide-collector';
import { detectBrowser } from '../collectors/browser-collector';
import { categorizeApp, shouldTrackWindow } from '../collectors/app-categorizer';
import { containsSensitiveData, maskSensitiveData } from '../privacy/sanitizer';
import { ActivityTimelineService } from './activity-timeline';
import { ProductivityEngine } from './productivity-engine';
import { DesktopSync } from '../sync/desktop-sync';

export class DesktopAgent {
  private config: AgentConfig;
  private timeline: ActivityTimelineService;
  private productivity: ProductivityEngine;
  private sync: DesktopSync;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private lastWindow: ActiveWindow | null = null;
  private collecting = false;
  private startedAt: number;
  private lastCpuUsage: ReturnType<typeof process.cpuUsage> | null = null;
  private lastCpuCheckedAt: number | null = null;

  constructor(config?: Partial<AgentConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.timeline = new ActivityTimelineService(
      this.config.idleThresholdSeconds,
      this.config.maxTimelineEntries,
      this.config.timelineRetentionDays,
    );
    this.productivity = new ProductivityEngine(
      this.config.focusThresholdSeconds,
      this.config.deepWorkThresholdSeconds,
    );
    this.sync = new DesktopSync({
      apiUrl: process.env.NEXUS_API_URL ?? 'http://localhost:3000',
      batchSize: 20,
      flushIntervalMs: 15000,
      maxRetries: 3,
    });
    this.startedAt = Date.now();
  }

  start(): void {
    if (this.collecting) return;
    this.collecting = true;
    this.startedAt = Date.now();
    this.pollInterval = setInterval(() => this.poll(), this.config.pollIntervalMs);
    this.sync.start();
    this.poll();
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.sync.stop();
    this.collecting = false;
  }

  getSyncStats() {
    return this.sync.getStats();
  }

  getTimelineMemoryStats() {
    return this.timeline.getMemoryStats();
  }

  /**
   * Real process.memoryUsage()/process.cpuUsage() — the standalone
   * agent process's own footprint, not the parent Next.js server's.
   * cpuPercent is delta-sampled between calls; first call returns null
   * (no prior sample yet).
   */
  getProcessMetrics() {
    const mem = process.memoryUsage();
    const now = Date.now();
    const currentCpu = process.cpuUsage();

    let cpuPercent: number | null = null;
    if (this.lastCpuUsage && this.lastCpuCheckedAt) {
      const elapsedMs = now - this.lastCpuCheckedAt;
      if (elapsedMs > 0) {
        const deltaMs =
          (currentCpu.user -
            this.lastCpuUsage.user +
            currentCpu.system -
            this.lastCpuUsage.system) /
          1000;
        cpuPercent = Math.round((deltaMs / elapsedMs) * 100 * 100) / 100;
      }
    }
    this.lastCpuUsage = currentCpu;
    this.lastCpuCheckedAt = now;

    return {
      rssBytes: mem.rss,
      heapUsedBytes: mem.heapUsed,
      heapTotalBytes: mem.heapTotal,
      externalBytes: mem.external,
      cpuPercent,
      uptimeSeconds: Math.round((now - this.startedAt) / 1000),
    };
  }

  getDailySummaries() {
    return this.timeline.getDailySummaries();
  }

  getPrivacyConfig() {
    return this.config.privacy;
  }

  updatePrivacy(updates: Partial<typeof this.config.privacy>): void {
    this.config.privacy = { ...this.config.privacy, ...updates };
  }

  async getStatus(): Promise<DesktopStatus> {
    const window = this.lastWindow;
    const systemInfo = getSystemInfo();
    const timelineData = this.timeline.getTimeline();
    const productivityData = this.productivity.calculate(timelineData);
    const ideState =
      this.config.collectIDE && this.config.privacy.ideTracking ? detectIDE(window) : null;
    const browserState =
      this.config.collectBrowser && this.config.privacy.browserTracking
        ? detectBrowser(window)
        : null;

    return {
      activeWindow: window,
      systemInfo,
      ideState,
      browserState,
      productivity: productivityData,
      uptime: Math.round((Date.now() - this.startedAt) / 1000),
      collecting: this.collecting,
      privacyConfig: this.config.privacy,
    };
  }

  getTimeline() {
    return this.timeline.getTimeline();
  }

  getProductivity() {
    return this.productivity.calculate(this.timeline.getTimeline());
  }

  getRecentActivity(count = 10) {
    return this.timeline.getRecentEntries(count);
  }

  getAppUsage() {
    const timeline = this.timeline.getTimeline();
    const appMap = new Map<string, number>();
    for (const entry of timeline.entries) {
      appMap.set(entry.app, (appMap.get(entry.app) ?? 0) + entry.durationSeconds);
    }
    return [...appMap.entries()]
      .map(([app, seconds]) => ({ app, seconds, category: categorizeApp(app) }))
      .sort((a, b) => b.seconds - a.seconds);
  }

  getFocusData() {
    const productivity = this.getProductivity();
    return {
      focusTimeMinutes: Math.round(productivity.focusTimeSeconds / 60),
      deepWorkMinutes: productivity.deepWorkMinutes,
      contextSwitches: productivity.contextSwitches,
      longestFocusMinutes: Math.round(productivity.longestFocusSeconds / 60),
      longestFocusApp: productivity.longestFocusApp,
      focusSessions: productivity.focusSessions,
      deepWorkSessions: productivity.deepWorkSessions,
      categoryBreakdown: productivity.categoryBreakdown,
      score: productivity.score,
    };
  }

  private async poll(): Promise<void> {
    if (!this.config.privacy.windowTracking) {
      this.timeline.record(null);
      return;
    }

    try {
      const window = await getActiveWindow();

      if (
        window &&
        !shouldTrackWindow(window.app, window.title, this.config.privacy.sensitiveAppBlacklist)
      ) {
        this.lastWindow = { app: window.app, title: '[redacted]', pid: window.pid };
        this.timeline.record(this.lastWindow, { confidence: 0.3 });
        return;
      }

      if (!window) {
        this.lastWindow = null;
        this.timeline.record(null);
        return;
      }

      const sensitive = containsSensitiveData(window.title);
      const safeWindow: ActiveWindow = sensitive
        ? { ...window, title: maskSensitiveData(window.title) }
        : window;

      this.lastWindow = safeWindow;
      this.timeline.record(safeWindow, { confidence: sensitive ? 0.5 : 1 });

      this.sync.enqueue({
        app: safeWindow.app,
        title: safeWindow.title,
        startedAt: new Date().toISOString(),
        durationSeconds: Math.round(this.config.pollIntervalMs / 1000),
        category: categorizeApp(safeWindow.app),
        source: 'window',
        confidence: sensitive ? 0.5 : 1,
      });
    } catch {
      this.timeline.record(null);
    }
  }
}
