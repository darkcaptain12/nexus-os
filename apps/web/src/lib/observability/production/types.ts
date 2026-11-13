// Production Hardening Final — tipler (Sprint 24)
// Yeni özellik YOK. Mevcut observability/index (getMetrics), health, security-audit,
// cache, cloud-backup, agent-store, notification altyapısını DENETLER + aggregate eder.

export type AuditStatus = 'pass' | 'warn' | 'fail';

// ─── Stability Audit ─────────────────────────────────────────────────────────

export interface BufferBound {
  name: string;
  kind: 'ring-buffer' | 'ttl-cache' | 'map-registry' | 'queue';
  bounded: boolean;
  maxSize: number | null;
  note: string;
}

export interface StabilityAuditReport {
  status: AuditStatus;
  score: number; // 0-100
  boundedBuffers: number;
  unboundedRisks: number;
  singletonCount: number;
  buffers: BufferBound[];
  leakRisks: { area: string; risk: 'low' | 'medium' | 'high'; detail: string }[];
  generatedAt: string;
}

// ─── Crash Recovery ──────────────────────────────────────────────────────────

export interface RecoveryCheck {
  subsystem: 'agent' | 'workflow' | 'queue' | 'trading' | 'commerce' | 'sync';
  recoverable: boolean;
  mechanism: string; // globalThis singleton / backup snapshot / pending queue
  pendingItems: number; // restart sonrası devam edecek iş sayısı
  detail: string;
}

export interface RecoveryReport {
  status: AuditStatus;
  score: number;
  checks: RecoveryCheck[];
  generatedAt: string;
}

// ─── Performance Audit ───────────────────────────────────────────────────────

export interface PerformanceReport {
  memory: { rssMB: number; heapUsedMB: number; heapTotalMB: number; heapUsedPercent: number };
  cpuPercent: number | null;
  eventLoopDelayMs: { mean: number; p99: number } | null;
  uptimeSeconds: number;
  cache: { size: number; hits: number; misses: number; hitRate: number };
  apiLatency: { p50: number; p95: number; p99: number; count: number };
  slowest: { name: string; durationMs: number }[];
  gcPressure: 'low' | 'medium' | 'high'; // heap kullanım oranından türetilir
  status: AuditStatus;
  generatedAt: string;
}

// ─── Load Test ───────────────────────────────────────────────────────────────

export interface LoadTestTarget {
  name: string;
  iterations: number;
  totalMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  opsPerSecond: number;
  errors: number;
}

export interface LoadTestReport {
  targets: LoadTestTarget[];
  totalIterations: number;
  totalErrors: number;
  durationMs: number;
  status: AuditStatus;
  generatedAt: string;
}

// ─── Backup & Restore Audit ──────────────────────────────────────────────────

export interface BackupVerifyReport {
  backupCreated: boolean;
  restoreWorks: boolean;
  version: number | null;
  domains: string[];
  totalItems: number;
  domainCounts: Record<string, number>;
  status: AuditStatus;
  detail: string;
  generatedAt: string;
}

// ─── Production Health (Monitoring Dashboard) ────────────────────────────────

export interface ProductionHealth {
  status: 'healthy' | 'degraded' | 'critical';
  cpu: number | null;
  memoryPercent: number;
  eventLoopP99: number | null;
  queues: {
    agents: number;
    approvals: number;
    cloudSync: number;
    conflicts: number;
    liveOrders: number;
  };
  cacheHitRate: number;
  subsystems: { name: string; status: string }[];
  alerts: number;
  generatedAt: string;
}

// ─── Alert Engine ────────────────────────────────────────────────────────────

export type AlertKind =
  | 'crash'
  | 'memory'
  | 'queue'
  | 'trading'
  | 'commerce'
  | 'sync'
  | 'database'
  | 'event-loop';

export interface ProductionAlert {
  id: string;
  kind: AlertKind;
  severity: 'warning' | 'critical';
  message: string;
  value: number | string;
  threshold: number | string;
  routed: boolean; // notification altyapısına yönlendirildi mi
  at: string;
}

// ─── Release Candidate Score ─────────────────────────────────────────────────

export interface RcCriterion {
  name:
    | 'stability'
    | 'performance'
    | 'security'
    | 'recovery'
    | 'monitoring'
    | 'testCoverage'
    | 'productionReadiness';
  score: number; // 0-100
  weight: number;
  detail: string;
}

export interface RcScoreReport {
  overall: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  verdict: 'ship' | 'ship-with-caveats' | 'not-ready';
  criteria: RcCriterion[];
  knownIssues: string[];
  generatedAt: string;
}
