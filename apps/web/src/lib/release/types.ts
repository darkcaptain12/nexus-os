// APEX OS v1.0 Release — tipler (Sprint 25)
// Yeni özellik YOK. Mevcut config/env-validation/cloud-backup/production-service/
// security-audit/Memory/KG altyapısını release hazırlığı için sarar + aggregate eder.

export type CheckStatus = 'pass' | 'warn' | 'fail';

// ─── Version Manager ─────────────────────────────────────────────────────────

export interface VersionInfo {
  version: string; // 1.0.0
  buildNumber: string;
  releaseDate: string;
  commit: string;
  migrationVersion: number; // en son migration numarası
  nodeVersion: string;
  channel: 'stable' | 'rc' | 'beta';
}

// ─── Environment Validation ──────────────────────────────────────────────────

export interface EnvCheck {
  name: string;
  category: 'runtime' | 'database' | 'api-keys' | 'env-vars' | 'network' | 'resources';
  status: CheckStatus;
  value: string;
  required: boolean;
  message: string;
}

export interface EnvironmentReport {
  status: CheckStatus;
  passed: number;
  warnings: number;
  failures: number;
  checks: EnvCheck[];
  blockers: string[]; // kuruluma engel olan zorunlu eksikler
  generatedAt: string;
}

// ─── Configuration Manager ───────────────────────────────────────────────────

export interface ConfigProvider {
  name: string;
  category:
    | 'ai'
    | 'trading'
    | 'commerce'
    | 'notification'
    | 'voice'
    | 'desktop'
    | 'cloud'
    | 'database';
  configured: boolean;
  envKeys: { key: string; set: boolean; public: boolean }[];
}

export interface ConfigSnapshot {
  environment: string;
  appUrl: string;
  featureFlags: Record<string, boolean>;
  providers: ConfigProvider[];
  security: { httpsEnforced: boolean; serviceRoleSafe: boolean; rateLimitEnabled: boolean };
  configuredProviders: number;
  totalProviders: number;
  generatedAt: string;
}

// ─── Installation Wizard ─────────────────────────────────────────────────────

export type InstallStepId =
  | 'api-keys'
  | 'supabase'
  | 'trading-api'
  | 'commerce-api'
  | 'notification'
  | 'voice'
  | 'desktop-agent'
  | 'cloud-sync';

export interface InstallStep {
  id: InstallStepId;
  title: string;
  status: 'complete' | 'incomplete' | 'optional';
  required: boolean;
  envKeys: string[];
  instructions: string;
  docLink: string;
}

export interface InstallationState {
  completed: number;
  total: number;
  requiredComplete: boolean; // zorunlu adımlar tamam mı
  minimumViable: boolean; // temel kullanım için yeterli mi (Supabase + auth)
  steps: InstallStep[];
  nextStep: InstallStepId | null;
  generatedAt: string;
}

// ─── Backup / Export ─────────────────────────────────────────────────────────

export interface ExportPackage {
  version: string;
  exportedAt: string;
  domains: {
    settings: Record<string, unknown>;
    memory: { timeline: unknown[]; decisions: unknown[] };
    knowledge: { nodes: unknown[]; edges: unknown[] };
    commerce: unknown;
    trading: unknown;
    plugins: unknown[];
    workflow: unknown;
  };
  checksum: string;
  itemCount: number;
}

export interface ImportResult {
  ok: boolean;
  version: string;
  checksumValid: boolean;
  domainsImported: string[];
  itemCount: number;
  message: string;
}

// ─── Changelog ───────────────────────────────────────────────────────────────

export interface ChangelogEntry {
  sprint: number;
  title: string;
  category: 'feature' | 'improvement' | 'hardening';
  highlights: string[];
}

export interface Changelog {
  version: string;
  generatedAt: string;
  totalSprints: number;
  entries: ChangelogEntry[];
  summary: { newModules: number; improvements: number; hardening: number };
}

// ─── Release Audit (tam entegrasyon) ─────────────────────────────────────────

export interface SubsystemCheck {
  name: string;
  status: CheckStatus;
  integrated: boolean;
  detail: string;
}

export interface ReleaseAuditReport {
  status: CheckStatus;
  integratedCount: number;
  totalSubsystems: number;
  subsystems: SubsystemCheck[];
  generatedAt: string;
}

// ─── Production Score (final) ────────────────────────────────────────────────

export interface ProductionScoreCriterion {
  name:
    | 'stability'
    | 'security'
    | 'performance'
    | 'recovery'
    | 'documentation'
    | 'monitoring'
    | 'installation'
    | 'configuration'
    | 'testCoverage';
  score: number;
  weight: number;
  detail: string;
}

export interface ProductionScoreReport {
  overall: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  releaseStatus: 'released' | 'release-candidate' | 'not-ready';
  criteria: ProductionScoreCriterion[];
  knownIssues: string[];
  operationalRequirements: string[]; // API key vb — kod dışı
  generatedAt: string;
}

// ─── Release Dashboard ───────────────────────────────────────────────────────

export interface ReleaseDashboard {
  version: VersionInfo;
  productionScore: ProductionScoreReport;
  rcScore: number;
  releaseAudit: { status: CheckStatus; integrated: number; total: number };
  environment: { status: CheckStatus; blockers: number };
  installation: { completed: number; total: number; minimumViable: boolean };
  health: string;
  knownIssues: string[];
  generatedAt: string;
}
