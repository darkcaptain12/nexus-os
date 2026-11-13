import type { PerformanceReport } from './types';
import { getMetrics } from '@/lib/observability';
import { getCache } from '@/lib/cache';

// Performance Audit — RAM/CPU/Event Loop/GC baskısı/Cache hit ratio/API latency.
// Mevcut getMetrics().getProcessMetrics/getPercentiles/getSlowest + cache stats
// REUSE eder. Gerçek ölçüm — process.memoryUsage/cpuUsage/eventLoopHistogram.

const MB = 1024 * 1024;

export function runPerformanceAudit(): PerformanceReport {
  const metrics = getMetrics();
  const proc = metrics.getProcessMetrics();
  const percentiles = metrics.getPercentiles();
  const slowest = metrics.getSlowest(undefined, 5);
  const cache = getCache().getStats();

  const heapUsedPercent =
    proc.memory.heapTotalBytes > 0
      ? Math.round((proc.memory.heapUsedBytes / proc.memory.heapTotalBytes) * 100)
      : 0;

  // GC baskısı — heap kullanım oranından türetilir (yüksek oran = sık GC)
  const gcPressure: PerformanceReport['gcPressure'] =
    heapUsedPercent >= 85 ? 'high' : heapUsedPercent >= 65 ? 'medium' : 'low';

  // Status — event loop gecikmesi + heap baskısı
  const elP99 = proc.eventLoopDelayMs?.p99 ?? 0;
  const status: PerformanceReport['status'] =
    elP99 > 100 || heapUsedPercent >= 90
      ? 'fail'
      : elP99 > 50 || heapUsedPercent >= 75
        ? 'warn'
        : 'pass';

  return {
    memory: {
      rssMB: Math.round(proc.memory.rssBytes / MB),
      heapUsedMB: Math.round(proc.memory.heapUsedBytes / MB),
      heapTotalMB: Math.round(proc.memory.heapTotalBytes / MB),
      heapUsedPercent,
    },
    cpuPercent: proc.cpuPercent,
    eventLoopDelayMs: proc.eventLoopDelayMs,
    uptimeSeconds: proc.uptimeSeconds,
    cache: { size: cache.size, hits: cache.hits, misses: cache.misses, hitRate: cache.hitRate },
    apiLatency: {
      p50: percentiles.p50Ms,
      p95: percentiles.p95Ms,
      p99: percentiles.p99Ms,
      count: percentiles.count,
    },
    slowest: slowest.map((s) => ({ name: s.name, durationMs: s.durationMs })),
    gcPressure,
    status,
    generatedAt: new Date().toISOString(),
  };
}
