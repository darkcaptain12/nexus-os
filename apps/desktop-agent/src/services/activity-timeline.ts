import type { ActiveWindow, ActivityEntry, ActivityTimeline } from '../types';

export class ActivityTimelineService {
  private entries: ActivityEntry[] = [];
  private currentEntry: ActivityEntry | null = null;
  private sessionStart: string;
  private lastActivityAt: string;
  private idleStart: number | null = null;
  private totalIdleSeconds = 0;
  private idleThresholdMs: number;

  constructor(idleThresholdSeconds = 300) {
    this.sessionStart = new Date().toISOString();
    this.lastActivityAt = this.sessionStart;
    this.idleThresholdMs = idleThresholdSeconds * 1000;
  }

  record(window: ActiveWindow | null): void {
    const now = new Date().toISOString();
    this.lastActivityAt = now;

    if (!window) {
      this.handleIdle(now);
      return;
    }

    if (this.idleStart) {
      const idleDuration = (Date.now() - this.idleStart) / 1000;
      this.totalIdleSeconds += idleDuration;
      this.idleStart = null;
    }

    const appKey = `${window.app}::${window.title}`;
    const currentKey = this.currentEntry
      ? `${this.currentEntry.app}::${this.currentEntry.title}`
      : null;

    if (currentKey === appKey) {
      this.currentEntry!.durationSeconds = Math.round(
        (new Date(now).getTime() - new Date(this.currentEntry!.startedAt).getTime()) / 1000,
      );
      return;
    }

    if (this.currentEntry) {
      this.currentEntry.endedAt = now;
      this.currentEntry.durationSeconds = Math.round(
        (new Date(now).getTime() - new Date(this.currentEntry.startedAt).getTime()) / 1000,
      );
      this.entries.push(this.currentEntry);
    }

    this.currentEntry = {
      app: window.app,
      title: window.title,
      startedAt: now,
      durationSeconds: 0,
    };
  }

  getTimeline(): ActivityTimeline {
    const allEntries = [...this.entries];
    if (this.currentEntry) {
      allEntries.push({
        ...this.currentEntry,
        durationSeconds: Math.round(
          (Date.now() - new Date(this.currentEntry.startedAt).getTime()) / 1000,
        ),
      });
    }

    const totalActiveSeconds = allEntries.reduce((sum, e) => sum + e.durationSeconds, 0);

    return {
      date: new Date().toISOString().split('T')[0]!,
      entries: allEntries,
      totalActiveSeconds,
      totalIdleSeconds: Math.round(this.totalIdleSeconds),
      sessionStart: this.sessionStart,
      sessionEnd: undefined,
    };
  }

  getRecentEntries(count: number): ActivityEntry[] {
    const all = [...this.entries];
    if (this.currentEntry) all.push(this.currentEntry);
    return all.slice(-count);
  }

  getEntryCount(): number {
    return this.entries.length + (this.currentEntry ? 1 : 0);
  }

  reset(): void {
    this.entries = [];
    this.currentEntry = null;
    this.sessionStart = new Date().toISOString();
    this.totalIdleSeconds = 0;
    this.idleStart = null;
  }

  private handleIdle(now: string): void {
    if (!this.idleStart) {
      this.idleStart = Date.now();
    }

    if (this.currentEntry && Date.now() - this.idleStart > this.idleThresholdMs) {
      this.currentEntry.endedAt = now;
      this.entries.push(this.currentEntry);
      this.currentEntry = null;
    }
  }
}
