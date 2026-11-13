import { withCache } from '@/lib/cache';
import { runStabilityAudit } from '../stability-audit';
import { runRecoveryVerify } from '../recovery-verify';
import { runPerformanceAudit } from '../performance-audit';
import { runLoadTest } from '../load-test';
import { runBackupVerify } from '../backup-verify';
import { getProductionHealth } from '../production-health';
import { evaluateAlerts, getAlerts, getActiveAlertCount } from '../alert-engine';
import { computeRcScore } from '../rc-score';
import { generateSecurityAuditReport } from '../../security-audit';

// Production Service — framework-bağımsız facade. Tüm production audit'lerini
// aggregate eder. Yeni iş mantığı YOK — mevcut audit modüllerini sarar. Ağır
// raporlar TTL cache arkasında. Düz JSON (dashboard/mobil).

export function stabilityAudit() {
  return runStabilityAudit();
}

export function recoveryVerify() {
  return runRecoveryVerify();
}

export function performanceAudit() {
  return runPerformanceAudit();
}

export function loadTest(iterations?: number) {
  return runLoadTest(iterations);
}

export function backupVerify() {
  return runBackupVerify();
}

export function productionHealth() {
  return getProductionHealth();
}

/** Alert eşiklerini değerlendir + kritikleri notification'a yönlendir. */
export function checkAlerts() {
  return evaluateAlerts();
}

export function alerts(limit?: number, severity?: 'warning' | 'critical') {
  return getAlerts(limit, severity);
}

export function rcScore() {
  return withCache('production:rc-score', 15_000, () => computeRcScore());
}

/** Production monitoring dashboard aggregate — düz JSON. */
export async function productionDashboard() {
  const [rc, security] = await Promise.all([computeRcScore(), generateSecurityAuditReport()]);
  const health = getProductionHealth();
  const stability = runStabilityAudit();
  const recovery = runRecoveryVerify();
  const performance = runPerformanceAudit();
  const backup = runBackupVerify();
  // Alert eşiklerini değerlendir (kritikler notification'a gider)
  evaluateAlerts();

  return {
    rcScore: rc,
    health,
    stability: {
      status: stability.status,
      score: stability.score,
      boundedBuffers: stability.boundedBuffers,
      leakRisks: stability.leakRisks.length,
    },
    recovery: {
      status: recovery.status,
      score: recovery.score,
      recoverable: recovery.checks.filter((c) => c.recoverable).length,
    },
    performance: {
      status: performance.status,
      heapUsedPercent: performance.memory.heapUsedPercent,
      eventLoopP99: performance.eventLoopDelayMs?.p99 ?? null,
      cacheHitRate: performance.cache.hitRate,
    },
    backup: { status: backup.status, restoreWorks: backup.restoreWorks, version: backup.version },
    security: { score: security.score },
    activeAlerts: getActiveAlertCount(),
    generatedAt: new Date().toISOString(),
  };
}
