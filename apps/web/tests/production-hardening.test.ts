import { describe, it, expect } from 'vitest';
import { runStabilityAudit } from '../src/lib/observability/production/stability-audit';
import { runRecoveryVerify } from '../src/lib/observability/production/recovery-verify';
import { runPerformanceAudit } from '../src/lib/observability/production/performance-audit';
import { runLoadTest } from '../src/lib/observability/production/load-test';
import { runBackupVerify } from '../src/lib/observability/production/backup-verify';
import { getProductionHealth } from '../src/lib/observability/production/production-health';
import {
  evaluateAlerts,
  getAlerts,
  getActiveAlertCount,
} from '../src/lib/observability/production/alert-engine';
import { computeRcScore } from '../src/lib/observability/production/rc-score';
import { productionDashboard } from '../src/lib/observability/production/services/production-service';

describe('Stability Audit', () => {
  it('bounded buffer envanteri + singleton sayısı', () => {
    const report = runStabilityAudit();
    expect(report.boundedBuffers).toBeGreaterThan(15); // 18 bilinen buffer
    expect(report.unboundedRisks).toBe(0); // TTL cache süre-bazlı bounded
    expect(report.buffers.every((b) => b.bounded)).toBe(true);
    expect(['pass', 'warn', 'fail']).toContain(report.status);
  });

  it('canlı boyut ihlali yoksa leak riski düşük', () => {
    const report = runStabilityAudit();
    // Test ortamında buffer'lar MAX altında → high risk olmamalı
    expect(report.leakRisks.filter((r) => r.risk === 'high').length).toBe(0);
    expect(report.score).toBeGreaterThan(50);
  });
});

describe('Crash Recovery Verify', () => {
  it('6 subsystem recovery mekanizması doğrulanır', () => {
    const report = runRecoveryVerify();
    const subsystems = report.checks.map((c) => c.subsystem);
    for (const s of ['agent', 'workflow', 'queue', 'trading', 'commerce', 'sync'] as const) {
      expect(subsystems).toContain(s);
    }
    expect(report.checks.every((c) => c.recoverable)).toBe(true);
    expect(report.score).toBe(100);
    expect(report.status).toBe('pass');
  });

  it('her check mekanizma + pending items içerir', () => {
    const report = runRecoveryVerify();
    for (const c of report.checks) {
      expect(c.mechanism).toBeTruthy();
      expect(typeof c.pendingItems).toBe('number');
    }
  });
});

describe('Performance Audit — gerçek ölçüm', () => {
  it("RAM/CPU/event loop/GC/cache gerçek process'ten", () => {
    const report = runPerformanceAudit();
    expect(report.memory.rssMB).toBeGreaterThan(0);
    expect(report.memory.heapUsedMB).toBeGreaterThan(0);
    expect(report.memory.heapUsedPercent).toBeGreaterThanOrEqual(0);
    expect(['low', 'medium', 'high']).toContain(report.gcPressure);
    expect(report.cache).toHaveProperty('hitRate');
    expect(report.apiLatency).toHaveProperty('p99');
    expect(['pass', 'warn', 'fail']).toContain(report.status);
  });
});

describe('Load Test — gerçek in-process yük', () => {
  it('production yollarını benchmark eder (p50/p95/p99 + ops/sn)', async () => {
    const report = await runLoadTest(10);
    expect(report.targets.length).toBe(6);
    const names = report.targets.map((t) => t.name);
    expect(names).toContain('trading.journalStats');
    expect(names).toContain('voice.parseIntent');
    expect(names).toContain('sync.cloudStatus');
    for (const t of report.targets) {
      expect(t.iterations).toBeGreaterThan(0);
      expect(t.opsPerSecond).toBeGreaterThan(0);
      expect(t.p99Ms).toBeGreaterThanOrEqual(t.p50Ms);
    }
    expect(report.totalErrors).toBe(0);
  }, 30_000);
});

describe('Backup & Restore Audit — mock YOK', () => {
  it('gerçek backup oluşur + restore çalışır', () => {
    const report = runBackupVerify();
    expect(report.backupCreated).toBe(true);
    expect(report.restoreWorks).toBe(true);
    expect(report.version).toBeGreaterThan(0);
    expect(report.domains.length).toBeGreaterThan(0);
    expect(report.status).toBe('pass');
  });
});

describe('Production Health — monitoring aggregate', () => {
  it('CPU/RAM/EventLoop/Queue/Cache/subsystem', () => {
    const health = getProductionHealth();
    expect(['healthy', 'degraded', 'critical']).toContain(health.status);
    expect(health.queues).toHaveProperty('agents');
    expect(health.queues).toHaveProperty('approvals');
    expect(health.queues).toHaveProperty('cloudSync');
    expect(health.subsystems.length).toBeGreaterThanOrEqual(5); // Plugin/Cloud/Trading/Commerce/Voice
  });
});

describe('Alert Engine — mevcut notification reuse', () => {
  it('eşik ihlali yoksa alert üretmez (temiz sistem)', () => {
    const fired = evaluateAlerts();
    // Test ortamında heap/queue düşük → alert olmamalı (veya sadece warning)
    expect(fired.filter((a) => a.severity === 'critical').length).toBe(0);
    expect(Array.isArray(getAlerts())).toBe(true);
    expect(typeof getActiveAlertCount()).toBe('number');
  });
});

describe('Release Candidate Score', () => {
  it('7 kriter → tek 0-100 + grade + verdict', async () => {
    const rc = await computeRcScore();
    expect(rc.overall).toBeGreaterThanOrEqual(0);
    expect(rc.overall).toBeLessThanOrEqual(100);
    expect(rc.criteria.length).toBe(7);
    const names = rc.criteria.map((c) => c.name);
    for (const n of [
      'stability',
      'performance',
      'security',
      'recovery',
      'monitoring',
      'testCoverage',
      'productionReadiness',
    ] as const) {
      expect(names).toContain(n);
    }
    // Ağırlıklar toplamı ~1
    expect(rc.criteria.reduce((s, c) => s + c.weight, 0)).toBeCloseTo(1, 1);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(rc.grade);
    expect(['ship', 'ship-with-caveats', 'not-ready']).toContain(rc.verdict);
  });

  it('sorunlar gizlenmez — knownIssues raporlanır', async () => {
    const rc = await computeRcScore();
    expect(Array.isArray(rc.knownIssues)).toBe(true); // Supabase yok gibi bilinen sorunlar
  });
});

describe('Production Service — facade (düz JSON)', () => {
  it("production dashboard tüm audit'leri aggregate eder", async () => {
    const d = await productionDashboard();
    expect(d).toHaveProperty('rcScore');
    expect(d).toHaveProperty('health');
    expect(d).toHaveProperty('stability');
    expect(d).toHaveProperty('recovery');
    expect(d).toHaveProperty('performance');
    expect(d).toHaveProperty('backup');
    expect(d).toHaveProperty('security');
    expect(() => JSON.stringify(d)).not.toThrow();
  });
});
