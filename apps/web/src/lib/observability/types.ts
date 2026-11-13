export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  latencyMs: number;
  message?: string;
  details?: Record<string, unknown>;
  lastCheck?: string;
  lastFailure?: string | null;
  errorCount?: number;
  uptimeSeconds?: number;
}

export type Severity = 'Healthy' | 'Warning' | 'Critical';

export type ErrorClassification =
  | 'validation'
  | 'auth'
  | 'authorization'
  | 'not_found'
  | 'database'
  | 'external'
  | 'workflow'
  | 'ai'
  | 'desktop'
  | 'integration'
  | 'internal';

/** Consolidated from the former lib/errors/index.ts (NexusError) — single error vocabulary now lives in error-boundary.ts. */
export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';
