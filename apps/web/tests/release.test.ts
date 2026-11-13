import { describe, it, expect } from 'vitest';
import {
  getVersionInfo,
  APEX_VERSION,
  MIGRATION_VERSION,
} from '../src/lib/release/version-manager';
import { validateReleaseEnvironment } from '../src/lib/release/environment-validation';
import { getConfigSnapshot, getProvidersByCategory } from '../src/lib/release/config-manager';
import { getInstallationState } from '../src/lib/release/installation-wizard';
import { exportPackage, verifyPackage, computeChecksum } from '../src/lib/release/backup-export';
import { generateChangelog } from '../src/lib/release/changelog-generator';
import { auditDocumentation } from '../src/lib/release/documentation-audit';
import { runReleaseAudit } from '../src/lib/release/release-audit';
import { computeProductionScore } from '../src/lib/release/production-score';
import { releaseDashboard } from '../src/lib/release/services/release-service';

describe('Version Manager', () => {
  it('v1.0.0 sürüm bilgisi', () => {
    const v = getVersionInfo();
    expect(v.version).toBe('1.0.0');
    expect(APEX_VERSION).toBe('1.0.0');
    expect(v.migrationVersion).toBe(MIGRATION_VERSION);
    expect(v.channel).toBe('stable');
    expect(v.nodeVersion).toMatch(/^v\d+/);
    expect(v.buildNumber).toBeTruthy();
  });
});

describe('Environment Validation', () => {
  it('Node/PNPM/DB/API/SSL/memory/network kontrol eder', () => {
    const report = validateReleaseEnvironment();
    const categories = report.checks.map((c) => c.category);
    expect(categories).toContain('runtime');
    expect(categories).toContain('database');
    expect(categories).toContain('api-keys');
    expect(categories).toContain('resources');
    // Node kontrolü pass olmalı (test Node 20+)
    expect(report.checks.find((c) => c.name === 'Node.js')!.status).toBe('pass');
    expect(['pass', 'warn', 'fail']).toContain(report.status);
  });

  it('zorunlu fail yoksa blocker yok', () => {
    const report = validateReleaseEnvironment();
    expect(report.blockers.length).toBe(0); // graceful degradation — Supabase warn, fail değil
  });
});

describe('Configuration Manager', () => {
  it('provider set/unset döner — secret DEĞER dönmez', () => {
    const snap = getConfigSnapshot();
    expect(snap.totalProviders).toBeGreaterThanOrEqual(10);
    expect(snap.providers.every((p) => p.envKeys.every((k) => typeof k.set === 'boolean'))).toBe(
      true,
    );
    // Hiçbir env değeri sızmamalı — yalnız key adı + set boolean
    const serialized = JSON.stringify(snap);
    expect(serialized).not.toContain('sk-'); // API key değeri yok
    expect(snap.security).toHaveProperty('serviceRoleSafe');
  });

  it('kategori filtresi', () => {
    expect(getProvidersByCategory('ai').every((p) => p.category === 'ai')).toBe(true);
    expect(getProvidersByCategory('trading').length).toBeGreaterThan(0);
  });
});

describe('Installation Wizard', () => {
  it('8 adım — Supabase zorunlu, kalanlar opsiyonel', () => {
    const state = getInstallationState();
    expect(state.total).toBe(8);
    const supabase = state.steps.find((s) => s.id === 'supabase')!;
    expect(supabase.required).toBe(true);
    const trading = state.steps.find((s) => s.id === 'trading-api')!;
    expect(trading.required).toBe(false);
    expect(state.steps.every((s) => s.instructions.length > 0)).toBe(true);
  });
});

