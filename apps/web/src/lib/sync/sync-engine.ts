import type { SupabaseClient } from '@supabase/supabase-js';

export interface SyncItem {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
}

export interface SyncStats {
  queued: number;
  synced: number;
  failed: number;
  lastSyncAt: string | null;
  online: boolean;
}

export class SyncEngine {
  private queue: SyncItem[] = [];
  private synced = 0;
  private failed = 0;
  private lastSyncAt: string | null = null;
  private batchSize: number;
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private db: SupabaseClient | null;
  private online = true;

  constructor(db: SupabaseClient | null, batchSize = 50) {
    this.db = db;
    this.batchSize = batchSize;
  }

  enqueue(table: string, operation: SyncItem['operation'], data: Record<string, unknown>): void {
    this.queue.push({
      id: crypto.randomUUID(),
      table,
      operation,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3,
    });

    if (this.queue.length >= this.batchSize) {
      this.flush().catch(() => {});
    }
  }

  async flush(): Promise<number> {
    if (!this.db || this.queue.length === 0) return 0;

    const batch = this.queue.splice(0, this.batchSize);
    const grouped = new Map<string, SyncItem[]>();

    for (const item of batch) {
      const key = `${item.table}:${item.operation}`;
      const group = grouped.get(key) ?? [];
      group.push(item);
      grouped.set(key, group);
    }

    let successCount = 0;

    for (const [key, items] of grouped) {
      const [table, operation] = key.split(':');
      try {
        if (operation === 'insert') {
          const { error } = await this.db
            .from(table!)
            .insert(items.map((i) => i.data));
          if (error) throw error;
        } else if (operation === 'update') {
          for (const item of items) {
            const { id, ...rest } = item.data;
            const { error } = await this.db
              .from(table!)
              .update(rest)
              .eq('id', id);
            if (error) throw error;
          }
        }
        successCount += items.length;
        this.synced += items.length;
      } catch {
        for (const item of items) {
          if (item.retryCount < item.maxRetries) {
            item.retryCount++;
            this.queue.push(item);
          } else {
            this.failed++;
          }
        }
      }
    }

    if (successCount > 0) {
      this.lastSyncAt = new Date().toISOString();
    }

    return successCount;
  }

  start(intervalMs = 5000): void {
    if (this.flushInterval) return;
    this.flushInterval = setInterval(() => {
      this.flush().catch(() => {});
    }, intervalMs);
  }

  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  async drain(): Promise<void> {
    while (this.queue.length > 0) {
      await this.flush();
    }
  }

  setOnline(online: boolean): void {
    this.online = online;
  }

  getStats(): SyncStats {
    return {
      queued: this.queue.length,
      synced: this.synced,
      failed: this.failed,
      lastSyncAt: this.lastSyncAt,
      online: this.online,
    };
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
    this.synced = 0;
    this.failed = 0;
  }
}
