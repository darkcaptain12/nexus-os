import type { LoadTestReport, LoadTestTarget } from './types';
import { computeIntelligenceScore } from '@/lib/executive/optimization/intelligence-score';
import { getStrategyPerformance } from '@/lib/executive/optimization/trading-optimizer';
import { commerceDashboard } from '@/lib/commerce/intelligence/services/commerce-intelligence-service';
import { cloudStatus } from '@/lib/cloud/services/cloud-service';
import { getJournalStats } from '@/lib/quant/live/trade-journal';
import { parseVoiceIntent } from '@/lib/quant/services/voice-service';

// Load Test — gerçek in-process yük: mevcut servisleri N kez çağırıp latency
// ölçer (p50/p95/p99 + ops/sn). Yeni endpoint yazmaz; production yolları
// (Trading/Commerce/Voice/Sync/Dashboard) gerçek çağrılarla benchmark edilir.

function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Number(sorted[idx]!.toFixed(3));
}

async function benchmark(
  name: string,
  iterations: number,
  fn: () => unknown | Promise<unknown>,
): Promise<LoadTestTarget> {
  const durations: number[] = [];
  let errors = 0;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    try {
      await fn();
    } catch {
      errors++;
    }
    durations.push(performance.now() - t0);
  }

  const totalMs = performance.now() - start;
  durations.sort((a, b) => a - b);

  return {
    name,
    iterations,
    totalMs: Number(totalMs.toFixed(2)),
    p50Ms: pct(durations, 50),
    p95Ms: pct(durations, 95),
    p99Ms: pct(durations, 99),
    opsPerSecond: totalMs > 0 ? Math.round((iterations / totalMs) * 1000) : 0,
    errors,
  };
}

/** Gerçek yük testi — production yollarını N iterasyonla benchmark eder. */
export async function runLoadTest(iterations = 50): Promise<LoadTestReport> {
  const start = performance.now();

  const targets: LoadTestTarget[] = [];
  // Trading — journal istatistikleri (sık okunan)
  targets.push(await benchmark('trading.journalStats', iterations, () => getJournalStats()));
  // Trading — strateji performansı (ağır hesaplama)
  targets.push(
    await benchmark('trading.strategyPerf', Math.max(10, Math.floor(iterations / 2)), () =>
      getStrategyPerformance(),
    ),
  );
  // Commerce — dashboard (TTL cache arkasında)
  targets.push(
    await benchmark('commerce.dashboard', Math.max(10, Math.floor(iterations / 2)), () =>
      commerceDashboard(),
    ),
  );
  // Voice — intent parse (saf fonksiyon, sık çağrılır)
  targets.push(
    await benchmark('voice.parseIntent', iterations, () => parseVoiceIntent('trading durumu ne')),
  );
  // Sync — cloud status aggregate
  targets.push(await benchmark('sync.cloudStatus', iterations, () => cloudStatus()));
  // Dashboard — intelligence score (6 boyut hesaplama)
  targets.push(
    await benchmark('dashboard.intelligenceScore', Math.max(10, Math.floor(iterations / 2)), () =>
      computeIntelligenceScore(),
    ),
  );

  const durationMs = Number((performance.now() - start).toFixed(2));
  const totalIterations = targets.reduce((s, t) => s + t.iterations, 0);
  const totalErrors = targets.reduce((s, t) => s + t.errors, 0);

  // Status — hata + p99 latency eşiği
  const worstP99 = Math.max(...targets.map((t) => t.p99Ms));
  const status: LoadTestReport['status'] =
    totalErrors > 0 || worstP99 > 500 ? 'fail' : worstP99 > 100 ? 'warn' : 'pass';

  return {
    targets,
    totalIterations,
    totalErrors,
    durationMs,
    status,
    generatedAt: new Date().toISOString(),
  };
}