describe('Backup / Export — gerçek serialize', () => {
  it('tüm domain export + checksum doğrulanır', () => {
    const pkg = exportPackage();
    expect(pkg.version).toBe('1.0.0');
    expect(pkg.domains).toHaveProperty('memory');
    expect(pkg.domains).toHaveProperty('knowledge');
    expect(pkg.domains).toHaveProperty('trading');
    expect(pkg.domains).toHaveProperty('plugins');
    expect(pkg.checksum).toMatch(/^apex-/);

    const result = verifyPackage(pkg);
    expect(result.ok).toBe(true);
    expect(result.checksumValid).toBe(true);
  });

  it('bozuk paket reddedilir', () => {
    const pkg = exportPackage();
    pkg.checksum = 'apex-bozuk-0';
    const result = verifyPackage(pkg);
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Checksum');
  });

  it('checksum deterministik', () => {
    expect(computeChecksum('{"a":1}')).toBe(computeChecksum('{"a":1}'));
    expect(computeChecksum('{"a":1}')).not.toBe(computeChecksum('{"a":2}'));
  });
});

describe('Changelog Generator', () => {
  it('Sprint 1-25 özeti', () => {
    const log = generateChangelog();
    expect(log.totalSprints).toBe(25);
    expect(log.version).toBe('1.0.0');
    expect(log.entries[0]!.sprint).toBe(25); // en yeni önce
    expect(log.summary.newModules).toBeGreaterThan(15);
    expect(log.summary.hardening).toBeGreaterThanOrEqual(3);
  });
});

describe('Documentation Audit', () => {
  it('doküman varlığı gerçek fs kontrolü', () => {
    const report = auditDocumentation();
    expect(report.total).toBeGreaterThan(10);
    // Bu sprintte oluşturulanlar mevcut olmalı
    expect(report.items.find((i) => i.name === 'CHANGELOG')!.present).toBe(true);
    expect(report.items.find((i) => i.name === 'LICENSE')!.present).toBe(true);
    expect(report.items.find((i) => i.name === 'ENV Example')!.present).toBe(true);
    expect(report.score).toBeGreaterThan(0);
  });
});

describe('Release Audit — tam entegrasyon', () => {
  it('9 subsystem instantiate + gerçek veri', async () => {
    const report = await runReleaseAudit();
    expect(report.totalSubsystems).toBe(9);
    const names = report.subsystems.map((s) => s.name);
    for (const n of [
      'Executive',
      'Memory',
      'Knowledge Graph',
      'Trading',
      'Commerce',
      'Voice',
      'Cloud',
      'Plugin',
    ]) {
      expect(names).toContain(n);
    }
    // Tüm subsystem entegre çalışmalı
    expect(report.integratedCount).toBe(report.totalSubsystems);
    expect(report.status).toBe('pass');
  }, 30_000);
});

describe('Production Score — FINAL 9 kriter', () => {
  it('9 kriter → 0-100 + release status', async () => {
    const score = await computeProductionScore();
    expect(score.overall).toBeGreaterThanOrEqual(0);
    expect(score.overall).toBeLessThanOrEqual(100);
    expect(score.criteria.length).toBe(9);
    const names = score.criteria.map((c) => c.name);
    for (const n of [
      'stability',
      'security',
      'performance',
      'recovery',
      'documentation',
      'monitoring',
      'installation',
      'configuration',
      'testCoverage',
    ] as const) {
      expect(names).toContain(n);
    }
    expect(score.criteria.reduce((s, c) => s + c.weight, 0)).toBeCloseTo(1, 1);
    expect(['released', 'release-candidate', 'not-ready']).toContain(score.releaseStatus);
    // Operasyonel gereksinimler (kod dışı API key) raporlanır
    expect(Array.isArray(score.operationalRequirements)).toBe(true);
  }, 30_000);
});

describe('Release Dashboard — facade', () => {
  it('version/score/audit/env/install/health düz JSON', async () => {
    const d = await releaseDashboard();
    expect(d.version.version).toBe('1.0.0');
    expect(d).toHaveProperty('productionScore');
    expect(d).toHaveProperty('rcScore');
    expect(d).toHaveProperty('releaseAudit');
    expect(d).toHaveProperty('installation');
    expect(() => JSON.stringify(d)).not.toThrow();
  }, 30_000);
});
