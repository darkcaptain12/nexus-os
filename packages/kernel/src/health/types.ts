export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthCheck {
  name: string;
  status: HealthStatus;
  latencyMs: number;
  message?: string;
  details?: Record<string, unknown>;
  lastCheckedAt: string;
}

export interface SystemHealth {
  status: HealthStatus;
  score: number;
  checks: HealthCheck[];
  uptime: number;
  timestamp: string;
}

export interface ResourceMetrics {
  cpu: { usage: number; cores: number };
  memory: { used: number; total: number; percentage: number };
  disk: { used: number; total: number; percentage: number };
  network: { latencyMs: number; connections: number };
}

export interface HealthAlert {
  id: string;
  check: string;
  severity: 'warning' | 'critical';
  message: string;
  triggeredAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface HeartbeatConfig {
  interval: number;
  timeout: number;
  missedThreshold: number;
}
