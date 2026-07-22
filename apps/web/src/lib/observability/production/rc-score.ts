import type { RcScoreReport, RcCriterion } from './types';
import { runStabilityAudit } from './stability-audit';
import { runRecoveryVerify } from './recovery-verify';
import { runPerformanceAudit } from './performance-audit';
import { getProductionHealth } from './production-health';
import { generateSecurityAuditReport } from '../security-audit';
import { generateProductionChecklist } from '../production-checklist';
import { generateProductionAudit } from '../production-audit';

// Release Candidate Score — 7 kriter (stability/performance/security/recovery/
// monitoring/testCoverage/productionReadiness) → tek 0-100. Mevcut audit'leri
// (security-audit/production-checklist/production-audit) + Sprint 24 audit'leri
// aggregate eder. Yeni skorlama iş mantığı minimumda.

function perfScore(status: string, heapPercent: number, elP99: number): number {
  let score = status === 'pass' ? 90 : status === 'warn' ? 65 : 35;
  if (heapPercent < 60) score += 5;
  if (elP99 < 20) score += 5;
  return Math.min(100, score);
}

function grade(score: number): RcScoreReport['grade'] {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export async function computeRcScore(): Promise<RcScoreReport> {
  const stability = runStabilityAudit();
  const recovery = runRecoveryVerify();
  const performance = runPerformanceAudit();
  const health = getProductionHealth();
  const [security, checklist, audit] = await Promise.all([
    generateSecurityAuditReport(),
    generateProductionChecklist(),
    generateProductionAudit(),
  ]);

  const perf = perfScore(
    performance.status,
    performance.memory.heapUsedPercent,
    performance.eventLoopDelayMs?.p99 ?? 0,
  );
  const monitoring = health.status === 'healthy' ? 90 : health.status === 'degraded' ? 65 : 35;
  const testCoverage =
    Math.min(100, Math.round((audit.sprintSummary.testsPassing / 900) * 100)) || 85;

  const criteria: RcCriterion[] = [
    {
      name: 'stability',
      score: stability.score,
      weight: 0.18,
      detail: `${stability.boundedBuffers} bounded buffer, ${stability.leakRisks.length} leak riski`,
    },
    {
      name: 'performance',
      score: perf,
      weight: 0.16,
      detail: `Heap %${performance.memory.heapUsedPercent}, event loop p99 ${performance.eventLoopDelayMs?.p99 ?? 0}ms`,
    },
    {
      name: 'security',
      score: security.score,
      weight: 0.2,
      detail: `${security.items.filter((i) => i.status === 'VERIFIED').length}/${security.items.length} doğrulandı`,
    },
    {
      name: 'recovery',
      score: recovery.score,
      weight: 0.16,
      detail: `${recovery.checks.filter((c) => c.recoverable).length}/${recovery.checks.length} subsystem recoverable`,
    },
    {
      name: 'monitoring',
      score: monitoring,
      weight: 0.1,
      detail: `Health ${health.status}, ${health.alerts} aktif alert`,
    },
    {
      name: 'testCoverage',
      score: testCoverage,
      weight: 0.1,
      detail: `${audit.sprintSummary.testsPassing} test geçiyor`,
    },
    {
      name: 'productionReadiness',
      score: checklist.score,
      weight: 0.1,
      detail: `${checklist.items.filter((i) => i.status === 'pass').length}/${checklist.items.length} checklist pass`,
    },
  ];

  const overall = Math.round(criteria.reduce((s, c) => s + c.score * c.weight, 0));

  const knownIssues: string[] = [];
  for (const item of checklist.items) {
    if (item.status === 'warn' || item.status === 'fail')
      knownIssues.push(`[${item.category}] ${item.name}: ${item.message}`);
  }
  for (const risk of stability.leakRisks) {
    if (risk.risk === 'high') knownIssues.push(`[stability] ${risk.area}: ${risk.detail}`);
  }

  const verdict: RcScoreReport['verdict'] =
    overall >= 80 && security.score >= 70
      ? 'ship'
      : overall >= 60
        ? 'ship-with-caveats'
        : 'not-ready';

  return {
    overall,
    grade: grade(overall),
    verdict,
    criteria,
    knownIssues,
    generatedAt: new Date().toISOString(),
  };
}
