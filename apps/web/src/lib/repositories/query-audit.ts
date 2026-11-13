const SLOW_QUERY_THRESHOLD_MS = 200;
const N_PLUS_ONE_WINDOW_MS = 1000;
const N_PLUS_ONE_THRESHOLD = 5;
const MAX_LOG_SIZE = 500;
const MAX_PER_TABLE_SAMPLES = 200;

export interface QueryLogEntry {
  table: string;
  operation: string;
  durationMs: number;
  timestamp: string;
  slow: boolean;
}

export interface NPlusOneSuspect {
  signature: string;
  count: number;
  windowMs: number;
}

export interface RepositoryHeatmapEntry {
  table: string;
  queryCount: number;
  avgDurationMs: number;
  p95Ms: number;
  p99Ms: number;
  slowQueryCount: number;
}

class QueryAuditor {
  private log: QueryLogEntry[] = [];
  private recentCalls: { signature: string; at: number }[] = [];
  private totalQueries = 0;
  private totalDurationMs = 0;
  private perTable = new Map<
    string,
    { durations: number[]; count: number; totalMs: number; slowCount: number }
  >();

  record(table: string, operation: string, durationMs: number): void {
    this.totalQueries++;
    this.totalDurationMs += durationMs;

    const slow = durationMs > SLOW_QUERY_THRESHOLD_MS;
    this.log.push({ table, operation, durationMs, timestamp: new Date().toISOString(), slow });
    if (this.log.length > MAX_LOG_SIZE) {
      this.log = this.log.slice(-MAX_LOG_SIZE / 2);
    }

    const tableStats = this.perTable.get(table) ?? {
      durations: [],
      count: 0,
      totalMs: 0,
      slowCount: 0,
    };
    tableStats.count++;
    tableStats.totalMs += durationMs;
    if (slow) tableStats.slowCount++;
    tableStats.durations.push(durationMs);
    if (tableStats.durations.length > MAX_PER_TABLE_SAMPLES) {
      tableStats.durations = tableStats.durations.slice(-MAX_PER_TABLE_SAMPLES);
    }
    this.perTable.set(table, tableStats);

    const now = Date.now();
    const signature = `${table}:${operation}`;
    this.recentCalls.push({ signature, at: now });
    this.recentCalls = this.recentCalls.filter((c) => now - c.at <= N_PLUS_ONE_WINDOW_MS);
  }

  getSlowQueries(limit = 20): QueryLogEntry[] {
    return this.log
      .filter((e) => e.slow)
      .slice(-limit)
      .reverse();
  }

  /** Top N slowest individual queries across the whole log, regardless of table. */
  getTopSlowest(limit = 20): QueryLogEntry[] {
    return [...this.log].sort((a, b) => b.durationMs - a.durationMs).slice(0, limit);
  }

  getNPlusOneSuspects(): NPlusOneSuspect[] {
    const counts = new Map<string, number>();
    for (const call of this.recentCalls) {
      counts.set(call.signature, (counts.get(call.signature) ?? 0) + 1);
    }
    return [...counts.entries()]
      .filter(([, count]) => count >= N_PLUS_ONE_THRESHOLD)
      .map(([signature, count]) => ({ signature, count, windowMs: N_PLUS_ONE_WINDOW_MS }));
  }

  /** Per-repository (table) breakdown: count, avg, p95, p99, slow count — for the heatmap view. */
  getHeatmap(): RepositoryHeatmapEntry[] {
    const entries: RepositoryHeatmapEntry[] = [];
    for (const [table, stats] of this.perTable) {
      const sorted = [...stats.durations].sort((a, b) => a - b);
      const percentile = (p: number) =>
        sorted.length === 0
          ? 0
          : sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]!;
      entries.push({
        table,
        queryCount: stats.count,
        avgDurationMs: stats.count > 0 ? Math.round(stats.totalMs / stats.count) : 0,
        p95Ms: percentile(95),
        p99Ms: percentile(99),
        slowQueryCount: stats.slowCount,
      });
    }
    return entries.sort((a, b) => b.avgDurationMs - a.avgDurationMs);
  }

  getReport(): {
    totalQueries: number;
    avgDurationMs: number;
    slowQueryCount: number;
    slowQueries: QueryLogEntry[];
    nPlusOneSuspects: NPlusOneSuspect[];
    heatmap: RepositoryHeatmapEntry[];
  } {
    return {
      totalQueries: this.totalQueries,
      avgDurationMs:
        this.totalQueries > 0 ? Math.round(this.totalDurationMs / this.totalQueries) : 0,
      slowQueryCount: this.log.filter((e) => e.slow).length,
      slowQueries: this.getSlowQueries(),
      nPlusOneSuspects: this.getNPlusOneSuspects(),
      heatmap: this.getHeatmap(),
    };
  }
}

let instance: QueryAuditor | null = null;

export function getQueryAuditor(): QueryAuditor {
  if (!instance) instance = new QueryAuditor();
  return instance;
}

/**
 * Shared timing wrapper for repositories that don't extend BaseRepository
 * (UserRepository, JournalRepository, DesktopRepository — multi-table
 * aggregates with no single-id CRUD shape). BaseRepository.instrument()
 * delegates here too, so there is exactly one place that defines "how a
 * query gets timed and logged."
 */
export async function instrumentQuery<R>(
  table: string,
  operation: string,
  fn: () => Promise<R>,
): Promise<R> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const durationMs = Math.round(performance.now() - start);
    getQueryAuditor().record(table, operation, durationMs);
  }
}
