import type { AgentConfig, DesktopStatus, ActiveWindow } from '../types';
import { DEFAULT_CONFIG } from '../types';
import { getActiveWindow } from '../collectors/window-collector';
import { getSystemInfo } from '../collectors/system-collector';
import { detectIDE } from '../collectors/ide-collector';
import { detectBrowser } from '../collectors/browser-collector';
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

  constructor(config?: Partial<AgentConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.timeline = new ActivityTimelineService(this.config.idleThresholdSeconds);
    this.productivity = new ProductivityEngine(this.config.focusThresholdSeconds);
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

  async getStatus(): Promise<DesktopStatus> {
    const window = this.lastWindow;
    const systemInfo = getSystemInfo();
    const timelineData = this.timeline.getTimeline();
    const productivityData = this.productivity.calculate(timelineData);
    const ideState = this.config.collectIDE ? detectIDE(window) : null;
    const browserState = this.config.collectBrowser ? detectBrowser(window) : null;

    return {
      activeWindow: window,
      systemInfo,
      ideState,
      browserState,
      productivity: productivityData,
      uptime: Math.round((Date.now() - this.startedAt) / 1000),
      collecting: this.collecting,
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
      .map(([app, seconds]) => ({ app, seconds }))
      .sort((a, b) => b.seconds - a.seconds);
  }

  private async poll(): Promise<void> {
    try {
      const window = await getActiveWindow();
      this.lastWindow = window;
      this.timeline.record(window);

      if (window) {
        this.sync.enqueue({
          app: window.app,
          title: window.title,
          startedAt: new Date().toISOString(),
          durationSeconds: Math.round(this.config.pollIntervalMs / 1000),
        });
      }
    } catch {
      this.timeline.record(null);
    }
  }
}
