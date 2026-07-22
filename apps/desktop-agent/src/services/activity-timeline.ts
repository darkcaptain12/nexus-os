import type {
  ActiveWindow,
  ActivityEntry,
  ActivityTimeline,
  DailySummary,
  TimelineMemoryStats,
} from '../types';
import { categorizeApp } from '../collectors/app-categorizer';
import { CircularBuffer } from './circular-buffer';

const AVG_ENTRY_BYTES = 200;

export class ActivityTimelineService {
  private entries: CircularBuffer<ActivityEntry>;
  private currentEntry: ActivityEntry | null = null;
  private sessionStart: string;
  private lastActivityAt: string;
  private idleStart: number | null = null;
  private totalIdleSeconds = 0;
  private idleThresholdMs: number;
  private currentDay: string;
  private dailySummaries: CircularBuffer<DailySummary>;
  private retentionDays: number;

  constructor(idleThresholdSeconds = 300, maxEntries = 10000, retentionDays = 30) {
    this.sessionStart = new Date().toISOString();
    this.lastActivityAt = this.sessionStart;
    this.idleThresholdMs = idleThresholdSeconds * 1000;
    this.currentDay = this.sessionStart.split('T')[0]!;
    this.entries = new CircularBuffer<ActivityEntry>(maxEntries);
    this.retentionDays = retentionDays;
    this.dailySummaries = new CircularBuffer<DailySummary>(retentionDays);
  }

  getLastActivityAt(): string {
    return this.lastActivityAt;
  }

  record(window: ActiveWindow | null, meta?: { confidence?: number }): void {
    const now = new Date().toISOString();
    const today = now.split('T')[0]!;
    if (today !== this.currentDay) {
      this.rotateDay(today);
    }
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
      category: categorizeApp(window.app),
      source: 'window',
      confidence: meta?.confidence ?? 1,
    };
  }

  getTimeline(): ActivityTimeline {
    const allEntries = this.entries.toArray();
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
      date: this.currentDay,
      entries: allEntries,
      totalActiveSeconds,
      totalIdleSeconds: Math.round(this.totalIdleSeconds),
      sessionStart: this.sessionStart,
      sessionEnd: undefined,
    };
  }

  getRecentEntries(count: number): ActivityEntry[] {
    const all = this.entries.toArray();
    if (this.currentEntry) all.push(this.currentEntry);
    return all.slice(-count);
  }

  getEntryCount(): number {
    return this.entries.size + (this.currentEntry ? 1 : 0);
  }

  getDailySummaries(): DailySummary[] {
    return this.dailySummaries.toArray();
  }

  getMemoryStats(): TimelineMemoryStats {
    const entryCount = this.getEntryCount();
    return {
      entryCount,
      maxEntries: this.entries.maxCapacity,
      dailySummaryCount: this.dailySummaries.size,
      retentionDays: this.retentionDays,
      estimatedBytes: entryCount * AVG_ENTRY_BYTES,
    };
  }

  reset(): void {
    this.entries.clear();
    this.currentEntry = null;
    this.sessionStart = new Date().toISOString();
    this.currentDay = this.sessionStart.split('T')[0]!;
    this.dailySummaries.clear();
    this.totalIdleSeconds = 0;
    this.idleStart = null;
  }

  /**
   * Daily boundary crossed: finalize the open entry, collapse the day's raw
   * entries into a lightweight DailySummary (capacity-bound to retentionDays
   * via the ring buffer — oldest summary is overwritten once full), then
   * drop the raw entries. Raw events never persist past the current day —
   * detailed history of individual entries is the sync layer's job
   * (Supabase), not this in-memory service's.
   */
  private rotateDay(newDay: string): void {
    if (this.currentEntry) {
      this.currentEntry.endedAt = new Date().toISOString();
      this.entries.push(this.currentEntry);
      this.currentEntry = null;
    }

    if (this.entries.size > 0 || this.totalIdleSeconds > 0) {
      this.dailySummaries.push(
        this.buildDailySummary(this.currentDay, this.entries.toArray(), this.totalIdleSeconds),
      );
    }

    this.entries.clear();
    this.totalIdleSeconds = 0;
    this.idleStart = null;
    this.currentDay = newDay;
  }

  private buildDailySummary(
    date: string,
    entries: ActivityEntry[],
    idleSeconds: number,
  ): DailySummary {
    const appTotals = new Map<string, number>();
    for (const entry of entries) {
      appTotals.set(entry.app, (appTotals.get(entry.app) ?? 0) + entry.durationSeconds);
    }
    const topApps = [...appTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([app, seconds]) => ({ app, seconds }));

    return {
      date,
      totalActiveSeconds: entries.reduce((sum, e) => sum + e.durationSeconds, 0),
      totalIdleSeconds: Math.round(idleSeconds),
      entryCount: entries.length,
      topApps,
    };
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
