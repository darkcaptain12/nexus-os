import { withCache } from '@/lib/cache';
import type { ReleaseDashboard } from '../types';
import { getVersionInfo } from '../version-manager';
import { validateReleaseEnvironment } from '../environment-validation';
import { getConfigSnapshot, getProvidersByCategory } from '../config-manager';
import { getInstallationState } from '../installation-wizard';
import { exportPackage, verifyPackage } from '../backup-export';
import { generateChangelog } from '../changelog-generator';
import { runReleaseAudit } from '../release-audit';
import { computeProductionScore } from '../production-score';
import { auditDocumentation } from '../documentation-audit';
import { getProductionHealth } from '@/lib/observability/production/production-health';
import { computeRcScore } from '@/lib/observability/production/rc-score';

// Release Service — framework-bağımsız facade. v1.0 release araçlarını aggregate
// eder. Yeni iş mantığı YOK — mevcut modülleri sarar. Ağır rapor TTL cache.

export function version() {
  return getVersionInfo();
}

export function environment() {
  return validateReleaseEnvironment();
}

export function config() {
  return getConfigSnapshot();
}

export function configByCategory(category: Parameters<typeof getProvidersByCategory>[0]) {
  return getProvidersByCategory(category);
}

export function installation() {
  return getInstallationState();
}

export function exportData() {
  return exportPackage();
}

export function verifyExport(pkg: Parameters<typeof verifyPackage>[0]) {
  return verifyPackage(pkg);
}

export function changelog() {
  return generateChangelog();
}

export function documentation() {
  return auditDocumentation();
}

export function releaseAudit() {
  return withCache('release:audit', 15_000, () => runReleaseAudit());
}

export function productionScore() {
  return withCache('release:production-score', 15_000, () => computeProductionScore());
}

/** Release Dashboard — Version/Build/RC/Production Score/Status/Health/Known Issues. */
export async function releaseDashboard(): Promise<ReleaseDashboard> {
  const [prodScore, rc, audit] = await Promise.all([
    computeProductionScore(),
    computeRcScore(),
    runReleaseAudit(),
  ]);
  const env = validateReleaseEnvironment();
  const install = getInstallationState();
  const health = getProductionHealth();

  return {
    version: getVersionInfo(),
    productionScore: prodScore,
    rcScore: rc.overall,
    releaseAudit: {
      status: audit.status,
      integrated: audit.integratedCount,
      total: audit.totalSubsystems,
    },
    environment: { status: env.status, blockers: env.blockers.length },
    installation: {
      completed: install.completed,
      total: install.total,
      minimumViable: install.minimumViable,
    },
    health: health.status,
    knownIssues: prodScore.knownIssues,
    generatedAt: new Date().toISOString(),
  };
}
