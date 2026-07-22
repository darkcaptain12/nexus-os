export type SyncMode = 'full' | 'incremental';
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'failed' | 'retrying';

export interface SyncJob {
  id: string;
  providerId: string;
  mode: SyncMode;
  status: SyncStatus;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  intervalMs: number;
  retryCount: number;
  maxRetries: number;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
}

export interface SyncResult {
  providerId: string;
  success: boolean;
  itemsSynced: number;
  error: string | null;
  durationMs: number;
}

export interface SyncMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalRetries: number;
  avgDurationMs: number;
  tokenRefreshes: number;
}

export class SyncEngine {
  private jobs = new Map<string, SyncJob>();
  private timers = new Map<string, ReturnType<typeof setInterval>>();
  private metrics: SyncMetrics = {
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    totalRetries: 0,
    avgDurationMs: 0,
    tokenRefreshes: 0,
  };
  private totalDurationMs = 0;
  private syncHandler: ((providerId: string, mode: SyncMode) => Promise<SyncResult>) | null = null;

  onSync(handler: (providerId: string, mode: SyncMode) => Promise<SyncResult>): void {
    this.syncHandler = handler;
  }

  register(providerId: string, intervalMs: number, maxRetries = 3): SyncJob {
    const job: SyncJob = {
      id: crypto.randomUUID(),
      providerId,
      mode: 'incremental',
      status: 'idle',
      lastSyncAt: null,
      nextSyncAt: new Date(Date.now() + intervalMs).toISOString(),
      intervalMs,
      retryCount: 0,
      maxRetries,
      error: null,
      startedAt: null,
      completedAt: null,
      durationMs: null,
    };
    this.jobs.set(providerId, job);
    return job;
  }

  start(providerId: string): void {
    const job = this.jobs.get(providerId);
    if (!job) return;

    if (this.timers.has(providerId)) return;

    const timer = setInterval(async () => {
      await this.executeSync(providerId, 'incremental');
    }, job.intervalMs);

    this.timers.set(providerId, timer);
  }

  stop(providerId: string): void {
    const timer = this.timers.get(providerId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(providerId);
    }
  }

  stopAll(): void {
    for (const providerId of this.timers.keys()) {
      this.stop(providerId);
    }
  }

  async executeSync(providerId: string, mode: SyncMode): Promise<SyncResult> {
    const job = this.jobs.get(providerId);
    if (!job)
      return { providerId, success: false, itemsSynced: 0, error: 'Job not found', durationMs: 0 };

    job.status = 'syncing';
    job.startedAt = new Date().toISOString();
    job.error = null;

    const start = performance.now();
    this.metrics.totalSyncs++;

    try {
      let result: SyncResult;
      if (this.syncHandler) {
        result = await this.syncHandler(providerId, mode);
      } else {
        result = { providerId, success: true, itemsSynced: 0, error: null, durationMs: 0 };
      }

      const durationMs = Math.round(performance.now() - start);
      result.durationMs = durationMs;

      if (result.success) {
        job.status = 'success';
        job.retryCount = 0;
        this.metrics.successfulSyncs++;
      } else {
        throw new Error(result.error ?? 'Sync failed');
      }

      job.completedAt = new Date().toISOString();
      job.lastSyncAt = job.completedAt;
      job.durationMs = durationMs;
      job.nextSyncAt = new Date(Date.now() + job.intervalMs).toISOString();

      this.totalDurationMs += durationMs;
      this.metrics.avgDurationMs = Math.round(this.totalDurationMs / this.metrics.totalSyncs);

      return result;
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      job.error = err instanceof Error ? err.message : String(err);
      job.durationMs = durationMs;
      job.completedAt = new Date().toISOString();

      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        job.status = 'retrying';
        this.metrics.totalRetries++;
        const backoffMs = Math.min(job.intervalMs, 1000 * Math.pow(2, job.retryCount));
        job.nextSyncAt = new Date(Date.now() + backoffMs).toISOString();
      } else {
        job.status = 'failed';
        this.metrics.failedSyncs++;
      }

      return { providerId, success: false, itemsSynced: 0, error: job.error, durationMs };
    }
  }

  getJob(providerId: string): SyncJob | undefined {
    return this.jobs.get(providerId);
  }

  listJobs(): SyncJob[] {
    return [...this.jobs.values()];
  }

  getMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  recordTokenRefresh(): void {
    this.metrics.tokenRefreshes++;
  }
}
