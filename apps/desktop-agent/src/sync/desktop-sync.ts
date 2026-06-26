import type { ActivityEntry } from '../types';

export interface SyncConfig {
  apiUrl: string;
  batchSize: number;
  flushIntervalMs: number;
  maxRetries: number;
}

interface QueueItem {
  entry: ActivityEntry;
  retries: number;
}

export class DesktopSync {
  private queue: QueueItem[] = [];
  private synced = 0;
  private failed = 0;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private config: SyncConfig;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = {
      apiUrl: config.apiUrl ?? 'http://localhost:3000',
      batchSize: config.batchSize ?? 20,
      flushIntervalMs: config.flushIntervalMs ?? 10000,
      maxRetries: config.maxRetries ?? 3,
    };
  }

  enqueue(entry: ActivityEntry): void {
    this.queue.push({ entry, retries: 0 });
    if (this.queue.length >= this.config.batchSize) {
      this.flush().catch(() => {});
    }
  }

  async flush(): Promise<number> {
    if (this.queue.length === 0) return 0;

    const batch = this.queue.splice(0, this.config.batchSize);
    const records = batch.map((item) => ({
      application: item.entry.app,
      window_title: item.entry.title,
      activity_type: 'focus',
      duration_seconds: item.entry.durationSeconds,
      recorded_at: item.entry.startedAt,
      metadata: {},
    }));

    try {
      const response = await fetch(`${this.config.apiUrl}/api/desktop/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      this.synced += batch.length;
      return batch.length;
    } catch {
      for (const item of batch) {
        if (item.retries < this.config.maxRetries) {
          item.retries++;
          this.queue.push(item);
        } else {
          this.failed++;
        }
      }
      return 0;
    }
  }

  start(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      this.flush().catch(() => {});
    }, this.config.flushIntervalMs);
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  getStats() {
    return {
      queued: this.queue.length,
      synced: this.synced,
      failed: this.failed,
    };
  }
}
